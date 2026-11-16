import { operandPairId, type ColumnOperation, type ColumnSkill } from "./arithmetic";
import { columnInput, evaluateColumnAnswer, isColumnInput, newColumnDraft, type ColumnDraft, type ColumnEvaluation, type ColumnInput } from "./draft";
import { calendarDay } from "../learning/progress";
import {
  columnPolicy,
  newColumnProgress,
  recordColumnCheck,
  selectColumnExercise,
  type ColumnExposure,
  type ColumnSelection,
  type ColumnSkillProgress,
} from "./policy";

interface ColumnSummary {
  readonly checked: number;
  readonly firstCorrect: number;
  readonly independent: number;
  readonly solved: number;
  readonly skipped: number;
}

export interface ColumnSession {
  readonly schemaVersion: 1;
  readonly policyVersion: 1;
  readonly id: string;
  readonly operation: ColumnOperation;
  readonly seed: number;
  readonly timeZone: string;
  readonly startSequence: number;
  readonly startedAt: number;
  readonly order: readonly ColumnSelection[];
  readonly draft: ColumnDraft | null;
  readonly activeMs: number;
  readonly checks: number;
  readonly summary: ColumnSummary;
  readonly end: { readonly reason: "complete" | "early"; readonly at: number } | null;
}

/** Repository-only compare-and-set token. The generation changes on column data replacement. */
export interface ColumnRevision {
  readonly generation: string;
  readonly owner: string | null;
  readonly revision: number;
}

export interface ColumnAttempt extends ColumnEvaluation {
  readonly id: string;
  readonly sessionId: string;
  readonly operation: ColumnOperation;
  readonly skill: ColumnSkill;
  readonly ordinal: number;
  readonly checkNumber: number;
  readonly sequence: number;
  readonly at: number;
  readonly effectiveAt: number;
  readonly day: string;
  readonly timeZone: string;
  readonly activeMs: number;
  readonly input: ColumnInput;
  readonly hintShown: boolean;
  readonly independent: boolean;
}

export type ColumnAction =
  | { readonly type: "start"; readonly operation: ColumnOperation; readonly policyVersion: 1; readonly seed: number; readonly timeZone: string }
  | { readonly type: "check" | "hint" | "skip" | "finish"; readonly input: ColumnInput; readonly activeMs: number }
  | { readonly type: "retry" | "advance" };

export type ColumnJournalEntry = ColumnAction & {
  readonly sequence: number;
  readonly sessionId: string;
  readonly at: number;
};

export interface ColumnJournalCursor {
  readonly sequence: number;
  readonly effectiveAt: number;
}

export const emptyColumnCursor: ColumnJournalCursor = { sequence: 0, effectiveAt: 0 };

export function isColumnActiveTime(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value) && value >= 0 && value <= Number.MAX_SAFE_INTEGER;
}

interface ColumnEventContext {
  session: ColumnSession | undefined;
  cursor: ColumnJournalCursor;
  /** Rows for the session's operation. All changes are returned for transactional upsert. */
  progress: ReadonlyMap<ColumnSkill, ColumnSkillProgress>;
  seen: Pick<ReadonlySet<string>, "has">;
}

function validTimeZone(value: unknown): boolean {
  if (typeof value !== "string" || !value.length) return false;
  try {
    new Intl.DateTimeFormat("en", { timeZone: value });
    return true;
  } catch {
    return false;
  }
}

