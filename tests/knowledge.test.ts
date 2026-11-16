import { describe, expect, it } from "vitest";
import { knowledgeState, pairObservations } from "../src/engine/learning/knowledge";
import {
  DAY_MS, learningPolicy, legacyLearningPolicy, masteryEvidence, updateProgress,
  type LearningPolicy, type PairProgress,
} from "../src/engine/learning/progress";
import { advanceLearning, answerLearning, createLearning } from "../src/engine/learning/session";
import { getFact, multiplicationFacts } from "../src/engine/multiplication/facts";
import type { Attempt } from "../src/engine/sessions/diagnostic";

const start = Date.parse("2026-01-01T12:00:00Z");
const at = (day: number) => start + day * DAY_MS;
const policy = { ...learningPolicy, timeZone: "Europe/Paris" };
const legacy = { ...legacyLearningPolicy, timeZone: policy.timeZone };
const reverse = "mul:8:7";
const target = "mul:7:8";
const square = "mul:9:9";
const random = { next: () => 0.999999 };

function observation(day: number, n: number, id = target, answer = getFact(id).expectedAnswer, ms = 1800, session = String(day)): Attempt {
  const fact = getFact(id);
  return {
    id: `${session}:${n}`, sessionId: session, ordinal: n, exerciseId: id,
    canonicalId: fact.canonicalId, expectedAnswer: fact.expectedAnswer, answer,
    correct: answer === fact.expectedAnswer, responseTimeMs: ms, createdAt: at(day),
    mode: "adaptive", operation: "multiplication",
  };
}

function trajectory(rows: Attempt[], sessionPolicy = policy) {
  const policies = new Map<string, LearningPolicy>();
  let p: PairProgress | undefined;
  for (const row of rows) {
    if (row.mode === "diagnostic") continue;
    policies.set(row.sessionId, sessionPolicy);
    p = updateProgress(p, row, sessionPolicy);
  }
  const evidence = pairObservations(rows, policies);
  return { progress: p, state: knowledgeState(p, policies, at(100), evidence.check), evidence };
}

const established = [0, 1, 4, 11, 25].map((d, i) => observation(d, i, i % 2 ? reverse : target));

describe("pair evidence", () => {
  it("separates assessment, accurate slow recall, repeated speed and established mastery", () => {
    const diagnostic = [{ ...observation(0, 0), mode: "diagnostic" as const }];
    expect(trajectory(diagnostic)).toMatchObject({ state: "unconfirmed", evidence: { diagnosticOnly: true } });
    expect(trajectory([observation(0, 0, square)]).state).toBe("unconfirmed");
    expect(trajectory([observation(0, 0, square), observation(1, 0, square)]).state).toBe("learned");
    expect(trajectory([observation(0, 0), observation(1, 0), observation(2, 0)]).state).toBe("unconfirmed");
    const slow = [observation(0, 0, target, 56, 4000), observation(1, 0, reverse, 56, 4000)];
    expect(trajectory(slow)).toMatchObject({ state: "learned", evidence: { wrong: 0, slow: 2 } });
    expect(trajectory(established.slice(0, 3))).toMatchObject({ state: "fluent", progress: { masteredAt: null } });
    expect(trajectory(established)).toMatchObject({ state: "fluent", evidence: { check: null }, progress: { masteredAt: at(25) } });
    expect(trajectory(established.slice(0, 3), { ...policy, fastMs: 1700 }).state).toBe("learned");
  });

  it("requires recent consistency for learned and fluent, even with quick latest answers in both orientations", () => {
    const failures = Array.from({ length: 17 }, (_, i) => observation(i - 17, 0, target, 0));
    expect(trajectory([...failures, ...established.slice(2)]).state).toBe("unconfirmed");
    const sporadicSpeed = Array.from({ length: 15 }, (_, i) => observation(i - 15, 0, target, 56, 5100));
    expect(trajectory([...sporadicSpeed, ...established.slice(2)]).state).toBe("learned");
  });

  it("requires a real due response in another session and on another day, then clears the proof after regression", () => {
    const early = observation(38, 0, reverse);
    const sameSession = observation(39, 1, reverse, 56, 1800, established.at(-1)!.sessionId);
    expect(trajectory([...established, early]).state).toBe("fluent");
    expect(trajectory([...established, sameSession]).state).toBe("fluent");
    const due = observation(39, 0, reverse);
    for (const snapshot of [policy, legacy]) {
      expect(trajectory([...established, early, due], snapshot).state).toBe("fluent");
      expect(trajectory([...established, due], snapshot)).toMatchObject({
        state: "retained", evidence: { check: { at: at(39), dueAt: at(39), intervalDays: 14 } },
      });
    }
    const slow = observation(40, 0, target, 56, 4200);
    const afterSlow = trajectory([...established, due, slow]);
    expect(afterSlow).toMatchObject({
      state: "learned", evidence: { check: null, unstable: false, wrong: 0, slow: 1 },
      progress: { intervalIndex: 0, masteredAt: at(25), retentionCheck: null },
    });
    const wrong = observation(41, 0, reverse, 0);
    expect(trajectory([...established, due, slow, wrong])).toMatchObject({
      state: "unconfirmed", evidence: { check: null, unstable: true, recurring: false },
      progress: { intervalIndex: -1, masteredAt: null, nextReviewAt: at(41), retentionCheck: null },
    });
    const recovered = Array.from({ length: 20 }, (_, i) =>
      observation(50 + Math.floor(i / 5), i, i % 2 ? target : reverse));
    expect(trajectory([...established, due, slow, wrong, ...recovered])).toMatchObject({
      state: "fluent", evidence: { check: null, unstable: false },
    });
  });

  it("uses journal order and historical calendar zones even after the clock moves back", () => {
    const earlierClock = { ...observation(24, 0, reverse, 0), sessionId: "later-write" };
    const due = observation(39, 0, reverse);
    expect(trajectory([...established, due, earlierClock])).toMatchObject({
      state: "unconfirmed", evidence: { check: null, wrong: 1 },
      progress: { masteredAt: null, lastErrorAt: at(24) },
    });
    const midnight = Date.parse("2026-02-09T00:00:00Z");
    const prior = { ...observation(38, 0, reverse), createdAt: midnight - 13 * 60_000 };
    const afterMidnight = { ...due, createdAt: midnight + 13 * 60_000 };
    const earlier = established.map((a) => ({ ...a, createdAt: a.createdAt - 12 * 3_600_000 }));
    const zone = { ...policy, timeZone: "UTC" };
    expect(trajectory([...earlier, prior, afterMidnight], zone).state).toBe("fluent");
    expect(trajectory([...earlier, afterMidnight], zone).state).toBe("retained");
    // Twenty-four real hours can still share a recorded calendar date after a westward time-zone change.
    const last = { ...observation(26, 0, reverse, 56, 4000), createdAt: Date.parse("2026-01-27T23:30Z") };
    const nearDue = { ...observation(27, 0, reverse), createdAt: last.createdAt + DAY_MS };
    const history = [...established, last, nearDue];
    const zones = new Map(history.map((a) => [a.sessionId, zone]));
    expect(pairObservations(history, zones).check).toMatchObject({ intervalDays: 1 });
    zones.set(last.sessionId, { ...zone, timeZone: "Pacific/Kiritimati" });
    expect(pairObservations(history, zones).check).toBeNull();
  });

  it("flags a transposition only with independent corroboration and keeps all wrong answers counted", () => {
    const first = observation(0, 0);
    const transposed = observation(1, 0, target, 65);
    const next = observation(2, 0);
    expect(trajectory([first, transposed]).evidence.possibleSlip).toBe(false);
    expect(trajectory([first, transposed, observation(2, 0, reverse)]).evidence.possibleSlip).toBe(false);
    expect(trajectory([first, { ...transposed, answer: 55 }, next]).evidence.possibleSlip).toBe(false);
    expect(trajectory([first, transposed, { ...next, sessionId: transposed.sessionId }]).evidence.possibleSlip).toBe(false);
    expect(trajectory([first, transposed, next]).evidence).toMatchObject({
      wrong: 1, slow: 0, recurring: false, unstable: false, possibleSlip: true, accuracy: 2 / 3,
    });
    const retry = observation(1, 1, reverse, 0);
    expect(trajectory([first, transposed, retry, next]).evidence).toMatchObject({
      wrong: 2, recurring: false, possibleSlip: false,
    });
    expect(trajectory([first, transposed, next, observation(3, 0, reverse, 0)]).evidence).toMatchObject({
      wrong: 2, recurring: true, unstable: false, possibleSlip: false,
    });
  });
});

