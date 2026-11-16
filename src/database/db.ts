import Dexie, { type Table } from "dexie";
import type { Attempt } from "../engine/sessions/diagnostic";
import type { Session } from "../engine/learning/session";
import type { PairProgress } from "../engine/learning/progress";
import type { StoredPreferences } from "../settings/preferences";
import type { ColumnOperation, ColumnSkill } from "../engine/column/arithmetic";
import type { ColumnSkillProgress } from "../engine/column/policy";
import type {
  ColumnAttempt,
  ColumnJournalCursor,
  ColumnJournalEntry,
  ColumnSession,
} from "../engine/column/session";
import {
  replayLearning,
  type JournalEntry,
  type Reward,
  type RewardState,
} from "../engine/learning/rewards";

export interface ParentPinVerifier {
  id: "parent";
  version: 1;
  salt: Uint8Array<ArrayBuffer>;
  hash: Uint8Array<ArrayBuffer>;
}

export interface ColumnSessionRow {
  session: ColumnSession;
  owner: string | null;
  revision: number;
  openOperation?: ColumnOperation;
}

export interface ColumnStateRow {
  id: "state";
  generation: string;
  cursor: ColumnJournalCursor;
}

export interface ColumnSeenRow {
  operation: ColumnOperation;
  bits: Uint8Array;
}

export class MathHeroDB extends Dexie {
  sessions!: Table<Session, string>;
  progress!: Table<PairProgress, string>;
  attempts!: Table<Attempt, string>;
  settings!: Table<{ id: string; value: StoredPreferences }, string>;
  journal!: Table<JournalEntry, string>;
  rewards!: Table<Reward, string>;
  rewardState!: Table<RewardState, string>;
  parentGate!: Table<ParentPinVerifier, "parent">;
  columnSessions!: Table<ColumnSessionRow, string>;
  columnAttempts!: Table<ColumnAttempt, string>;
  columnProgress!: Table<ColumnSkillProgress, [ColumnOperation, ColumnSkill]>;
  columnJournal!: Table<ColumnJournalEntry, number>;
  columnSeen!: Table<ColumnSeenRow, ColumnOperation>;
  columnState!: Table<ColumnStateRow, "state">;
  constructor(name = "math-hero") {
    super(name);
    this.version(1).stores({
      sessions: "id, mode, startedAt",
      attempts:
        "id, sessionId, exerciseId, canonicalId, mode, [sessionId+ordinal]",
      settings: "id",
    });
    // Additive migration: v1 diagnostic records and preferences remain untouched.
    this.version(2).stores({
      progress: "canonicalId, nextReviewAt, masteredAt",
    });
    this.version(3)
      .stores({
        journal: "id, &sequence",
        rewards: "id, sessionId, kind",
        rewardState: "id",
      })
      .upgrade(async (tx) => {
        const sessions: Session[] = await tx.table("sessions").toArray();
        const attempts: Attempt[] = await tx.table("attempts").toArray();
        const starts = new Map(sessions.map((s) => [s.id, s.startedAt]));
        const sequence = new Map(
          sessions.map((s) => [s.id, s.mode === "diagnostic" ? 0 : s.sequence]),
        );
        const journal = [...attempts]
          .sort(
            (a, b) =>
              a.createdAt - b.createdAt ||
              (a.sessionId === b.sessionId
                ? a.ordinal - b.ordinal
                : starts.get(a.sessionId)! - starts.get(b.sessionId)! ||
                  sequence.get(a.sessionId)! - sequence.get(b.sessionId)! ||
                  a.sessionId.localeCompare(b.sessionId)),
          )
          .map((a, i) => ({ id: a.id, sequence: i + 1 }));
        await tx.table("journal").bulkPut(journal);
        const replay = replayLearning(sessions, attempts, journal);
        // v2 had no cross-stream ordering. Preserve source records and normalize derived data.
        await tx.table("progress").clear();
        await tx.table("progress").bulkPut(replay.progress);
        for (const session of sessions)
          if (session.mode !== "diagnostic") {
            const derived = replay.summaries.get(session.id);
            if (derived)
              await tx
                .table("sessions")
                .put({
                  ...session,
                  summary: derived.summary,
                  repeats: derived.repeats,
                });
          }
        await tx.table("rewards").bulkPut(replay.rewards);
        await tx.table("rewardState").put(replay.state);
      });
    this.version(4).stores({ parentGate: "id" });
    this.version(5).stores({
      columnSessions: "session.id, &openOperation, [session.operation+session.startSequence]",
      columnAttempts: "id, sessionId, &sequence, [operation+sequence]",
      columnProgress: "[operation+skill]",
      columnJournal: "sequence, sessionId",
      columnSeen: "operation",
      columnState: "id",
    });
  }
}
export const db = new MathHeroDB();
