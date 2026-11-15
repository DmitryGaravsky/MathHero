import type { Clock, RandomSource } from "../engine/core/Exercise";
import {
  createDiagnostic,
  answerDiagnostic,
  advanceDiagnostic,
  type DiagnosticSession,
} from "../engine/sessions/diagnostic";
import { db, type MathHeroDB } from "./db";
import { sessionTransaction } from "./sessionTransaction";

// One baseline diagnostic. Future training uses independent session IDs and modes.
export const DIAGNOSTIC_ID = "diagnostic:baseline:v1";
export class DiagnosticRepository {
  constructor(
    private readonly database: MathHeroDB = db,
    private readonly clock: Clock = { now: () => Date.now() },
    private readonly random: RandomSource = { next: () => Math.random() },
  ) {}
  async get() {
    const session = await this.database.sessions.get(DIAGNOSTIC_ID);
    return session?.mode === "diagnostic" ? session : undefined;
  }
  attempts() {
    return this.database.attempts
      .where("sessionId")
      .equals(DIAGNOSTIC_ID)
      .toArray();
  }
  async start(signal?: AbortSignal) {
    return sessionTransaction(this.database, [this.database.sessions], signal, async () => {
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
    signal?: AbortSignal,
  ): Promise<DiagnosticSession> {
    return sessionTransaction(this.database, [this.database.sessions], signal, async () => {
      const session = await this.get();
      if (!session) throw new Error("Missing diagnostic");
      if (
        expected &&
        (session.cursor !== expected.cursor || session.phase !== expected.phase ||
          session.owner !== expected.owner || session.startedAt !== expected.startedAt)
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
      expected.owner === null ||
      current.owner !== expected.owner ||
      current.cursor !== expected.cursor ||
      current.phase !== expected.phase ||
      current.startedAt !== expected.startedAt
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
  submit(expected: DiagnosticSession, answer: number, activeMs: number, signal?: AbortSignal) {
    return sessionTransaction(
      this.database,
      [this.database.sessions, this.database.attempts, this.database.journal],
      signal,
      async () => {
        const current = await this.current(expected);
        const result = answerDiagnostic(
          current,
          answer,
          Math.max(current.activeMs, activeMs),
          this.clock,
        );
        await this.database.attempts.add(result.attempt);
        const last = await this.database.journal.orderBy("sequence").last();
        await this.database.journal.add({
          id: result.attempt.id,
          sequence: (last?.sequence ?? 0) + 1,
        });
        await this.database.sessions.put(result.session);
        return result.session;
      },
    );
  }
  advance(expected: DiagnosticSession, signal?: AbortSignal) {
    return sessionTransaction(this.database, [this.database.sessions], signal, async () => {
      const next = advanceDiagnostic(await this.current(expected));
      await this.database.sessions.put(next);
      return next;
    });
  }
}
export const diagnosticRepository = new DiagnosticRepository();
