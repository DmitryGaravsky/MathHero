import { describe, expect, it } from "vitest";
import {
  calendarDay,
  DAY_MS,
  difficulty,
  learningPolicy,
  masteryEvidence,
  updateProgress,
  type PairProgress,
} from "../src/engine/learning/progress";
import {
  priority,
  selectNext,
  updateRepeats,
  type SchedulerContext,
} from "../src/engine/learning/scheduler";
import {
  answerLearning,
  advanceLearning,
  createLearning,
} from "../src/engine/learning/session";
import {
  getFact,
  multiplicationFacts,
} from "../src/engine/multiplication/facts";
import type { Attempt } from "../src/engine/sessions/diagnostic";

const baseTime = Date.parse("2026-01-01T12:00:00Z");
const policy = { ...learningPolicy, timeZone: "Europe/Paris" };
export function seeded(seed: number) {
  return {
    next: () => {
      seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
      return seed / 2 ** 32;
    },
  };
}
function attempt(
  id = "mul:7:8",
  day = 0,
  correct = true,
  ms = 2000,
  ordinal = 0,
): Attempt {
  const fact = getFact(id);
  return {
    id: `${day}:${ordinal}`,
    sessionId: `day:${day}`,
    mode: "adaptive",
    operation: "multiplication",
    ordinal,
    exerciseId: id,
    canonicalId: fact.canonicalId,
    answer: correct ? fact.expectedAnswer : 0,
    expectedAnswer: fact.expectedAnswer,
    correct,
    responseTimeMs: ms,
    createdAt: baseTime + day * DAY_MS,
  };
}
function baseline(errors: string[] = [], slow: string[] = []) {
  return multiplicationFacts.map((f) => ({
    ...attempt(
      f.id,
      0,
      !errors.includes(f.canonicalId),
      slow.includes(f.canonicalId) ? 6500 : 1800,
    ),
    mode: "diagnostic" as const,
  }));
}
function runProfile(profile: "A" | "B" | "C", days = 90) {
  const random = seeded(42);
  const gaps = ["mul:6:7", "mul:7:8", "mul:8:9"];
  const diagnostics = baseline(
    profile === "C" ? gaps : [],
    profile === "B" ? multiplicationFacts.map((f) => f.id) : [],
  );
  const progress = new Map<string, PairProgress>();
  const history: Attempt[] = [];
  for (let day = 0; day < days; day++) {
    let now = baseTime + day * DAY_MS;
    const clock = { now: () => now };
    let session = createLearning(
      `s:${day}`,
      "adaptive",
      [...progress.values()],
      diagnostics,
      clock,
      random,
      undefined,
      policy,
    );
    for (let i = 0; i < session.total; i++) {
      const fact = getFact(session.order[i]!);
      const correct = profile !== "C" || !gaps.includes(fact.canonicalId);
      now += 10_000;
      const result = answerLearning(
        session,
        correct ? fact.expectedAnswer : 0,
        profile === "B" ? 6500 : 1800,
        progress.get(fact.canonicalId),
        clock,
      );
      progress.set(fact.canonicalId, result.progress);
      history.push(result.attempt);
      session = advanceLearning(
        result.session,
        [...progress.values()],
        diagnostics,
        clock,
        random,
      );
    }
  }
  const rows = [...progress.values()];
  const metric = {
    attempts: history.length,
    pairs: rows.length,
    directions: new Set(history.map((a) => a.exerciseId)).size,
    errors: history.filter((a) => !a.correct).length,
    mastered: rows.filter((p) => p.masteredAt !== null).length,
    maxIntervalDays: Math.max(
      ...rows.map((p) =>
        p.intervalIndex < 0 ? 0 : policy.intervals[p.intervalIndex]!,
      ),
    ),
    gapAttempts: history.filter((a) => gaps.includes(a.canonicalId)).length,
    minPairAttempts: Math.min(...rows.map((p) => p.attempts)),
    maxPairAttempts: Math.max(...rows.map((p) => p.attempts)),
  };
  return { progress: rows, history, metric };
}

