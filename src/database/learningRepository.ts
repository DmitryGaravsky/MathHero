import { recordRewards, recordCompletion } from "./rewards";
import type { Clock, RandomSource } from "../engine/core/Exercise";
import { getFact } from "../engine/multiplication/facts";
import {
  advanceLearning,
  answerLearning,
  createLearning,
  type LearningSession,
} from "../engine/learning/session";
import { db, type MathHeroDB } from "./db";
import { sessionTransaction } from "./sessionTransaction";

/** One unfinished session per mode+target; completed sessions keep immutable history. */
export class LearningRepository {
  constructor(
    private readonly database: MathHeroDB = db,
    private readonly clock: Clock = { now: () => Date.now() },
    private readonly random: RandomSource = { next: () => Math.random() },
    readonly mode: LearningSession["mode"] = "adaptive",
    readonly targetPair?: string,
    private readonly newId: () => string = () => crypto.randomUUID(),
  ) {
    this.targetPair = targetPair ? getFact(targetPair).canonicalId : undefined;
  }
  async get(): Promise<LearningSession | undefined> {
    const sessions = await this.database.sessions
      .where("mode")
      .equals(this.mode)
      .toArray();
    const latest = sessions
      .filter(
        (s): s is LearningSession =>
          s.mode !== "diagnostic" && s.targetPair === this.targetPair,
      )
      .sort((a, b) => b.sequence - a.sequence);
    // Preserve the final feedback / summary on reload, including early completion.
    return latest.find((s) => s.completedAt === null) ?? latest[0];
  }
  async start(signal?: AbortSignal) {
    return sessionTransaction(
      this.database,
      [
        this.database.sessions,
        this.database.progress,
        this.database.attempts,
        this.database.journal,
        this.database.rewards,
        this.database.rewardState,
      ],
      signal,
      async () => {
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
        return session;
      },
    );
  }
  async claim(
    owner: string,
    expected?: LearningSession,
    signal?: AbortSignal,
  ): Promise<LearningSession> {
    return sessionTransaction(this.database, [this.database.sessions], signal, async () => {
      const session = expected ? await this.database.sessions.get(expected.id) : await this.get();
      if (!session || session.mode !== this.mode || session.targetPair !== this.targetPair)
        throw new Error("Missing session");
      if (
        expected &&
        (session.cursor !== expected.cursor ||
          session.phase !== expected.phase || session.owner !== expected.owner ||
          session.startedAt !== expected.startedAt)
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
      expected.owner === null ||
      current.owner !== expected.owner ||
      current.cursor !== expected.cursor ||
      current.phase !== expected.phase ||
      current.startedAt !== expected.startedAt
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
  submit(expected: LearningSession, answer: number, activeMs: number, signal?: AbortSignal) {
    return sessionTransaction(
      this.database,
      [
        this.database.sessions,
        this.database.attempts,
        this.database.journal,
        this.database.rewards,
        this.database.rewardState,
        this.database.progress,
      ],
      signal,
      async () => {
        const current = await this.current(expected);
        const pair = getFact(current.order[current.cursor]!).canonicalId;
        const previous = await this.database.progress.get(pair);
        const result = answerLearning(
          current,
          answer,
          Math.max(current.activeMs, activeMs),
          previous,
          this.clock,
        );
        await this.database.attempts.add(result.attempt);
        await this.database.progress.put(result.progress);
        await this.database.sessions.put(result.session);
        await recordRewards(
          this.database,
          result.attempt,
          result.session,
          previous,
          result.progress,
        );
        return result.session;
      },
    );
  }
  advance(expected: LearningSession, signal?: AbortSignal) {
    return sessionTransaction(
      this.database,
      [
        this.database.sessions,
        this.database.progress,
        this.database.attempts,
        this.database.journal,
        this.database.rewards,
        this.database.rewardState,
      ],
      signal,
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
  finish(expected: LearningSession, signal?: AbortSignal) {
    return sessionTransaction(
      this.database,
      [
        this.database.sessions,
        this.database.attempts,
        this.database.journal,
        this.database.rewards,
      ],
      signal,
      async () => {
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
        await recordCompletion(this.database, next);
        return next;
      },
    );
  }
}
