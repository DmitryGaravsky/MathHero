import type { Clock, RandomSource } from "../engine/core/Exercise";
import { getFact } from "../engine/multiplication/facts";
import {
  advanceLearning,
  answerLearning,
  createLearning,
  type LearningSession,
} from "../engine/learning/session";
import { db, type MathHeroDB } from "./db";

/** One unfinished session per mode+target; completed sessions keep immutable history. */
export class LearningRepository {
  private id: string | undefined;
  constructor(
    private readonly database: MathHeroDB = db,
    private readonly clock: Clock = { now: () => Date.now() },
    private readonly random: RandomSource = { next: () => Math.random() },
    readonly mode: LearningSession["mode"] = "adaptive",
    readonly targetPair?: string,
    private readonly newId: () => string = () => crypto.randomUUID(),
  ) {
    if (targetPair) getFact(targetPair);
  }
  async get(): Promise<LearningSession | undefined> {
    if (this.id) {
      const row = await this.database.sessions.get(this.id);
      return row?.mode !== "diagnostic" ? row : undefined;
    }
    const sessions = await this.database.sessions
      .where("mode")
      .equals(this.mode)
      .toArray();
    const target = this.targetPair
      ? getFact(this.targetPair).canonicalId
      : undefined;
    const latest = sessions
      .filter(
        (s): s is LearningSession =>
          s.mode !== "diagnostic" && s.targetPair === target,
      )
      .sort((a, b) => b.sequence - a.sequence);
    // Preserve the final feedback / summary on reload, including early completion.
    const session = latest.find((s) => s.completedAt === null) ?? latest[0];
    if (session) this.id = session.id;
    return session;
  }
  async start() {
    return this.database.transaction(
      "rw",
      this.database.sessions,
      this.database.progress,
      this.database.attempts,
      async () => {
        // Re-query inside the serialized transaction, even when this instance has an old ID.
        this.id = undefined;
        const existing = await this.get();
        if (existing && existing.phase !== "completed") return existing;
        const session = createLearning(
          `learning:${this.newId()}`,
          this.mode,
          await this.database.progress.toArray(),
          await this.database.attempts
            .where("mode")
            .equals("diagnostic")
            .toArray(),
          this.clock,
          this.random,
          this.targetPair,
        );
        session.sequence = (existing?.sequence ?? 0) + 1;
        await this.database.sessions.add(session);
        this.id = session.id;
        return session;
      },
    );
  }
  async claim(
    owner: string,
    expected?: LearningSession,
    isActive: () => boolean = () => true,
  ): Promise<LearningSession> {
    return this.database.transaction("rw", this.database.sessions, async () => {
      const session = await this.get();
      if (!session || !isActive())
        throw new Error("Missing session or disposed view");
      if (
        expected &&
        (session.id !== expected.id ||
          session.cursor !== expected.cursor ||
          session.phase !== expected.phase)
      )
        throw new Error("Session changed");
      const claimed = { ...session, owner };
      await this.database.sessions.put(claimed);
      return claimed;
    });
  }
  private async current(expected: LearningSession) {
    const current = await this.database.sessions.get(expected.id);
    if (
      !current ||
      current.mode === "diagnostic" ||
      current.owner !== expected.owner ||
      current.cursor !== expected.cursor ||
      current.phase !== expected.phase
    )
      throw new Error("Session changed in another view");
    return current;
  }
  checkpoint(expected: LearningSession, activeMs: number, draft: string) {
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
  submit(expected: LearningSession, answer: number, activeMs: number) {
    return this.database.transaction(
      "rw",
      this.database.sessions,
      this.database.attempts,
      this.database.progress,
      async () => {
        const current = await this.current(expected);
        const pair = getFact(current.order[current.cursor]!).canonicalId;
        const result = answerLearning(
          current,
          answer,
          Math.max(current.activeMs, activeMs),
          await this.database.progress.get(pair),
          this.clock,
        );
        await this.database.attempts.add(result.attempt);
        await this.database.progress.put(result.progress);
        await this.database.sessions.put(result.session);
        return result.session;
      },
    );
  }
  advance(expected: LearningSession) {
    return this.database.transaction(
      "rw",
      this.database.sessions,
      this.database.progress,
      this.database.attempts,
      async () => {
        const next = advanceLearning(
          await this.current(expected),
          await this.database.progress.toArray(),
          await this.database.attempts
            .where("mode")
            .equals("diagnostic")
            .toArray(),
          this.clock,
          this.random,
        );
        await this.database.sessions.put(next);
        return next;
      },
    );
  }
  finish(expected: LearningSession) {
    return this.database.transaction("rw", this.database.sessions, async () => {
      const current = await this.current(expected);
      const next: LearningSession = {
        ...current,
        phase: "completed",
        completedAt: current.completedAt ?? this.clock.now(),
        endReason: current.endReason ?? "early",
        draft: "",
        activeMs: 0,
      };
      await this.database.sessions.put(next);
      return next;
    });
  }
}