describe("learning evidence and intervals", () => {
  it("keeps the original due date through daily early practice, then advances at the scheduled review", () => {
    let p = updateProgress(undefined, attempt(), policy);
    p = updateProgress(p, attempt("mul:8:7"), policy);
    p = updateProgress(p, attempt("mul:7:8", 1), policy);
    expect(p.nextReviewAt).toBe(baseTime + 4 * DAY_MS);
    for (const day of [2, 3]) {
      p = updateProgress(p, attempt("mul:8:7", day), policy);
      expect(p.nextReviewAt).toBe(baseTime + 4 * DAY_MS);
      expect(p.intervalIndex).toBe(1);
    }
    p = updateProgress(p, attempt("mul:7:8", 4), policy);
    expect(p.intervalIndex).toBe(2);
    expect(p.nextReviewAt).toBe(baseTime + 11 * DAY_MS);
  });
  it("uses the exact 95% accuracy threshold and the last five attempts independently of error age", () => {
    let p: PairProgress | undefined;
    for (let i = 0; i < 20; i++)
      p = updateProgress(
        p,
        attempt(i % 2 ? "mul:8:7" : "mul:7:8", i, i > 1),
        policy,
      );
    expect(masteryEvidence(p!, baseTime + 20 * DAY_MS, policy)).toMatchObject({
      accuracy: 0.9,
      eligible: false,
      recentError: false,
    });
    p = updateProgress(p, attempt("mul:7:8", 20), policy);
    expect(masteryEvidence(p, baseTime + 20 * DAY_MS, policy)).toMatchObject({
      accuracy: 0.95,
      mastered: true,
    });
    p = updateProgress(p, attempt("mul:8:7", 21, false), policy);
    expect(p.masteredAt).toBeNull();
    expect(
      masteryEvidence(p, baseTime + 100 * DAY_MS, policy).recentError,
    ).toBe(true);
  });
  it("never grants mastery from diagnosis, one day, one orientation, or a single prolonged session", () => {
    expect(() =>
      updateProgress(undefined, { ...attempt(), mode: "diagnostic" }),
    ).toThrow();
    let progress: PairProgress | undefined;
    for (let i = 0; i < 30; i++)
      progress = updateProgress(
        progress,
        attempt(i % 2 ? "mul:8:7" : "mul:7:8", 0),
        policy,
      );
    expect(progress!.masteredAt).toBeNull();
    expect(progress!.recent).toHaveLength(20);
    progress = undefined;
    for (let i = 0; i < 10; i++)
      progress = updateProgress(progress, attempt("mul:7:8", i), policy);
    expect(
      masteryEvidence(progress!, baseTime + 10 * DAY_MS, policy).bothDirections,
    ).toBe(false);
    expect(progress!.masteredAt).toBeNull();
    progress = undefined;
    for (let i = 0; i < 10; i++)
      progress = updateProgress(
        progress,
        { ...attempt(i % 2 ? "mul:8:7" : "mul:7:8", i), sessionId: "single" },
        policy,
      );
    expect(progress!.masteredAt).toBeNull();
  });
  it("requires five successes across days with both orientations; squares need one direction", () => {
    let progress: PairProgress | undefined;
    for (let i = 0; i < 4; i++)
      progress = updateProgress(
        progress,
        attempt(i % 2 ? "mul:8:7" : "mul:7:8", Math.floor(i / 2)),
        policy,
      );
    expect(progress!.masteredAt).toBeNull();
    progress = updateProgress(progress, attempt("mul:7:8", 2), policy);
    expect(
      masteryEvidence(progress, baseTime + 2 * DAY_MS, policy),
    ).toMatchObject({ mastered: true, days: 3, bothDirections: true });
    let square: PairProgress | undefined;
    for (let i = 0; i < 5; i++)
      square = updateProgress(square, attempt("mul:7:7", i), policy);
    expect(square!.masteredAt).not.toBeNull();
  });
  it("keeps slow correct answers distinct from errors and caps their interval", () => {
    let progress: PairProgress | undefined;
    for (let i = 0; i < 10; i++)
      progress = updateProgress(
        progress,
        attempt(i % 2 ? "mul:8:7" : "mul:7:8", i, true, 6000),
        policy,
      );
    expect(progress).toMatchObject({
      correct: 10,
      errors: 0,
      masteredAt: null,
    });
    expect(difficulty(progress, [], baseTime + 10 * DAY_MS, policy)).toBe(
      "slow",
    );
    expect(progress!.nextReviewAt - progress!.lastAttemptAt).toBe(DAY_MS);
  });
  it("grows 1/3/7/14/30 days only at due retrievals, resets on error, and never inflates through early repeats", () => {
    let day = 0;
    let progress = updateProgress(undefined, attempt(), policy);
    progress = updateProgress(progress, attempt("mul:8:7"), policy);
    expect(progress.intervalIndex).toBe(0);
    const observed = [1];
    for (const wait of [1, 3, 7, 14]) {
      day += wait;
      progress = updateProgress(progress, attempt("mul:7:8", day), policy);
      observed.push(policy.intervals[progress.intervalIndex]!);
      const index = progress.intervalIndex;
      // Even a repeat on a new calendar date is premature for the new interval.
      progress = updateProgress(
        progress,
        attempt("mul:8:7", day + 0.5),
        policy,
      );
      expect(progress.intervalIndex).toBe(index);
    }
    expect(observed).toEqual([1, 3, 7, 14, 30]);
    progress = updateProgress(
      progress,
      attempt("mul:7:8", day + 1, false),
      policy,
    );
    expect(progress).toMatchObject({
      intervalIndex: -1,
      masteredAt: null,
      consecutiveCorrect: 0,
    });
    expect(progress.nextReviewAt).toBe(progress.lastAttemptAt);
  });
  it("does not self-promote when an error ages out; a new correct retrieval confirms mastery", () => {
    let p = updateProgress(undefined, attempt("mul:7:8", 0, false), policy);
    for (let i = 1; i <= 20; i++)
      p = updateProgress(
        p,
        attempt(i % 2 ? "mul:8:7" : "mul:7:8", Math.floor(i / 7) + 1),
        policy,
      );
    expect(p.masteredAt).toBeNull();
    expect(masteryEvidence(p, baseTime + 10 * DAY_MS, policy)).toMatchObject({
      eligible: true,
      mastered: false,
    });
    expect(difficulty(p, [], baseTime + 10 * DAY_MS, policy)).not.toBe(
      "mastered",
    );
    p = updateProgress(p, attempt("mul:7:8", 10), policy);
    expect(p.masteredAt).toBe(baseTime + 10 * DAY_MS);
  });
  it("uses immutable local day keys around midnight, DST and a later time-zone change", () => {
    expect(calendarDay(Date.parse("2026-01-01T23:30Z"), "Europe/Paris")).toBe(
      "2026-01-02",
    );
    expect(calendarDay(Date.parse("2026-01-02T00:30Z"), "Europe/Paris")).toBe(
      "2026-01-02",
    );
    expect(calendarDay(Date.parse("2026-03-29T00:30Z"), "Europe/Paris")).toBe(
      "2026-03-29",
    );
    expect(calendarDay(Date.parse("2026-03-29T01:30Z"), "Europe/Paris")).toBe(
      "2026-03-29",
    );
    expect(calendarDay(Date.parse("2026-10-25T00:30Z"), "Europe/Paris")).toBe(
      "2026-10-25",
    );
    expect(calendarDay(Date.parse("2026-10-25T01:30Z"), "Europe/Paris")).toBe(
      "2026-10-25",
    );
    const first = updateProgress(
      undefined,
      { ...attempt(), createdAt: Date.parse("2026-01-01T23:30Z") },
      policy,
    );
    const next = updateProgress(
      first,
      { ...attempt(), createdAt: Date.parse("2026-01-02T00:30Z") },
      { ...policy, timeZone: "America/New_York" },
    );
    expect(next.recent[0]).toMatchObject({
      day: "2026-01-02",
      timeZone: "Europe/Paris",
    });
    expect(next.recent[1]).toMatchObject({
      day: "2026-01-01",
      timeZone: "America/New_York",
    });
  });
});

