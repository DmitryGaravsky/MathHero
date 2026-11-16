import Dexie from "dexie";
import { afterEach, describe, expect, it, vi } from "vitest";
import { MathHeroDB } from "../src/database/db";
import { LearningRepository } from "../src/database/learningRepository";
import { DiagnosticRepository } from "../src/database/diagnosticRepository";
import { DiagnosticController } from "../src/features/training/DiagnosticController";
import { getFact } from "../src/engine/multiplication/facts";
import {
  createDiagnostic,
  answerDiagnostic,
} from "../src/engine/sessions/diagnostic";
import type { LearningSession } from "../src/engine/learning/session";

const clock = { now: () => Date.parse("2026-11-15T12:00:00Z") };
const random = { next: () => 0.42 };
const databases: MathHeroDB[] = [];
function setup(mode: "adaptive" | "weak" = "adaptive", target?: string) {
  const db = new MathHeroDB(`learning-${crypto.randomUUID()}`);
  databases.push(db);
  return { db, repo: new LearningRepository(db, clock, random, mode, target) };
}
afterEach(async () => {
  await Promise.all(databases.splice(0).map((d) => d.delete()));
});

describe("learning repository and shared session lifecycle", () => {
  it("migrates real v1 stores without touching settings, diagnostic session, or attempts", async () => {
    const name = `v1-${crypto.randomUUID()}`;
    const old = new Dexie(name);
    old.version(1).stores({
      sessions: "id, mode, startedAt",
      attempts:
        "id, sessionId, exerciseId, canonicalId, mode, [sessionId+ordinal]",
      settings: "id",
    });
    const diagnostic = answerDiagnostic(
      createDiagnostic("diagnostic:baseline:v1", clock, random),
      0,
      1234,
      clock,
    );
    const settings = {
      id: "preferences",
      value: {
        language: "ru",
        soundEnabled: false,
        animationsEnabled: false,
        dailyGoalMinutes: 10,
      },
    };
    await old.table("sessions").put(diagnostic.session);
    await old.table("attempts").put(diagnostic.attempt);
    await old.table("settings").put(settings);
    old.close();
    const migrated = new MathHeroDB(name);
    databases.push(migrated);
    await migrated.open();
    expect(migrated.verno).toBe(5);
    expect(await migrated.parentGate.count()).toBe(0);
    expect(await migrated.sessions.get(diagnostic.session.id)).toEqual(
      diagnostic.session,
    );
    expect(await migrated.attempts.toArray()).toEqual([diagnostic.attempt]);
    expect(await migrated.settings.get("preferences")).toEqual(settings);
    expect(await migrated.progress.count()).toBe(0);
    const repo = new LearningRepository(migrated, clock, random);
    await repo.start();
    const session = await repo.claim("owner");
    await repo.submit(session, 0, 1000);
    expect(await migrated.progress.count()).toBe(1);
    expect(await migrated.sessions.get(diagnostic.session.id)).toEqual(
      diagnostic.session,
    );
  });
  it("starts once across separate repositories and separates adaptive, weak, and canonical target streams", async () => {
    const { db, repo } = setup();
    const other = new LearningRepository(db, clock, random);
    const [a, b] = await Promise.all([repo.start(), other.start()]);
    expect(a.id).toBe(b.id);
    const weak = await new LearningRepository(
      db,
      clock,
      random,
      "weak",
    ).start();
    const transposed = new LearningRepository(
      db,
      clock,
      random,
      "weak",
      "mul:8:7",
    );
    const target = await transposed.start();
    const reverse = await new LearningRepository(
      db,
      clock,
      random,
      "weak",
      "mul:7:8",
    ).start();
    expect(new Set([a.id, weak.id, target.id]).size).toBe(3);
    expect(target.id).toBe(reverse.id);
    expect(target.targetPair).toBe("mul:7:8");
    expect(await transposed.claim("targeted-owner", target)).toMatchObject({
      id: reverse.id,
      targetPair: "mul:7:8",
      owner: "targeted-owner",
    });
  });
  it("commits attempt+progress+session once, rejecting stale checkpoints and foreign owners", async () => {
    const { db, repo } = setup();
    await repo.start();
    const stale = await repo.claim("old");
    const owned = await repo.claim("current");
    await expect(repo.submit(stale, 0, 1000)).rejects.toThrow();
    const settled = await Promise.allSettled([
      repo.submit(owned, 0, 1000),
      repo.submit(owned, 0, 1000),
    ]);
    expect(settled.filter((s) => s.status === "fulfilled")).toHaveLength(1);
    expect(await db.attempts.count()).toBe(1);
    expect((await db.progress.toArray())[0]).toMatchObject({
      attempts: 1,
      errors: 1,
      masteredAt: null,
    });
    expect(await repo.get()).toMatchObject({
      cursor: 1,
      phase: "feedback",
      summary: { answered: 1, correct: 0 },
    });
    await expect(repo.checkpoint(owned, 4000, "7")).rejects.toThrow();
  });
  it.each(["progress", "sessions"] as const)(
    "rolls back all three stores on a %s failure",
    async (table) => {
      const { db, repo } = setup();
      await repo.start();
      const session = await repo.claim("one");
      const fail = () => {
        throw new Error("simulated quota failure");
      };
      if (table === "progress") db.progress.hook("creating", fail);
      else db.sessions.hook("updating", fail);
      await expect(repo.submit(session, 0, 1000)).rejects.toThrow("simulated");
      if (table === "progress") db.progress.hook("creating").unsubscribe(fail);
      else db.sessions.hook("updating").unsubscribe(fail);
      expect(await db.attempts.count()).toBe(0);
      expect(await db.progress.count()).toBe(0);
      expect((await repo.get())?.cursor).toBe(0);
    },
  );
  it("restores draft, feedback, pending repeats and summary across reopen, then creates a new immutable session", async () => {
    const { db, repo } = setup();
    await repo.start();
    let session = await repo.claim("one");
    await repo.checkpoint(session, 1234, "12");
    db.close();
    await db.open();
    let restored = new LearningRepository(db, clock, random);
    expect(await restored.get()).toMatchObject({
      activeMs: 1234,
      draft: "12",
      order: session.order,
    });
    session = await restored.claim("two");
    session = await restored.submit(session, 0, 1500);
    db.close();
    await db.open();
    restored = new LearningRepository(db, clock, random);
    expect(await restored.get()).toEqual(session);
    session = await restored.claim("three");
    session = await restored.advance(session);
    const first = getFact(session.order[0]!).canonicalId;
    for (let i = 1; i < 3; i++) {
      session = await restored.submit(
        session,
        getFact(session.order[i]!).expectedAnswer,
        1000,
      );
      session = await restored.advance(session);
    }
    expect(getFact(session.order[3]!).canonicalId).toBe(first);
    const ended = await restored.finish(session);
    expect(ended).toMatchObject({
      phase: "completed",
      endReason: "early",
      summary: { answered: 3, correct: 2 },
    });
    const next = await restored.start();
    expect(next.id).not.toBe(ended.id);
    expect(next.sequence).toBe(2);
    const endNext = await restored.finish(await restored.claim("new"));
    expect(await new LearningRepository(db, clock, random).get()).toEqual(
      endNext,
    );
    expect(await db.sessions.get(ended.id)).toEqual(ended);
    expect(await db.attempts.count()).toBe(3);
  });
  it("finishes all 24 with accurate summaries and keeps diagnosis out of learning progress", async () => {
    const { db, repo } = setup();
    const diagnostic = new DiagnosticRepository(db, clock, random);
    await diagnostic.start();
    await diagnostic.submit(await diagnostic.claim("diag"), 0, 500);
    expect(await db.progress.count()).toBe(0);
    await repo.start();
    let session = await repo.claim("one");
    for (let i = 0; i < 24; i++) {
      session = await repo.submit(
        session,
        i === 0 ? 0 : getFact(session.order[i]!).expectedAnswer,
        i === 0 ? 9000 : 2000,
      );
      session = await repo.advance(session);
    }
    expect(session).toMatchObject({
      cursor: 24,
      phase: "completed",
      endReason: "complete",
      summary: { answered: 24, correct: 23 },
    });
    expect(session.summary.correctTimes).toEqual(Array(23).fill(2000));
    expect(
      (await db.progress.toArray()).reduce((sum, p) => sum + p.attempts, 0),
    ).toBe(24);
    expect(
      (await db.progress.toArray()).every((p) => p.masteredAt === null),
    ).toBe(true);
  });
  it("uses ActiveTimer for learning across paused/reload time, guards double submit and permits early finish from a restored pause", async () => {
    const { db, repo } = setup();
    let now = 0;
    const c = new DiagnosticController<LearningSession>(
      repo,
      { now: () => now },
      "one",
    );
    await c.load();
    await c.start();
    now += 5000;
    c.reveal();
    now += 1200;
    c.setDraft("0");
    await c.pause();
    now += 900000;
    const restored = new DiagnosticController<LearningSession>(
      new LearningRepository(db, clock, random),
      { now: () => now },
      "two",
    );
    await restored.load();
    expect(restored.getSnapshot()).toMatchObject({ paused: true, draft: "0" });
    await restored.resume();
    restored.reveal();
    now += 800;
    await Promise.all([restored.submit(), restored.submit()]);
    expect((await db.attempts.toArray())[0]?.responseTimeMs).toBe(2000);
    await restored.next();
    await restored.pause();
    const afterReload = new DiagnosticController<LearningSession>(
      new LearningRepository(db, clock, random),
      clock,
      "three",
    );
    await afterReload.load();
    await afterReload.finish();
    expect(afterReload.getSnapshot().session).toMatchObject({
      phase: "completed",
      summary: { answered: 1 },
    });
  });
  it("does not steal ownership through a claim that completes after detach", async () => {
    const { repo } = setup();
    await repo.start();
    const c = new DiagnosticController<LearningSession>(repo, clock, "old");
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
});