export function isColumnJournalEntry(value: unknown): value is ColumnJournalEntry {
  if (typeof value !== "object" || value === null) return false;
  const row = value as Record<string, unknown>;
  const { type, sequence, sessionId, at } = row;
  if (
    typeof sequence !== "number" || !Number.isSafeInteger(sequence) || sequence < 1 ||
    typeof sessionId !== "string" || !sessionId.length ||
    typeof at !== "number" || !Number.isSafeInteger(at) || at < 0 || at > 8_640_000_000_000_000
  ) return false;
  const exact = (...fields: string[]) =>
    Object.keys(row).length === 4 + fields.length && ["type", "sequence", "sessionId", "at", ...fields].every((key) => Object.hasOwn(row, key));
  switch (type) {
    case "start":
      return exact("operation", "policyVersion", "seed", "timeZone") && row.policyVersion === columnPolicy.version && validTimeZone(row.timeZone) &&
        (row.operation === "addition" || row.operation === "subtraction") &&
        typeof row.seed === "number" && Number.isInteger(row.seed) && row.seed >= 0 && row.seed <= 0xffff_ffff;
    case "check":
    case "hint":
    case "skip":
    case "finish":
      return exact("input", "activeMs") && isColumnActiveTime(row.activeMs) &&
        (isColumnInput(row.input, "addition") || isColumnInput(row.input, "subtraction"));
    case "retry":
    case "advance":
      return exact();
    default:
      return false;
  }
}

function sameInput(a: ColumnInput, b: ColumnInput) {
  return a.activePlace === b.activePlace &&
    a.digits.every((digit, place) => digit === b.digits[place]) &&
    a.marks.every((mark, place) => mark === b.marks[place]);
}

function captureDraft(session: ColumnSession, input: ColumnInput, activeMs: number): ColumnDraft {
  const draft = session.draft;
  if (
    !draft || !isColumnInput(input, session.operation) || !isColumnActiveTime(activeMs) || activeMs < session.activeMs ||
    (draft.phase !== "answering" && (activeMs !== session.activeMs || !sameInput(draft, input)))
  ) throw new Error("Invalid column draft or elapsed time");
  return { digits: [...input.digits], marks: [...input.marks], activePlace: input.activePlace, phase: draft.phase, hintShown: draft.hintShown };
}

/** Mutable checkpoint fields for the currently owned answering phase. */
export function checkpointColumnDraft(session: ColumnSession, input: ColumnInput, activeMs: number): ColumnSession {
  if (session.draft?.phase !== "answering") throw new Error("Column session cannot checkpoint this phase");
  return { ...session, draft: captureDraft(session, input, activeMs), activeMs };
}

