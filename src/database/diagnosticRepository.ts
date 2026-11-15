import type { Clock, RandomSource } from "../engine/core/Exercise";
import {
  createDiagnostic,
  answerDiagnostic,
  advanceDiagnostic,
  type DiagnosticSession,
} from "../engine/sessions/diagnostic";
import { db, type MathHeroDB } from "./db";

// One baseline diagnostic. Future training uses independent session IDs and modes.
export const DIAGNOSTIC_ID = "diagnostic:baseline:v1";
export class DiagnosticRepository {
  constructor(
    private readonly database: MathHeroDB = db,
    private readonly clock: Clock = { now: () => Date.now() },
    private readonly random: RandomSource = { next: () => Math.random() },
  ) {}
  get() {
    return this.database.sessions.get(DIAGNOSTIC_ID);
  }
  attempts() {
    return this.database.attempts
      .where("sessionId")
      .equals(DIAGNOSTIC_ID)
      .toArray();
  }
  async start() {
    return this.database.transaction("rw", this.database.sessions, async () => {
      const existing = await this.get();
      if (existing) return existing;
      const session = createDiagnostic(DIAGNOSTIC_ID, this.clock, this.random);
      await this.database.sessions.add(session);
      return session;
    });
  }
  async claim(
    owner: string,
    expected?: DiagnosticSession,
    isActive: () => boolean = () => true,
  ): Promise<DiagnosticSession> {
    return this.database.transaction("rw", this.database.sessions, async () => {
      const session = await this.get();
      if (!session) throw new Error("Missing diagnostic");
      if (!isActive()) throw new Error("View disposed");
      if (
        expected &&
        (session.cursor !== expected.cursor || session.phase !== expected.phase)
      )
        throw new Error("Session changed in another view");
      const claimed = { ...session, owner };
      await this.database.sessions.put(claimed);
      return claimed;
    });
  }
  private async current(expected: DiagnosticSession) {
    const current = await this.get();
    if (
      !current ||
      current.owner !== expected.owner ||
      current.cursor !== expected.cursor ||
      current.phase !== expected.phase
    ) {
      throw new Error("Session changed in another view");
    }
    return current;
  }
  checkpoint(expected: DiagnosticSession, activeMs: number, draft: string) {
    return this.database.transaction("rw", this.database.sessions, async () => {
      const current = await this.current(expected);
      if (
        current.phase !== "question" ||
        !Number.isFinite(activeMs) ||
        activeMs < 0 ||
        !/^\d{0,3}$/.test(draft)
      )
        throw new Error("Invalid checkpoint");
      await this.database.sessions.put({
        ...current,
        activeMs: Math.max(current.activeMs, activeMs),
        draft,
      });
    });
  }
  submit(expected: DiagnosticSession, answer: number, activeMs: number) {
    return this.database.transaction(
      "rw",
      this.database.sessions,
      this.database.attempts,
      async () => {
        const current = await this.current(expected);
        const result = answerDiagnostic(
          current,
          answer,
          Math.max(current.activeMs, activeMs),
          this.clock,
        );
        await this.database.attempts.add(result.attempt);
        await this.database.sessions.put(result.session);
        return result.session;
      },
    );
  }
  advance(expected: DiagnosticSession) {
    return this.database.transaction("rw", this.database.sessions, async () => {
      const next = advanceDiagnostic(await this.current(expected));
      await this.database.sessions.put(next);
      return next;
    });
  }
}
export const diagnosticRepository = new DiagnosticRepository();
