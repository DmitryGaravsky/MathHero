import { describe, expect, it, afterEach, vi } from "vitest";
import { MathHeroDB } from "../src/database/db";
import { DiagnosticRepository } from "../src/database/diagnosticRepository";
import {
  multiplicationFacts,
  multiplicationFact,
  getFact,
  evaluateMultiplication,
  MultiplicationEngine,
} from "../src/engine/multiplication/facts";
import {
  createDiagnostic,
  answerDiagnostic,
  advanceDiagnostic,
  type Attempt,
} from "../src/engine/sessions/diagnostic";
import { ActiveTimer } from "../src/engine/sessions/ActiveTimer";
import { diagnosticStatistics } from "../src/engine/sessions/statistics";
import { DiagnosticController } from "../src/features/training/DiagnosticController";

const clock = { now: () => 123456 };
function seeded(seed: number) {
  return {
    next: () => {
      seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
      return seed / 2 ** 32;
    },
  };
}
const databases: MathHeroDB[] = [];
function repository() {
  const db = new MathHeroDB(`test-${crypto.randomUUID()}`);
  databases.push(db);
  return { db, repo: new DiagnosticRepository(db, clock, seeded(42)) };
}
afterEach(async () => {
  await Promise.all(databases.splice(0).map((db) => db.delete()));
});

