import type { ColumnOperation, ColumnSkill } from "./arithmetic";
import { isColumnInput } from "./draft";
import type { ColumnSkillProgress } from "./policy";
import {
  addIssuedOperand,
  applyColumnEvent,
  checkpointColumnDraft,
  emptyColumnCursor,
  isColumnActiveTime,
  isColumnJournalEntry,
  type ColumnAttempt,
  type ColumnSession,
} from "./session";

/** Commit sequence is authoritative across operations, sessions and wall-clock changes. */
export function replayColumnJournal(entries: readonly unknown[]) {
  const journal = entries.map((entry) => {
    if (!isColumnJournalEntry(entry)) throw new Error("Invalid column journal entry");
    return entry;
  }).sort((a, b) => a.sequence - b.sequence);
  const sessions = new Map<string, ColumnSession>();
  const open = new Map<ColumnOperation, string>();
  const progress = {
    addition: new Map<ColumnSkill, ColumnSkillProgress>(),
    subtraction: new Map<ColumnSkill, ColumnSkillProgress>(),
  };
  const attempts: ColumnAttempt[] = [];
  const seen = new Set<string>();
  let cursor = emptyColumnCursor;
  for (const entry of journal) {
    const previous = sessions.get(entry.sessionId);
    const operation = entry.type === "start" ? entry.operation : previous?.operation;
    if (!operation || (entry.type === "start" && open.has(operation)))
      throw new Error("Column journal requires one open session per operation");
    const result = applyColumnEvent({ session: previous, cursor, progress: progress[operation], seen }, entry);
    const { session, attempt, issued, changedProgress } = result;
    cursor = result.cursor;
    sessions.set(session.id, session);
    if (session.end) open.delete(operation);
    else open.set(operation, session.id);
    if (attempt) attempts.push(attempt);
    if (issued) addIssuedOperand(seen, issued);
    for (const row of changedProgress) progress[operation].set(row.skill, row);
  }
  return { sessions, open, progress, attempts, seen, cursor };
}

function record(value: unknown): Record<string, unknown> | undefined {
  if (typeof value !== "object" || value === null || Array.isArray(value)) return undefined;
  return value as Record<string, unknown>;
}

export function sameColumnValue(actual: unknown, expected: unknown): boolean {
  if (actual === expected) return true;
  if (Array.isArray(expected)) {
    return Array.isArray(actual) && actual.length === expected.length && Object.keys(actual).length === expected.length &&
      expected.every((value, i) => Object.hasOwn(actual, i) && sameColumnValue(actual[i], value));
  }
  const a = record(actual);
  const b = record(expected);
  return !!a && !!b && Object.keys(a).length === Object.keys(b).length &&
    Object.keys(b).every((key) => Object.hasOwn(a, key) && sameColumnValue(a[key], b[key]));
}

/** Validate all derived fields exactly, allowing one unjournaled editing tail. */
export function validateColumnSessionSnapshot(replayed: ColumnSession, value: unknown): ColumnSession {
  let expected = replayed;
  const saved = record(value);
  const draft = record(saved?.draft);
  if (replayed.draft?.phase === "answering" && draft && isColumnActiveTime(saved?.activeMs)) {
    const { digits, marks, activePlace } = draft;
    const input = { digits, marks, activePlace };
    if (isColumnInput(input, replayed.operation)) {
      expected = checkpointColumnDraft(replayed, input, saved.activeMs);
    }
  }
  if (!sameColumnValue(value, expected)) throw new Error("Column snapshot does not match journal replay");
  return expected;
}