describe("scheduler", () => {
  it("prioritizes errors, overdue and slow facts over unknown, fluent and mastered", () => {
    const error = baseline(["mul:7:8"]).filter(
      (a) => a.canonicalId === "mul:7:8",
    );
    const slow = baseline([], ["mul:7:8"]).filter(
      (a) => a.canonicalId === "mul:7:8",
    );
    const fast = baseline().filter((a) => a.canonicalId === "mul:7:8");
    const overdue = updateProgress(undefined, attempt(), policy);
    const weights = [
      priority(undefined, error, baseTime),
      priority(overdue, [], baseTime + 2 * DAY_MS),
      priority(undefined, slow, baseTime),
      priority(undefined, [], baseTime),
      priority(undefined, fast, baseTime),
    ];
    expect(weights).toEqual([14, 10, 8, 6, 1]);
  });
  it("repeats errors after two intervening tasks even under continuous errors, and first successes later", () => {
    let context: SchedulerContext = {
      mode: "weak",
      history: [],
      repeats: [],
      total: 100,
    };
    const random = seeded(5);
    const progresses = new Map<string, PairProgress>();
    for (let i = 0; i < 100; i++) {
      const next = selectNext(
        context,
        [...progresses.values()],
        [],
        baseTime,
        random,
      );
      const pair = getFact(next).canonicalId;
      if (i >= 3 && i < 12)
        expect(pair).toBe(getFact(context.history[i - 3]!).canonicalId);
      expect(
        context.history.slice(-2).map((id) => getFact(id).canonicalId),
      ).not.toContain(pair);
      const a = attempt(next, 0, false, 3000, i);
      const p = updateProgress(progresses.get(pair), a, policy);
      progresses.set(pair, p);
      context = {
        ...context,
        history: [...context.history, next],
        repeats: updateRepeats(context.repeats, a, p.attempts),
      };
    }
    expect(
      new Set(context.history.map((id) => getFact(id).canonicalId)).size,
    ).toBeGreaterThanOrEqual(25);
    expect(updateRepeats([], attempt("mul:7:8", 0, true, 2000, 0), 1)).toEqual([
      { canonicalId: "mul:7:8", due: 5, reason: "first-success" },
    ]);
  });
  it("dilutes a single weak/target pair and alternates orientation; ordinary repeats have three intervening tasks", () => {
    const random = seeded(6);
    const progress = new Map<string, PairProgress>();
    const context: SchedulerContext = {
      mode: "weak",
      targetPair: "mul:7:8",
      history: [],
      repeats: [],
      total: 100,
    };
    const diagnostics = baseline(["mul:7:8"]);
    for (let i = 0; i < 100; i++) {
      const next = selectNext(
        context,
        [...progress.values()],
        diagnostics,
        baseTime,
        random,
      );
      const pair = getFact(next).canonicalId;
      expect(
        context.history.slice(-3).map((id) => getFact(id).canonicalId),
      ).not.toContain(pair);
      const a = attempt(next);
      progress.set(pair, updateProgress(progress.get(pair), a, policy));
      context.history.push(next);
    }
    expect(
      new Set(context.history.map((id) => getFact(id).canonicalId)).size,
    ).toBeGreaterThan(15);
    expect(context.history).toContain("mul:7:8");
    expect(context.history).toContain("mul:8:7");
    expect(
      context.history.filter((id) => getFact(id).canonicalId === "mul:7:8")
        .length,
    ).toBeLessThanOrEqual(25);
  });
  it("warms up with known facts and caps optional mastered maintenance checks", () => {
    const diagnostics = baseline();
    const mastered = multiplicationFacts
      .filter((f) => f.id === f.canonicalId)
      .slice(0, 40)
      .map((f) => {
        let p: PairProgress | undefined;
        for (let i = 0; i < 5; i++)
          p = updateProgress(
            p,
            attempt(i % 2 ? `mul:${f.operands[1]}:${f.operands[0]}` : f.id, i),
            policy,
          );
        return { ...p!, nextReviewAt: baseTime + 100 * DAY_MS };
      });
    const context: SchedulerContext = {
      mode: "adaptive",
      history: [],
      repeats: [],
      total: 24,
    };
    const random = seeded(12);
    for (let i = 0; i < 24; i++)
      context.history.push(
        selectNext(
          context,
          mastered,
          diagnostics,
          baseTime + 5 * DAY_MS,
          random,
        ),
      );
    expect(
      context.history.filter((id) =>
        mastered.some((p) => p.canonicalId === getFact(id).canonicalId),
      ).length,
    ).toBeLessThanOrEqual(2);
  });
});

