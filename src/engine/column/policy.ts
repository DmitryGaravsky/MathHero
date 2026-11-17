import { columnSkills, type ColumnExercise, type ColumnOperation, type ColumnSkill, type Place } from "./arithmetic";
import { columnRandom, columnRandomIndex, generateColumnExercise, type ColumnFeature } from "./generator";
import { calendarDay } from "../learning/progress";

const dayMs = 86_400_000;
export const columnPolicy = {
  version: 1,
  sessionLength: 6,
  initialReviewGapMs: dayMs,
  retainedReviewGapMs: 3 * dayMs,
  supportingSolutions: 2,
  difficultyWindow: 4,
  difficultyErrors: 2,
} as const;

export interface ColumnExposure {
  readonly at: number;
  readonly day: string;
  readonly sessionId: string;
  readonly ordinal: number;
}

interface SupportingSolution extends ColumnExposure {
  readonly attemptId: string;
}

export interface ColumnReview {
  readonly previousPractice: ColumnExposure;
  readonly issuedAt: number;
  readonly issuedDay: string;
}

export interface ColumnSelection {
  readonly exercise: ColumnExercise;
  readonly skill: ColumnSkill;
  readonly fresh: boolean;
  readonly reason: "practice" | "difficulty" | "review";
  readonly review: ColumnReview | null;
}

export interface ColumnSkillProgress {
  readonly operation: ColumnOperation;
  readonly skill: ColumnSkill;
  readonly presented: number;
  readonly firstChecks: number;
  readonly firstCorrect: number;
  readonly independent: number;
  readonly solved: number;
  readonly helped: number;
  readonly skipped: number;
  readonly lastPractice: ColumnExposure;
  readonly recent: readonly { attemptId: string; firstMismatch: Place | null; hintShown: boolean }[];
  readonly supporting: readonly SupportingSolution[];
  readonly retained: (SupportingSolution & ColumnReview & { supportingAttemptIds: readonly string[] }) | null;
}

export function newColumnProgress(operation: ColumnOperation, skill: ColumnSkill, exposure: ColumnExposure): ColumnSkillProgress {
  return {
    operation, skill, presented: 0, firstChecks: 0, firstCorrect: 0, independent: 0, solved: 0, helped: 0, skipped: 0,
    lastPractice: exposure, recent: [], supporting: [], retained: null,
  };
}

export function hasRecurringColumnDifficulty(progress: ColumnSkillProgress) {
  return progress.recent.filter((observation) => observation.firstMismatch !== null).length >= columnPolicy.difficultyErrors;
}

export function columnReviewDueAt(progress: ColumnSkillProgress) {
  return progress.lastPractice.at + (progress.retained ? columnPolicy.retainedReviewGapMs : columnPolicy.initialReviewGapMs);
}

interface SelectionContext {
  operation: ColumnOperation;
  sessionId: string;
  seed: number;
  order: readonly ColumnSelection[];
  progress: ReadonlyMap<ColumnSkill, ColumnSkillProgress>;
  seen: Pick<ReadonlySet<string>, "has">;
  at: number;
  timeZone: string;
  wallTimeReliable: boolean;
}

const initialFeature: Partial<Record<ColumnSkill, ColumnFeature>> = {
  "multiple-carries": "answer-zero-digit",
  "carry-to-thousands": "chained-carries",
  "borrow-through-zero": "short-result",
};

export function selectColumnExercise(context: SelectionContext): ColumnSelection {
  const { operation, sessionId, seed, order, progress, seen, at, timeZone, wallTimeReliable } = context;
  const day = calendarDay(at, timeZone);
  const random = columnRandom(seed, order.length);
  const missing = columnSkills[operation].filter((skill) => !order.some((item) => item.skill === skill));
  const remaining = columnPolicy.sessionLength - order.length;
  const candidates = remaining <= missing.length ? missing : columnSkills[operation];
  const ranked = candidates
    .filter((skill) =>
      skill !== order.at(-1)?.skill &&
      order.filter((item) => item.skill === skill).length < (skill === "zero-result" ? 1 : 2),
    )
    .map((skill) => {
      const row = progress.get(skill);
      const due = row && wallTimeReliable && row.lastPractice.sessionId !== sessionId &&
        at >= columnReviewDueAt(row) && day !== row.lastPractice.day && day !== calendarDay(row.lastPractice.at, timeZone);
      const rank = due ? 0 : row && hasRecurringColumnDifficulty(row) ? 1 : row ? 3 : 2;
      return { skill, row, due, rank, lastPracticeAt: row?.lastPractice.at ?? 0 };
    })
    .sort((a, b) => a.rank - b.rank || a.lastPracticeAt - b.lastPracticeAt);
  const first = ranked[0];
  if (!first || remaining <= 0) throw new Error("No column selection slot");
  const tied = ranked.filter((item) => item.rank === first.rank && item.lastPracticeAt === first.lastPracticeAt);
  const { skill, row, due, rank } = tied[columnRandomIndex(tied.length, random)]!;
  const { exercise, fresh } = generateColumnExercise(operation, skill, random, seen, row ? undefined : initialFeature[skill]);
  const review = fresh && row && due ? { previousPractice: row.lastPractice, issuedAt: at, issuedDay: day } : null;
  return { exercise, skill, fresh, reason: review ? "review" : rank === 1 ? "difficulty" : "practice", review };
}

interface EvidenceCheck {
  id: string;
  sessionId: string;
  ordinal: number;
  checkNumber: number;
  at: number;
  effectiveAt: number;
  day: string;
  timeZone: string;
  correct: boolean;
  firstMismatch: Place | null;
  hintShown: boolean;
  independent: boolean;
}

export function recordColumnCheck(progress: ColumnSkillProgress, selection: ColumnSelection, check: EvidenceCheck): ColumnSkillProgress {
  const first = check.checkNumber === 1;
  const next = {
    ...progress,
    firstChecks: progress.firstChecks + Number(first),
    firstCorrect: progress.firstCorrect + Number(first && check.correct),
    independent: progress.independent + Number(check.independent),
    solved: progress.solved + Number(check.correct),
  };
  if (!first) return next;
  if (selection.fresh) {
    next.recent = [...progress.recent, { attemptId: check.id, firstMismatch: check.firstMismatch, hintShown: check.hintShown }]
      .slice(-columnPolicy.difficultyWindow);
  }
  if (!check.correct) return { ...next, supporting: [], retained: null };
  if (!check.independent || !selection.fresh || check.at !== check.effectiveAt) return next;

  if (next.supporting.some((item) => item.sessionId === check.sessionId || item.day === check.day || calendarDay(item.at, check.timeZone) === check.day))
    return next;
  const proof = { attemptId: check.id, sessionId: check.sessionId, ordinal: check.ordinal, at: check.at, day: check.day };
  if (selection.review && next.supporting.length === columnPolicy.supportingSolutions) {
    next.retained = { ...proof, ...selection.review, supportingAttemptIds: next.supporting.map((item) => item.attemptId) };
  }
  return { ...next, supporting: [...next.supporting, proof].slice(-columnPolicy.supportingSolutions) };
}
