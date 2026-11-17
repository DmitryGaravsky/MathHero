import { readPreferences, validatePreferences, type StoredPreferences } from "../settings/preferences";
import { getFact } from "../engine/multiplication/facts";
import { learningPolicy, legacyLearningPolicy, type PairProgress } from "../engine/learning/progress";
import {
  replayLearning,
  type JournalEntry,
  type Reward,
  type RewardState,
} from "../engine/learning/rewards";
import type { Session } from "../engine/learning/session";
import type { Attempt } from "../engine/sessions/diagnostic";
import { operandPairId } from "../engine/column/arithmetic";
import type { ColumnSkillProgress } from "../engine/column/policy";
import {
  replayColumnJournal, sameColumnValue, validateColumnSessionSnapshot,
} from "../engine/column/replay";
import type { ColumnAttempt, ColumnJournalEntry, ColumnSession } from "../engine/column/session";
import { columnSessionRow, columnTables } from "./columnRepository";
import { ColumnSeen } from "./columnSeen";
import { db, type MathHeroDB } from "./db";
import { sessionTransaction } from "./sessionTransaction";

interface BackupMetadata {
  format: "math-hero-backup";
  exportedAt: number;
}
interface MultiplicationTables {
  sessions: Session[];
  attempts: Attempt[];
  progress: PairProgress[];
  settings: { id: string; value: StoredPreferences }[];
  journal: JournalEntry[];
  rewards: Reward[];
  rewardState: RewardState[];
}
interface ColumnTables {
  columnSessions: ColumnSession[];
  columnAttempts: ColumnAttempt[];
  columnProgress: ColumnSkillProgress[];
  columnJournal: ColumnJournalEntry[];
}
export type FullBackup = BackupMetadata & {
  version: 3; databaseVersion: 5; tables: MultiplicationTables & ColumnTables;
};
export type LegacyBackup = BackupMetadata & { tables: MultiplicationTables } & (
  | { version: 1; databaseVersion: 3 }
  | { version: 2; databaseVersion: 4 }
);
export type Backup = LegacyBackup | FullBackup;
function requireValid(value: unknown): asserts value {
  if (!value) throw new Error("Invalid Math Hero backup");
}
function object(value: unknown): Record<string, unknown> {
  requireValid(
    value !== null && typeof value === "object" && !Array.isArray(value),
  );
  return value as Record<string, unknown>;
}
function keys(value: unknown, names: string[]) {
  const row = object(value);
  requireValid(Object.keys(row).length === names.length && names.every((key) => Object.hasOwn(row, key)));
}
function integer(
  value: unknown,
  max = Number.MAX_SAFE_INTEGER,
): value is number {
  return (
    typeof value === "number" &&
    Number.isSafeInteger(value) &&
    value >= 0 &&
    value <= max
  );
}
function finite(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value) && value >= 0;
}
function timestamp(value: unknown) {
  return finite(value) && value <= 8_640_000_000_000_000;
}
function safeTree(value: unknown): void {
  if (typeof value === "number") requireValid(Number.isFinite(value));
  if (Array.isArray(value)) value.forEach(safeTree);
  else if (value && typeof value === "object")
    for (const [key, child] of Object.entries(value)) {
      requireValid(!["__proto__", "constructor", "prototype"].includes(key));
      safeTree(child);
    }
}
function stable(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(stable).join(",")}]`;
  if (value && typeof value === "object")
    return `{${Object.entries(value)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([k, v]) => `${JSON.stringify(k)}:${stable(v)}`)
      .join(",")}}`;
  return JSON.stringify(value);
}
function equal(a: unknown, b: unknown) {
  requireValid(stable(a) === stable(b));
}
function unique(rows: unknown[], key: string) {
  const ids = rows.map((row) => object(row)[key]);
  requireValid(
    ids.every(
      (id) => typeof id === "string" && id.length > 0 && id.length <= 200,
    ),
  );
  requireValid(new Set(ids).size === ids.length);
}

const multiplicationNames = ["sessions", "attempts", "progress", "settings", "journal", "rewards", "rewardState"] as const;
const columnNames = ["columnSessions", "columnAttempts", "columnProgress", "columnJournal"] as const;

function decodeBackup(input: unknown) {
  safeTree(input);
  keys(input, ["format", "version", "databaseVersion", "exportedAt", "tables"]);
  const root = object(input);
  requireValid(
    root.format === "math-hero-backup" &&
      ((root.version === 1 && root.databaseVersion === 3) ||
        (root.version === 2 && root.databaseVersion === 4) ||
        (root.version === 3 && root.databaseVersion === 5)) &&
      timestamp(root.exportedAt),
  );
  keys(root.tables, [...multiplicationNames, ...(root.version === 3 ? columnNames : [])]);
  const tables = object(root.tables);
  for (const name of multiplicationNames) {
    const rows = tables[name];
    requireValid(Array.isArray(rows));
    unique(rows, name === "progress" ? "canonicalId" : "id");
  }
  // The cast follows the structural boundary; every persisted field is checked below or by exact replay.
  const backup = structuredClone(input) as Backup;
  const {
    sessions,
    attempts,
    progress,
    settings,
    journal,
    rewards,
    rewardState,
  } = backup.tables;
  requireValid(settings.length <= 1);
  for (const row of settings) {
    keys(row, ["id", "value"]);
    requireValid(row.id === "preferences");
    validatePreferences(row.value, backup.version === 1);
  }
  const sessionById = new Map(sessions.map((s) => [s.id, s]));
  const attemptById = new Map(attempts.map((a) => [a.id, a]));
  const pending = new Set<string>();
  const sequences = new Set<string>();
  for (const s of sessions) {
    const basic = [
      "schemaVersion",
      "id",
      "mode",
      "order",
      "cursor",
      "phase",
      "draft",
      "activeMs",
      "owner",
      "startedAt",
      "completedAt",
      "lastAttempt",
    ];
    requireValid(["diagnostic", "adaptive", "weak"].includes(s.mode));
    keys(
      s,
      s.mode === "diagnostic"
        ? basic
        : [
            ...basic,
            "total",
            "sequence",
            "policy",
            "repeats",
            "endReason",
            "summary",
            ...(s.targetPair === undefined ? [] : ["targetPair"]),
          ],
    );
    requireValid(
      Array.isArray(s.order) &&
        s.order.every((id) => typeof id === "string" && getFact(id)),
    );
    requireValid(integer(s.cursor, s.mode === "diagnostic" ? 144 : 24));
    requireValid(
      typeof s.draft === "string" &&
        /^\d{0,3}$/.test(s.draft) &&
        finite(s.activeMs),
    );
    requireValid(s.owner === null || (backup.version !== 3 && typeof s.owner === "string"));
    requireValid(
      timestamp(s.startedAt) &&
        (s.completedAt === null ||
          (timestamp(s.completedAt) && s.completedAt >= s.startedAt)),
    );
    requireValid(
      [
        "question",
        "feedback",
        "completed",
        ...(s.mode === "diagnostic" ? ["break"] : []),
      ].includes(s.phase),
    );
    requireValid(
      s.phase === "question" || (s.draft === "" && s.activeMs === 0),
    );
    if (s.phase === "feedback") requireValid(s.cursor > 0);
    if (s.mode === "diagnostic") {
      requireValid(
        s.id === "diagnostic:baseline:v1" &&
          s.schemaVersion === 1 &&
          s.order.length === 144 &&
          new Set(s.order).size === 144,
      );
      requireValid((s.completedAt !== null) === (s.cursor === 144));
      if (s.phase === "break")
        requireValid(s.cursor > 0 && s.cursor < 144 && s.cursor % 24 === 0);
      if (s.phase === "completed") requireValid(s.cursor === 144);
      if (s.phase === "question") requireValid(s.cursor < 144);
    } else {
      requireValid(
        s.id.startsWith("learning:") &&
          s.schemaVersion === 2 &&
          s.total === 24 &&
          integer(s.sequence) &&
          s.sequence > 0,
      );
      keys(s.policy, Object.keys(learningPolicy));
      requireValid(typeof s.policy.timeZone === "string");
      new Intl.DateTimeFormat("en", { timeZone: s.policy.timeZone }).format(0);
      const policy = s.policy.version === legacyLearningPolicy.version
        ? legacyLearningPolicy
        : learningPolicy;
      requireValid(s.policy.version === policy.version &&
        (backup.version !== 1 || policy === legacyLearningPolicy));
      equal(s.policy, { ...policy, timeZone: s.policy.timeZone });
      if (s.targetPair !== undefined)
        requireValid(
          s.mode === "weak" &&
            getFact(s.targetPair).canonicalId === s.targetPair,
        );
      const stream = `${s.mode}:${s.targetPair ?? ""}`;
      requireValid(!sequences.has(`${stream}:${s.sequence}`));
      sequences.add(`${stream}:${s.sequence}`);
      if (s.completedAt === null) {
        requireValid(!pending.has(stream));
        pending.add(stream);
      }
      requireValid((s.completedAt === null) === (s.endReason === null));
      requireValid([null, "complete", "early"].includes(s.endReason));
      if (s.endReason === "complete") requireValid(s.cursor === 24);
      if (s.endReason === "early") requireValid(s.phase === "completed");
      if (s.phase === "completed") requireValid(s.completedAt !== null);
      if (s.phase === "question")
        requireValid(
          s.completedAt === null &&
            s.cursor < 24 &&
            s.order.length === s.cursor + 1,
        );
      if (s.phase === "feedback")
        requireValid(
          s.order.length === s.cursor &&
            (s.completedAt !== null) === (s.cursor === 24),
        );
      if (s.phase === "completed")
        requireValid(
          s.order.length === s.cursor || s.order.length === s.cursor + 1,
        );
    }
    const own = attempts
      .filter((a) => a.sessionId === s.id)
      .sort((a, b) => a.ordinal - b.ordinal);
    requireValid(own.length === s.cursor);
    own.forEach((a, i) =>
      requireValid(a.ordinal === i && a.exerciseId === s.order[i]),
    );
    equal(s.lastAttempt, own.at(-1) ?? null);
  }
  for (const a of attempts) {
    keys(a, [
      "id",
      "sessionId",
      "mode",
      "operation",
      "ordinal",
      "exerciseId",
      "canonicalId",
      "answer",
      "expectedAnswer",
      "correct",
      "responseTimeMs",
      "createdAt",
    ]);
    const s = sessionById.get(a.sessionId);
    requireValid(s);
    requireValid(
      integer(a.ordinal, 143) &&
        a.id === `${s.id}:${a.ordinal}` &&
        a.mode === s.mode &&
        a.operation === "multiplication",
    );
    const fact = getFact(a.exerciseId);
    requireValid(
      a.canonicalId === fact.canonicalId &&
        a.expectedAnswer === fact.expectedAnswer &&
        integer(a.answer, 999) &&
        a.correct === (a.answer === a.expectedAnswer),
    );
    requireValid(
      integer(a.responseTimeMs) &&
        timestamp(a.createdAt) &&
        a.createdAt >= s.startedAt &&
        (s.completedAt === null || a.createdAt <= s.completedAt),
    );
  }
  requireValid(journal.length === attempts.length);
  const nextOrdinal = new Map<string, number>();
  [...journal]
    .sort((a, b) => a.sequence - b.sequence)
    .forEach((entry, i) => {
      keys(entry, ["id", "sequence"]);
      requireValid(entry.sequence === i + 1);
      const a = attemptById.get(entry.id);
      requireValid(a);
      requireValid(a.ordinal === (nextOrdinal.get(a.sessionId) ?? 0));
      nextOrdinal.set(a.sessionId, a.ordinal + 1);
    });
  const replay = replayLearning(sessions, attempts, journal);
  const sorted = <T>(rows: T[], key: (row: T) => string) =>
    [...rows].sort((a, b) => key(a).localeCompare(key(b)));
  equal(
    sorted(progress, (p) => p.canonicalId),
    sorted(replay.progress, (p) => p.canonicalId),
  );
  equal(
    sorted(rewards, (r) => r.id),
    sorted(replay.rewards, (r) => r.id),
  );
  equal(
    rewardState,
    attempts.some((a) => a.mode !== "diagnostic") || rewardState.length
      ? [replay.state]
      : [],
  );
  for (const s of sessions)
    if (s.mode !== "diagnostic") {
      const r = replay.summaries.get(s.id);
      equal(
        s.summary,
        r?.summary ?? {
          answered: 0,
          correct: 0,
          correctTimes: [],
          improvedPairs: [],
          masteredPairs: [],
        },
      );
      equal(s.repeats, r?.repeats ?? []);
    }
  const columnReplay = backup.version === 3 ? validateColumnTables(backup.tables) : null;
  return { backup, columnReplay };
}

function exactColumnRows<T>(actual: readonly unknown[], expected: ReadonlyMap<string, T>,
  id: (row: Record<string, unknown>) => unknown, matches: (row: unknown, expected: T) => boolean = sameColumnValue,
) {
  const remaining = new Map(expected);
  requireValid(actual.length === remaining.size);
  for (const row of actual) {
    const key = id(object(row));
    requireValid(typeof key === "string");
    const value = remaining.get(key);
    requireValid(value && matches(row, value));
    remaining.delete(key);
  }
}

function validateColumnTables(tables: ColumnTables) {
  for (const name of columnNames) {
    const rows = tables[name];
    requireValid(Array.isArray(rows) && Object.keys(rows).length === rows.length);
    for (let i = 0; i < rows.length; i++) requireValid(Object.hasOwn(rows, i));
  }
  const replay = replayColumnJournal(tables.columnJournal);
  exactColumnRows(tables.columnSessions, replay.sessions, (row) => row.id,
    (row, expected) => !!validateColumnSessionSnapshot(expected, row));
  exactColumnRows(tables.columnAttempts, new Map(replay.attempts.map((row) => [row.id, row])), (row) => row.id);
  const progress = [...replay.progress.addition.values(), ...replay.progress.subtraction.values()];
  exactColumnRows(tables.columnProgress, new Map(progress.map((row) => [`${row.operation}:${row.skill}`, row])),
    ({ operation, skill }) => `${operation}:${skill}`);
  return replay;
}

/** No writes. Unknown schemas and unverifiable aggregates are rejected. */
export function validateBackup(input: unknown): Backup {
  return decodeBackup(input).backup;
}
export function parseBackup(text: string) {
  requireValid(text.length <= 20_000_000);
  return validateBackup(JSON.parse(text) as unknown);
}

function multiplicationTables(database: MathHeroDB) {
  return [database.sessions, database.attempts, database.progress, database.settings,
    database.journal, database.rewards, database.rewardState];
}

export async function exportBackup(
  database: MathHeroDB = db,
  now = Date.now(),
): Promise<FullBackup> {
  const backup = await database.transaction("r", [...multiplicationTables(database), ...columnTables(database)], async (): Promise<FullBackup> => ({
      format: "math-hero-backup",
      version: 3,
      databaseVersion: 5,
      exportedAt: now,
      tables: {
        sessions: (await database.sessions.toArray()).map((session) => ({ ...session, owner: null })),
        attempts: await database.attempts.toArray(),
        progress: await database.progress.toArray(),
        settings: (await database.settings.toArray()).map((row) => ({
          ...row,
          value: readPreferences(row.value),
        })),
        journal: await database.journal.toArray(),
        rewards: await database.rewards.toArray(),
        rewardState: await database.rewardState.toArray(),
        columnSessions: (await database.columnSessions.toArray()).map((row) => row.session),
        columnAttempts: await database.columnAttempts.toArray(),
        columnProgress: await database.columnProgress.toArray(),
        columnJournal: await database.columnJournal.toArray(),
      },
  }));
  validateBackup(backup);
  return backup;
}
export async function restoreBackup(
  input: unknown,
  confirmed: boolean,
  database: MathHeroDB = db,
  signal?: AbortSignal,
) {
  if (!confirmed) return false;
  signal?.throwIfAborted();
  const { backup, columnReplay } = decodeBackup(input);
  const column = backup.version === 3 && columnReplay ? {
    tables: backup.tables,
    cursor: columnReplay.cursor,
    generation: crypto.randomUUID(),
    seen: [
      new ColumnSeen("addition"),
      new ColumnSeen("subtraction"),
    ].filter((index) => {
      let hasEntries = false;
      for (const session of columnReplay.sessions.values()) {
        if (session.operation !== index.operation) continue;
        for (const { exercise } of session.order) index.add(operandPairId(exercise));
        hasEntries = true;
      }
      return hasEntries;
    }).map(({ operation, bits }) => ({ operation, bits })),
  } : null;
  const tables = [...multiplicationTables(database), ...(column ? columnTables(database) : [])];
  await sessionTransaction(database, tables, signal, async () => {
    for (const table of tables) await table.clear();
    await database.sessions.bulkAdd(
      backup.tables.sessions.map((s) => ({ ...s, owner: null })),
    );
    await database.attempts.bulkAdd(backup.tables.attempts);
    await database.progress.bulkAdd(backup.tables.progress);
    await database.settings.bulkAdd(backup.tables.settings);
    await database.journal.bulkAdd(backup.tables.journal);
    await database.rewards.bulkAdd(backup.tables.rewards);
    await database.rewardState.bulkAdd(backup.tables.rewardState);
    if (column) {
      await database.columnSessions.bulkAdd(column.tables.columnSessions.map(columnSessionRow));
      await database.columnAttempts.bulkAdd(column.tables.columnAttempts);
      await database.columnProgress.bulkAdd(column.tables.columnProgress);
      await database.columnJournal.bulkAdd(column.tables.columnJournal);
      await database.columnSeen.bulkAdd(column.seen);
      await database.columnState.add({ id: "state", generation: column.generation, cursor: column.cursor });
    }
  });
  return true;
}