describe("reproducible 90-day pilot profiles (seed 42, 24 tasks/day)", () => {
  it("A gains stability and long intervals; B stays accurate but slow; C prioritizes specific gaps", () => {
    const a = runProfile("A");
    const b = runProfile("B");
    const c = runProfile("C");
    console.info(
      "PROFILE_RESULTS",
      JSON.stringify({ A: a.metric, B: b.metric, C: c.metric }),
    );
    expect(a.metric).toMatchObject({
      pairs: 78,
      directions: 144,
      errors: 0,
      maxIntervalDays: 30,
    });
    expect(a.metric.mastered).toBeGreaterThan(65);
    expect(b.metric).toMatchObject({
      errors: 0,
      mastered: 0,
      maxIntervalDays: 0,
    });
    expect(
      b.progress.every(
        (p) => difficulty(p, [], baseTime + 90 * DAY_MS, policy) === "slow",
      ),
    ).toBe(true);
    expect(c.metric.gapAttempts / 3).toBeGreaterThan(
      ((c.metric.attempts - c.metric.gapAttempts) / 75) * 3,
    );
    expect(
      c.progress
        .filter((p) =>
          ["mul:6:7", "mul:7:8", "mul:8:9"].includes(p.canonicalId),
        )
        .every((p) => p.masteredAt === null),
    ).toBe(true);
    expect(runProfile("A", 3).history).toEqual(runProfile("A", 3).history);
  }, 30_000);
});