/** The repository checks ownership and allocates the next sequence before applying an event. */
export function applyColumnEvent(context: ColumnEventContext, entry: ColumnJournalEntry) {
  if (!isColumnJournalEntry(entry) || entry.sequence !== context.cursor.sequence + 1)
    throw new Error("Invalid column journal entry or sequence");
  const at = Math.max(context.cursor.effectiveAt, entry.at);
  const cursor = { sequence: entry.sequence, effectiveAt: at };
  let session = context.session;
  let attempt: ColumnAttempt | null = null;
  const progress = new Map(context.progress);
  const updates = new Map<ColumnSkill, ColumnSkillProgress>();
  function update(row: ColumnSkillProgress) {
    progress.set(row.skill, row);
    updates.set(row.skill, row);
  }

  function issueNext(current: ColumnSession): ColumnSession {
    const selection = selectColumnExercise({
      operation: current.operation, sessionId: current.id, seed: current.seed,
      order: current.order, progress, seen: context.seen, at, timeZone: current.timeZone, wallTimeReliable: at === entry.at,
    });
    const { operation } = current;
    const { skill } = selection;
    const lastPractice = { sessionId: current.id, ordinal: current.order.length, at, day: calendarDay(at, current.timeZone) };
    const row = progress.get(skill) ?? newColumnProgress(operation, skill, lastPractice);
    update({ ...row, presented: row.presented + 1, lastPractice });
    return { ...current, order: [...current.order, selection], draft: newColumnDraft(), activeMs: 0, checks: 0 };
  }

  function advance(current: ColumnSession): ColumnSession {
    return current.order.length === columnPolicy.sessionLength ? end(current, "complete") : issueNext(current);
  }

  function end(current: ColumnSession, reason: "complete" | "early"): ColumnSession {
    return { ...current, draft: null, activeMs: 0, checks: 0, end: { reason, at: entry.at } };
  }

  if (entry.type === "start") {
    if (session) throw new Error("Duplicate column session");
    session = issueNext({
      schemaVersion: 1, policyVersion: entry.policyVersion, id: entry.sessionId, operation: entry.operation, seed: entry.seed,
      timeZone: entry.timeZone, startSequence: entry.sequence, startedAt: entry.at, order: [], draft: null, activeMs: 0, checks: 0, end: null,
      summary: { checked: 0, firstCorrect: 0, independent: 0, solved: 0, skipped: 0 },
    });
  } else {
    if (!session || session.id !== entry.sessionId || session.end || !session.draft)
      throw new Error("Missing open column session");
    const ordinal = session.order.length - 1;
    const selection = session.order[ordinal]!;
    const previous = progress.get(selection.skill);
    if (!previous || previous.lastPractice.sessionId !== session.id || previous.lastPractice.ordinal !== ordinal)
      throw new Error("Missing current column exposure");
    const lastPractice: ColumnExposure = { sessionId: session.id, ordinal, at, day: calendarDay(at, session.timeZone) };
    const practiced = { ...previous, lastPractice };
    const draft = "input" in entry ? captureDraft(session, entry.input, entry.activeMs) : session.draft;
    const activeMs = "activeMs" in entry ? entry.activeMs : session.activeMs;
    const summary = session.summary;
    switch (entry.type) {
      case "hint":
        if (draft.phase === "correct") throw new Error("Solved column exercise cannot receive a hint");
        session = { ...session, draft: { ...draft, hintShown: true }, activeMs };
        update({ ...practiced, helped: previous.helped + Number(!draft.hintShown) });
        break;
      case "check": {
        if (draft.phase !== "answering" || draft.digits.every((digit) => digit === null))
          throw new Error("Column check needs an editable answer with at least one digit");
        const evaluated = evaluateColumnAnswer(selection.exercise, draft.digits);
        const checkNumber = session.checks + 1;
        const first = checkNumber === 1;
        const independent = first && evaluated.correct && !draft.hintShown;
        attempt = {
          ...evaluated, id: `${session.id}:${ordinal}:${checkNumber}`, sessionId: session.id, operation: session.operation,
          skill: selection.skill, ordinal, checkNumber, sequence: entry.sequence, at: entry.at, effectiveAt: at, activeMs,
          day: lastPractice.day, timeZone: session.timeZone, input: columnInput(draft), hintShown: draft.hintShown, independent,
        };
        session = {
          ...session, activeMs, checks: checkNumber, draft: { ...draft, phase: evaluated.correct ? "correct" : "incorrect" },
          summary: {
            ...summary,
            checked: summary.checked + Number(first),
            firstCorrect: summary.firstCorrect + Number(first && evaluated.correct),
            independent: summary.independent + Number(independent),
            solved: summary.solved + Number(evaluated.correct),
          },
        };
        update(recordColumnCheck(practiced, selection, attempt));
        break;
      }
      case "retry": {
        if (draft.phase !== "incorrect") throw new Error("Column retry needs incorrect feedback");
        const { firstMismatch } = evaluateColumnAnswer(selection.exercise, draft.digits);
        if (firstMismatch === null) throw new Error("Missing incorrect answer place");
        session = { ...session, draft: { ...draft, phase: "answering", activePlace: firstMismatch } };
        update(practiced);
        break;
      }
      case "advance":
        if (draft.phase !== "correct") throw new Error("Column advance needs correct feedback");
        session = advance(session);
        break;
      case "skip":
        if (draft.phase === "correct") throw new Error("Solved column exercise cannot be skipped");
        update({ ...practiced, skipped: previous.skipped + 1 });
        session = advance({ ...session, summary: { ...summary, skipped: summary.skipped + 1 } });
        break;
      case "finish":
        if (draft.phase !== "correct") update(practiced);
        session = end(session, draft.phase === "correct" && session.order.length === columnPolicy.sessionLength ? "complete" : "early");
        break;
    }
  }
  const issued = session.order.length > (context.session?.order.length ?? 0) ? session.order.at(-1)! : null;
  return { session, cursor, attempt, issued, changedProgress: [...updates.values()] };
}

export function addIssuedOperand(seen: Set<string>, selection: ColumnSelection) {
  seen.add(operandPairId(selection.exercise));
}