it("fits a guaranteed 14-day and 30-day review in ordinary 24-question sessions with competing errors", () => {
  const diagnostics = multiplicationFacts.map((fact, i) => ({
    ...observation(0, i, fact.id, fact.operands[0] < 6 ? 0 : fact.expectedAnswer),
    mode: "diagnostic" as const,
  }));
  const previous = trajectory(established).progress!;
  const clockFor = (day: number) => ({ now: () => at(day) });
  function startSession(day: number, p: PairProgress, snapshot = policy) {
    return createLearning(String(day), "adaptive", [p], diagnostics, clockFor(day),
      day === 69 ? { next: () => 0 } : random, undefined, snapshot);
  }
  expect(previous.nextReviewAt).toBe(at(39));
  expect(startSession(38, previous).order).toEqual(startSession(38, previous, legacy).order);
  expect(startSession(39, previous, legacy).order[0]).not.toBe(reverse);
  const pairs = new Map([[target, previous]]);
  for (const [day, direction, intervalDays] of [[39, reverse, 14], [69, target, 30]] as const) {
    const clock = clockFor(day);
    let session = startSession(day, pairs.get(target)!);
    expect(session.order[0]).toBe(direction);
    for (let i = 0; i < session.total; i++) {
      const fact = getFact(session.order[i]!);
      const outcome = answerLearning(session, fact.canonicalId === target ? fact.expectedAnswer : 0, 1800, pairs.get(fact.canonicalId), clock);
      pairs.set(fact.canonicalId, outcome.progress);
      session = advanceLearning(outcome.session, [...pairs.values()], diagnostics, clock, random);
    }
    expect(session).toMatchObject({ total: 24, cursor: 24, phase: "completed" });
    const order = session.order.map((id) => getFact(id).canonicalId);
    for (const [index, pair] of order.entries()) {
      expect(order.slice(Math.max(0, index - 2), index)).not.toContain(pair);
      expect(order.filter((value) => value === pair).length).toBeLessThanOrEqual(4);
    }
    expect(pairs.get(target)!.retentionCheck).toMatchObject({ at: at(day), intervalDays });
    expect(masteryEvidence(pairs.get(target)!, at(day)).mastered).toBe(true);
  }
});
