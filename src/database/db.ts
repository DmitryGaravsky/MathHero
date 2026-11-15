import Dexie, { type Table } from "dexie";
import type { Attempt } from "../engine/sessions/diagnostic";
import type { Session } from "../engine/learning/session";
import type { PairProgress } from "../engine/learning/progress";
import type { Preferences } from "../app/AppContext";

export class MathHeroDB extends Dexie {
  sessions!: Table<Session, string>;
  progress!: Table<PairProgress, string>;
  attempts!: Table<Attempt, string>;
  settings!: Table<{ id: string; value: Preferences }, string>;
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
  }
}
export const db = new MathHeroDB();