describe("multiplication domain", () => {
  it("contains exactly 144 directed facts and 78 symmetric canonical pairs", () => {
    expect(multiplicationFacts).toHaveLength(144);
    expect(new Set(multiplicationFacts.map((f) => f.id)).size).toBe(144);
    expect(new Set(multiplicationFacts.map((f) => f.canonicalId)).size).toBe(
      78,
    );
    for (let a = 1; a <= 12; a++)
      for (let b = 1; b <= 12; b++) {
        const fact = getFact(`mul:${a}:${b}`);
        expect(fact.operands).toEqual([a, b]);
        expect(fact.expectedAnswer).toBe(a * b);
        expect(fact.canonicalId).toBe(getFact(`mul:${b}:${a}`).canonicalId);
        expect(evaluateMultiplication(fact, a * b)).toBe(true);
        expect(evaluateMultiplication(fact, a * b + 1)).toBe(false);
      }
  });
  it("rejects invalid operands, nonnumeric answers and unsupported operations", () => {
    for (const n of [0, 13, 1.5, NaN, Infinity])
      expect(() => multiplicationFact(n, 2)).toThrow();
    for (const n of [NaN, Infinity, -1, 56.1])
      expect(evaluateMultiplication(multiplicationFact(7, 8), n)).toBe(false);
    expect(() =>
      evaluateMultiplication(
        { ...multiplicationFact(2, 3), operation: "division" },
        6,
      ),
    ).toThrow();
    expect(
      evaluateMultiplication(
        { ...multiplicationFact(7, 8), expectedAnswer: 999 },
        56,
      ),
    ).toBe(true);
  });
  it("injects RNG for generation and validates its range", () => {
    expect(new MultiplicationEngine({ next: () => 0 }).generate().id).toBe(
      "mul:1:1",
    );
    expect(new MultiplicationEngine({ next: () => 0.9999 }).generate().id).toBe(
      "mul:12:12",
    );
    for (const n of [-1, 1, NaN])
      expect(() => createDiagnostic("a", clock, { next: () => n })).toThrow();
  });
});
describe("diagnostic transitions and statistics", () => {
  it("shuffles reproducibly, covers six complete disjoint parts, and finishes only at 144", () => {
    let session = createDiagnostic("a", clock, seeded(42));
    expect(session.order).toEqual(
      createDiagnostic("a", clock, seeded(42)).order,
    );
    expect(session.order).not.toEqual(
      createDiagnostic("a", clock, seeded(43)).order,
    );
    expect(new Set(session.order).size).toBe(144);
    expect([...session.order].sort()).toEqual(
      multiplicationFacts.map((f) => f.id).sort(),
    );
    const attempts: Attempt[] = [];
    let breaks = 0;
    for (let i = 0; i < 144; i++) {
      const result = answerDiagnostic(
        session,
        getFact(session.order[i]!).expectedAnswer,
        i + 1,
        clock,
      );
      attempts.push(result.attempt);
      expect(result.session.phase).toBe("feedback");
      expect(() => answerDiagnostic(result.session, 1, 1, clock)).toThrow();
      session = advanceDiagnostic(result.session);
      if (session.phase === "break") {
        breaks++;
        expect((i + 1) % 24).toBe(0);
        session = advanceDiagnostic(session);
      }
    }
    expect(breaks).toBe(5);
    expect(session.phase).toBe("completed");
    expect(session.completedAt).toBe(123456);
    expect(new Set(attempts.map((a) => a.id)).size).toBe(144);
    expect(attempts.every((a) => a.mode === "diagnostic")).toBe(true);
    expect(session).not.toHaveProperty("masteryLevel");
  });
  it("keeps accuracy separate, uses only correct times and returns null for absent evidence", () => {
    const first = createDiagnostic("a", clock, seeded(1));
    const base = answerDiagnostic(
      first,
      getFact(first.order[0]!).expectedAnswer,
      1000,
      clock,
    ).attempt;
    const stats = diagnosticStatistics([
      base,
      { ...base, responseTimeMs: 3000 },
      { ...base, correct: false, responseTimeMs: 90000 },
      { ...base, mode: "adaptive" },
    ]);
    expect(stats).toEqual({
      answered: 3,
      correct: 2,
      accuracy: 2 / 3,
      meanCorrectMs: 2000,
      medianCorrectMs: 2000,
    });
    expect(diagnosticStatistics([]).accuracy).toBeNull();
    expect(
      diagnosticStatistics([{ ...base, correct: false }]).medianCorrectMs,
    ).toBeNull();
    expect(
      diagnosticStatistics([
        base,
        { ...base, responseTimeMs: 2000 },
        { ...base, responseTimeMs: 9000 },
      ]).medianCorrectMs,
    ).toBe(2000);
  });
  it("accumulates monotonic active intervals only and restores without wall time", () => {
    let now = 0;
    const timer = new ActiveTimer({ now: () => now }, 500);
    now = 10000;
    expect(timer.read()).toBe(500);
    timer.resume();
    now += 1200;
    timer.resume();
    expect(timer.pause()).toBe(1700);
    now += 900000;
    expect(timer.read()).toBe(1700);
    timer.resume();
    now += 300;
    expect(timer.pause()).toBe(2000);
    const restored = new ActiveTimer({ now: () => 90000000 }, timer.read());
    expect(restored.read()).toBe(2000);
  });
});
describe("IndexedDB and controller", () => {
  it("starts once across callers and restores order, draft and elapsed checkpoint after reopening", async () => {
    const { db, repo } = repository();
    const [one, two] = await Promise.all([repo.start(), repo.start()]);
    expect(one).toEqual(two);
    const owned = await repo.claim("tab");
    await repo.checkpoint(owned, 1234, "56");
    db.close();
    await db.open();
    expect(await repo.get()).toMatchObject({
      order: one.order,
      cursor: 0,
      activeMs: 1234,
      draft: "56",
    });
  });
  it("atomically saves one attempt and cursor under simultaneous duplicate submits", async () => {
    const { repo } = repository();
    await repo.start();
    const session = await repo.claim("tab");
    const results = await Promise.allSettled([
      repo.submit(session, 0, 2000),
      repo.submit(session, 0, 2000),
    ]);
    expect(results.filter((r) => r.status === "fulfilled")).toHaveLength(1);
    expect(await repo.attempts()).toHaveLength(1);
    expect(await repo.get()).toMatchObject({
      cursor: 1,
      phase: "feedback",
      lastAttempt: { correct: false, answer: 0 },
    });
  });
  it("rolls back attempt insertion when the session update fails", async () => {
    const { db, repo } = repository();
    await repo.start();
    const session = await repo.claim("tab");
    const hook = () => {
      throw new Error("Simulated write failure");
    };
    db.sessions.hook("updating", hook);
    await expect(repo.submit(session, 0, 1000)).rejects.toThrow("Simulated");
    db.sessions.hook("updating").unsubscribe(hook);
    expect(await repo.attempts()).toHaveLength(0);
    expect((await repo.get())?.cursor).toBe(0);
  });
  it("rejects stale owners and stale checkpoint writes after a transition", async () => {
    const { repo } = repository();
    await repo.start();
    const old = await repo.claim("old");
    const current = await repo.claim("new");
    await expect(repo.submit(old, 0, 1)).rejects.toThrow();
    await expect(repo.checkpoint(old, 1, "1")).rejects.toThrow();
    await repo.submit(current, 0, 1);
    await expect(repo.checkpoint(current, 999, "123")).rejects.toThrow();
    expect((await repo.get())?.draft).toBe("");
  });
  it("persists every feedback and part boundary through the entire 144-answer session", async () => {
    const { db, repo } = repository();
    await repo.start();
    let session = await repo.claim("tab");
    for (let i = 0; i < 144; i++) {
      await repo.submit(
        session,
        getFact(session.order[i]!).expectedAnswer,
        1000,
      );
      db.close();
      await db.open();
      expect((await repo.get())?.lastAttempt?.ordinal).toBe(i);
      session = await repo.advance((await repo.get())!);
      if (session.phase === "break") {
        expect((await repo.get())?.cursor).toBe(i + 1);
        session = await repo.advance(session);
      }
    }
    expect(session.phase).toBe("completed");
    expect(await repo.attempts()).toHaveLength(144);
    expect(diagnosticStatistics(await repo.attempts()).accuracy).toBe(1);
  });
  it("controller excludes paused/reload/feedback time, starts on reveal, and guards double submit", async () => {
    const { repo } = repository();
    let now = 0;
    const c = new DiagnosticController(repo, { now: () => now }, "one");
    await c.load();
    await c.start();
    now += 5000;
    c.reveal();
    now += 1200;
    c.setDraft("0");
    await c.pause();
    now += 100000;
    const restored = new DiagnosticController(repo, { now: () => now }, "two");
    await restored.load();
    expect(restored.getSnapshot()).toMatchObject({ paused: true, draft: "0" });
    now += 100000;
    await restored.resume();
    restored.reveal();
    now += 800;
    await Promise.all([restored.submit(), restored.submit()]);
    expect(await repo.attempts()).toHaveLength(1);
    expect((await repo.attempts())[0]?.responseTimeMs).toBe(2000);
    now += 100000;
    await restored.next();
    now += 10000;
    restored.reveal();
    now += 500;
    restored.setDraft("0");
    await restored.submit();
    expect((await repo.attempts())[1]?.responseTimeMs).toBe(500);
  });
  it("stops on storage failure and does not pretend an answer was saved", async () => {
    const { repo } = repository();
    const c = new DiagnosticController(repo, clock, "tab");
    await c.start();
    c.reveal();
    c.setDraft("0");
    vi.spyOn(repo, "submit").mockRejectedValueOnce(new Error("quota"));
    await c.submit();
    expect(c.getSnapshot()).toMatchObject({
      error: true,
      paused: true,
      session: { cursor: 0 },
    });
    expect(await repo.attempts()).toHaveLength(0);
  });
  it("does not steal ownership when an unmounted load finishes after a new view resumes", async () => {
    const { repo } = repository();
    await repo.start();
    let release!: () => void;
    const gate = new Promise<void>((resolve) => {
      release = resolve;
    });
    const get = repo.get.bind(repo);
    vi.spyOn(repo, "get").mockImplementationOnce(() =>
      get().then(async (session) => {
        await gate;
        return session;
      }),
    );
    const old = new DiagnosticController(repo, clock, "old");
    const pending = old.load();
    await old.detach();
    const next = new DiagnosticController(repo, clock, "next");
    await next.load();
    await next.resume();
    release();
    await pending;
    expect((await repo.get())?.owner).toBe("next");
    expect(old.getSnapshot().session).toBeNull();
  });
  it("cancels a pending claim inside the transaction when its view detaches", async () => {
    const { repo } = repository();
    await repo.start();
    const c = new DiagnosticController(repo, clock, "old");
    await c.load();
    let release!: () => void;
    const gate = new Promise<void>((resolve) => {
      release = resolve;
    });
    const claim = repo.claim.bind(repo);
    vi.spyOn(repo, "claim").mockImplementationOnce(async (...args) => {
      await gate;
      return claim(...args);
    });
    const pending = c.resume();
    await c.detach();
    await repo.claim("new");
    release();
    await pending;
    expect((await repo.get())?.owner).toBe("new");
  });
  it("handles strict effect remount and avoids periodic writes during a manual pause", async () => {
    const { repo } = repository();
    const c = new DiagnosticController(repo, clock, "tab");
    c.attach();
    const initial = c.load();
    await c.detach();
    c.attach();
    await c.load();
    await initial;
    await c.start();
    c.reveal();
    await c.pause();
    const checkpoint = vi.spyOn(repo, "checkpoint");
    await c.saveCheckpoint();
    await c.saveCheckpoint();
    expect(checkpoint).not.toHaveBeenCalled();
    await c.resume();
    c.reveal();
    await c.saveCheckpoint();
    expect(checkpoint).toHaveBeenCalledOnce();
  });
  it("cancels a deferred start while covered and ignores its late result after reactivation", async () => {
    const { repo } = repository();
    const controller = new DiagnosticController(repo, clock, "child");
    await controller.load();
    let release!: () => void;
    const delay = new Promise<void>((resolve) => { release = resolve; });
    const start = repo.start.bind(repo);
    vi.spyOn(repo, "start").mockImplementationOnce(async (signal) => {
      await delay;
      return start(signal);
    });
    const pending = controller.start();
    await controller.setActive(false);
    await controller.setActive(true);
    release();
    await pending;
    expect(await repo.get()).toBeUndefined();
    expect(controller.getSnapshot()).toMatchObject({ active: true, busy: false, session: null });
  });
  it("aborts an in-flight answer transaction after its attempt and journal writes", async () => {
    const { db, repo } = repository();
    await repo.start();
    const session = await repo.claim("child");
    const activity = new AbortController();
    const suspend = vi.fn(() => { activity.abort(); });
    db.sessions.hook("updating", suspend);
    try {
      await expect(repo.submit(session, 0, 500, activity.signal)).rejects.toThrow();
    } finally {
      db.sessions.hook("updating").unsubscribe(suspend);
    }
    expect(suspend).toHaveBeenCalledOnce();
    expect(await db.attempts.count()).toBe(0);
    expect(await db.journal.count()).toBe(0);
    expect(await repo.get()).toEqual(session);
  });
  it("only schedules automatic advance for active, unpaused, correctly answered, owned feedback", async () => {
    const { repo } = repository();
    const controller = new DiagnosticController(repo, clock, "child");
    await controller.start();
    const first = controller.getSnapshot().session!;
    controller.reveal();
    controller.setDraft(String(getFact(first.order[0]!).expectedAnswer));
    await controller.submit();
    const feedback = controller.getSnapshot().session!;
    expect(controller.getSnapshot()).toMatchObject({ paused: false, session: { cursor: 1 } });
    expect(controller.canAdvanceAutomatically(feedback)).toBe(true);
    await controller.setActive(false);
    expect(controller.canAdvanceAutomatically(feedback)).toBe(false);
    await controller.advanceCorrectFeedback(feedback);
    expect(await repo.get()).toEqual(feedback);
    await controller.setActive(true);
    expect(controller.canAdvanceAutomatically(feedback)).toBe(false);
    const reopened = controller.getSnapshot().session!;
    expect(controller.canAdvanceAutomatically(reopened)).toBe(true);
    const claim = vi.spyOn(repo, "claim");
    const otherTab = await repo.claim("other-tab");
    claim.mockClear();
    await controller.advanceCorrectFeedback(reopened);
    expect(claim).not.toHaveBeenCalled();
    expect(await repo.get()).toEqual(otherTab);
    await controller.load();
    expect(controller.canAdvanceAutomatically(controller.getSnapshot().session!)).toBe(false);
  });
  it("keeps a manual feedback pause through cover and reveal", async () => {
    const { repo } = repository();
    const controller = new DiagnosticController(repo, clock, "child");
    await controller.start();
    const first = controller.getSnapshot().session!;
    controller.reveal();
    controller.setDraft(String(getFact(first.order[0]!).expectedAnswer));
    await controller.submit();
    await controller.pause();
    await controller.setActive(false);
    await controller.setActive(true);
    const { session, paused } = controller.getSnapshot();
    expect(paused).toBe(true);
    expect(controller.canAdvanceAutomatically(session!)).toBe(false);
    await controller.next();
    expect(controller.getSnapshot()).toMatchObject({ paused: false, session: { cursor: 1, phase: "question" } });
  });
  it("rolls back automatic advance when the view suspends during its transaction", async () => {
    const { db, repo } = repository();
    const controller = new DiagnosticController(repo, clock, "child");
    await controller.start();
    const first = controller.getSnapshot().session!;
    controller.reveal();
    controller.setDraft(String(getFact(first.order[0]!).expectedAnswer));
    await controller.submit();
    const feedback = controller.getSnapshot().session!;
    const suspend = vi.fn(() => { void controller.setActive(false); });
    db.sessions.hook("updating", suspend);
    try {
      await controller.advanceCorrectFeedback(feedback);
    } finally {
      db.sessions.hook("updating").unsubscribe(suspend);
    }
    expect(suspend).toHaveBeenCalledOnce();
    expect(await repo.get()).toEqual(feedback);
    expect(await db.attempts.count()).toBe(1);
    await controller.setActive(true);
    const restored = controller.getSnapshot().session!;
    await controller.advanceCorrectFeedback(restored);
    expect(await repo.get()).toMatchObject({ phase: "question", cursor: 1, activeMs: 0, owner: "child" });
    expect(await db.attempts.count()).toBe(1);
  });
});
