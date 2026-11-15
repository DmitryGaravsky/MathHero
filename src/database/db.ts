import Dexie, { type Table } from "dexie";
import type { Attempt, DiagnosticSession } from "../engine/sessions/diagnostic";
import type { Preferences } from "../app/AppContext";

export class MathHeroDB extends Dexie {
  sessions!: Table<DiagnosticSession, string>;
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
  }
}
export const db = new MathHeroDB();
