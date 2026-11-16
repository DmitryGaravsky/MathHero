import { columnSkills, columnWork, type ColumnOperation, type ColumnSkill, type Place } from "../engine/column/arithmetic";
import type { ColumnInput } from "../engine/column/draft";
import {
  hasRecurringColumnDifficulty, newColumnProgress, recordColumnCheck, type ColumnSkillProgress,
} from "../engine/column/policy";
import type { ColumnAttempt, ColumnJournalEntry, ColumnSession } from "../engine/column/session";
import { median } from "../engine/learning/progress";
import { db, type MathHeroDB } from "./db";

type RetainedProof = NonNullable<ColumnSkillProgress["retained"]>;
export interface ColumnProof {
  reviewedDay: string;
  lastPracticeDay: string;
  supportDays: string[];
  gapMs: number;
}

function proofView(proof: RetainedProof, supports: ReadonlyMap<string, ColumnAttempt>): ColumnProof {
  return {
    reviewedDay: proof.day,
    lastPracticeDay: proof.previousPractice.day,
    supportDays: proof.supportingAttemptIds.map((id) => supports.get(id)!.day),
    gapMs: proof.issuedAt - proof.previousPractice.at,
  };
}

type Counts = Pick<ColumnSkillProgress, "presented" | "firstChecks" | "firstCorrect" | "independent" | "solved" | "helped" | "skipped">;

export function columnResults(rows: readonly Counts[]) {
  const total = { presented: 0, firstChecks: 0, firstCorrect: 0, independent: 0, solved: 0, helped: 0, skipped: 0 };
  for (const row of rows) {
    for (const field of Object.keys(total) as (keyof Counts)[]) total[field] += row[field];
  }
  return {
    ...total,
    firstAccuracy: total.firstChecks ? total.firstCorrect / total.firstChecks : null,
    corrected: total.solved - total.firstCorrect,
    unchecked: total.presented - total.firstChecks,
    unfinished: total.presented - total.solved - total.skipped,
  };
}

export function readColumnOverview(operation: ColumnOperation, database: MathHeroDB = db) {
  return database.transaction("r", [database.columnProgress, database.columnAttempts], async () => {
    const rows = await database.columnProgress.bulkGet(columnSkills[operation].map((skill) => [operation, skill]));
    const ids = rows.flatMap((row) => row?.retained?.supportingAttemptIds ?? []);
    const attempts = await database.columnAttempts.bulkGet(ids);
    const supports = new Map(attempts.flatMap((attempt) => attempt ? [[attempt.id, attempt]] : []));
    return {
      results: columnResults(rows.flatMap((row) => row ? [row] : [])),
      skills: columnSkills[operation].map((skill, i) => {
        const row = rows[i];
        return {
          skill,
          checked: row?.firstChecks ?? 0,
          recent: row?.recent.length ?? 0,
          misses: row?.recent.filter((check) => check.firstMismatch !== null).length ?? 0,
          recurring: row ? hasRecurringColumnDifficulty(row) : false,
          supportDays: row?.supporting.map(({ day }) => day) ?? [],
          proof: row?.retained ? proofView(row.retained, supports) : null,
        };
      }),
    };
  });
}

export const columnHistoryStatuses = ["open", "early", "complete"] as const;
type HistoryStatus = (typeof columnHistoryStatuses)[number];
export const columnSessionStatus = (session: ColumnSession): HistoryStatus => session.end?.reason ?? "open";
const historyPageSize = 8;

export async function readColumnHistory(operation: ColumnOperation, status: "all" | HistoryStatus, before: number, database: MathHeroDB = db) {
  const page = await database.columnSessions.where("[session.operation+session.startSequence]")
    .between([operation, 0], [operation, before], false, false).reverse()
    .filter(({ session }) => status === "all" || columnSessionStatus(session) === status)
    .limit(historyPageSize + 1).toArray();
  return {
    sessions: page.slice(0, historyPageSize).map(({ session }) => session),
    older: page.length > historyPageSize ? page[historyPageSize - 1]!.session.startSequence : null,
  };
}

export function columnSessionExamples(session: ColumnSession, checks: readonly ColumnAttempt[], journal: readonly ColumnJournalEntry[]) {
  const examples = session.order.map((selection) => ({
    selection,
    checks: [] as ColumnAttempt[],
    hintAt: null as number | null,
    skipped: false,
    activeMs: 0,
    lastInput: null as ColumnInput | null,
  }));
  for (const check of [...checks].sort((a, b) => a.sequence - b.sequence)) examples[check.ordinal]!.checks.push(check);
  let ordinal = 0;
  for (const event of [...journal].sort((a, b) => a.sequence - b.sequence)) {
    const example = examples[ordinal]!;
    if ("input" in event) {
      example.activeMs = event.activeMs;
      example.lastInput = event.input;
    }
    if (event.type === "hint") example.hintAt ??= event.at;
    if (event.type === "skip") example.skipped = true;
    if (event.type === "advance" || event.type === "skip") ordinal++;
  }
  const last = examples.at(-1);
  if (session.draft && last) {
    last.activeMs = session.activeMs;
    last.lastInput = session.draft;
  }
  return examples;
}

async function sessionsFor(checks: readonly ColumnAttempt[], database: MathHeroDB) {
  const rows = await database.columnSessions.bulkGet([...new Set(checks.map((check) => check.sessionId))]);
  return new Map(rows.flatMap((row) => row ? [[row.session.id, row.session]] : []));
}

// Rebuild just the support transitions for reviews in the opened session. The
// issued selections and first checks already contain the replay-validated inputs.
async function readHistoricalProofs(session: ColumnSession, checks: readonly ColumnAttempt[], database: MathHeroDB) {
  const reviews = checks.filter((check) => check.independent && session.order[check.ordinal]?.review);
  if (!reviews.length) return new Map<string, ColumnProof>();
  const reviewIds = new Set(reviews.map(({ id }) => id));
  const skills = new Set(reviews.map(({ skill }) => skill));
  const lastSequence = Math.max(...reviews.map(({ sequence }) => sequence));
  const predecessors = await database.columnAttempts.where("[operation+sequence]")
    .between([session.operation, 0], [session.operation, lastSequence], false, true)
    .filter((check) => check.checkNumber === 1 && skills.has(check.skill)).toArray();
  const sessions = await sessionsFor(predecessors, database);
  const byId = new Map(predecessors.map((check) => [check.id, check]));
  const progress = new Map<ColumnSkill, ColumnSkillProgress>();
  const proofs = new Map<string, ColumnProof>();
  for (const check of predecessors) {
    const selection = sessions.get(check.sessionId)!.order[check.ordinal]!;
    const previous = progress.get(selection.skill) ?? newColumnProgress(check.operation, selection.skill, check);
    const next = recordColumnCheck(previous, selection, check);
    progress.set(selection.skill, next);
    if (next.retained?.attemptId === check.id && reviewIds.has(check.id)) {
      proofs.set(check.id, proofView(next.retained, byId));
    }
  }
  return proofs;
}

export function readColumnSession(id: string, database: MathHeroDB = db) {
  return database.transaction("r", [database.columnSessions, database.columnAttempts, database.columnJournal], async () => {
    const row = await database.columnSessions.get(id);
    if (!row) return null;
    const { session } = row;
    const [checks, journal] = await Promise.all([
      database.columnAttempts.where("sessionId").equals(id).toArray(),
      database.columnJournal.where("sessionId").equals(id).toArray(),
    ]);
    const examples = columnSessionExamples(session, checks, journal);
    return {
      examples,
      proofs: await readHistoricalProofs(session, checks, database),
      activeMs: examples.reduce((sum, example) => sum + example.activeMs, 0),
    };
  });
}

export const columnTimingLimit = 100;

export function columnTimingGroups(checks: readonly ColumnAttempt[], sessions: ReadonlyMap<string, ColumnSession>) {
  const groups = new Map<string, {
    operation: ColumnOperation; places: Place[]; throughZero: boolean; zeroResult: boolean; resultDigits: number; times: number[];
  }>();
  for (const check of checks) {
    if (check.checkNumber !== 1 || !check.correct || check.hintShown) continue;
    const exercise = sessions.get(check.sessionId)!.order[check.ordinal]!.exercise;
    const work = columnWork(exercise);
    const places = work.operation === "addition"
      ? work.steps.filter((step) => step.carryOut).map((step) => (step.place + 1) as Place)
      : work.steps.filter((step) => step.borrowFromHigher).map((step) => (step.place + 1) as Place);
    const throughZero = work.operation === "subtraction" &&
      work.steps.some((step) => step.topDigit === 0 && step.lentToLower && step.borrowFromHigher);
    const zeroResult = work.answer === 0;
    const resultDigits = String(work.answer).length;
    const key = `${work.operation}:${places.join("")}:${Number(throughZero)}:${Number(zeroResult)}:${resultDigits}`;
    if (!groups.has(key)) groups.set(key, { operation: work.operation, places, throughZero, zeroResult, resultDigits, times: [] });
    groups.get(key)!.times.push(check.activeMs);
  }
  return [...groups.entries()].sort(([a], [b]) => a.localeCompare(b)).map(([key, { times, ...pattern }]) => ({
    ...pattern, key, count: times.length, medianMs: median(times),
  }));
}

export function readColumnTiming(operation: ColumnOperation, database: MathHeroDB = db) {
  return database.transaction("r", [database.columnAttempts, database.columnSessions], async () => {
    const checks = await database.columnAttempts.where("[operation+sequence]")
      .between([operation, 0], [operation, Infinity]).reverse().limit(columnTimingLimit).toArray();
    const independent = checks.filter((check) => check.independent);
    return columnTimingGroups(independent, await sessionsFor(independent, database));
  });
}
