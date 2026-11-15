import Dexie from "dexie";
import { afterEach, describe, expect, it, vi } from "vitest";
import { MathHeroDB } from "../src/database/db";
import {
  exportBackup,
  parseBackup,
  restoreBackup,
  validateBackup,
  type Backup,
} from "../src/database/backup";
import { LearningRepository } from "../src/database/learningRepository";
import { DiagnosticRepository } from "../src/database/diagnosticRepository";
import { recordRewards } from "../src/database/rewards";
import {
  replayLearning,
  type JournalEntry,
} from "../src/engine/learning/rewards";
import {
  createLearning,
  answerLearning,
  advanceLearning,
  type Session,
  type LearningSession,
} from "../src/engine/learning/session";
import {
  DAY_MS,
  learningPolicy,
  type PairProgress,
} from "../src/engine/learning/progress";
import {
  getFact,
  multiplicationFacts,
} from "../src/engine/multiplication/facts";
import type { Attempt } from "../src/engine/sessions/diagnostic";
import { directionStatus, statistics } from "../src/engine/learning/analytics";

const start = Date.parse("2026-01-01T12:00:00Z");
const random = { next: () => 0.42 };
const databases: MathHeroDB[] = [];
function database() {
  const db = new MathHeroDB(`backup-${crypto.randomUUID()}`);
  databases.push(db);
  return db;
}
afterEach(async () => {
  vi.restoreAllMocks();
  await Promise.all(databases.splice(0).map((d) => d.delete()));
});
function fixture(
  days = [0, 1, 2, 5, 12],
  facts = ["mul:7:8", "mul:8:7"],
  failDay = -1,
) {
  const sessions: Session[] = [];
  const attempts: Attempt[] = [];
  const journal: JournalEntry[] = [];
  const progress = new Map<string, PairProgress>();
  for (const [index, day] of days.entries()) {
    const clock = { now: () => start + day * DAY_MS };
    let s = createLearning(
      `learning:${index}`,
      "adaptive",
      [],
      [],
      clock,
      random,
      undefined,
      { ...learningPolicy, timeZone: "UTC" },
    );
    s.sequence = index + 1;
    for (const id of facts) {
      s = {
        ...s,
        phase: "question",
        order: [...s.order.slice(0, s.cursor), id],
      };
      const f = getFact(id);
      const result = answerLearning(
        s,
        day === failDay ? 0 : f.expectedAnswer,
        1800,
        progress.get(f.canonicalId),
        clock,
      );
      s = result.session;
      progress.set(f.canonicalId, result.progress);
      attempts.push(result.attempt);
      journal.push({ id: result.attempt.id, sequence: journal.length + 1 });
    }
    sessions.push({
      ...s,
      phase: "completed",
      completedAt: clock.now(),
      endReason: "early",
    });
  }
  const replay = replayLearning(sessions, attempts, journal);
  return {
    format: "math-hero-backup",
    version: 1,
    databaseVersion: 3,
    exportedAt: start + 100 * DAY_MS,
    tables: {
      sessions,
      attempts,
      journal,
      progress: [...progress.values()],
      rewards: replay.rewards,
      rewardState: [replay.state],
      settings: [],
    },
  } satisfies Backup;
}

describe("reward contracts and progress analytics", () => {
  it("awards each due retention cycle, never early repeats or re-mastery", () => {
    const data = fixture([0, 1, 2, 3, 4, 5, 6, 7, 8, 15, 16, 30, 60]);
    validateBackup(data);
    const mastery = data.tables.rewards.filter((r) => r.kind === "mastery");
    const retention = data.tables.rewards.filter((r) => r.kind === "retention");
    expect(mastery).toHaveLength(1);
    expect(mastery[0]!.stars).toBe(3);
    expect(retention.length).toBeGreaterThanOrEqual(2);
    expect(
      retention.every((r) => r.stars === 5 && r.id.split(":").length === 5),
    ).toBe(true);
    expect(new Set(retention.map((r) => r.id)).size).toBe(retention.length);
    const reacquired = fixture([0, 1, 2, 3, 10, 11, 12, 13], undefined, 3);
    expect(
      reacquired.tables.rewards.filter((r) => r.kind === "mastery"),
    ).toHaveLength(1);
    expect(
      reacquired.tables.rewards.some(
        (r) => r.kind === "retention" && r.at === start + 12 * DAY_MS,
      ),
    ).toBe(false);
  });
  it("requires seven practice days and distinguishes 144 directions from 78 pairs", () => {
    expect(
      fixture([0, 0, 0, 0, 0, 0, 6]).tables.rewards.some(
        (r) => r.achievement === "week",
      ),
    ).toBe(false);
    expect(
      fixture([0, 1, 2, 3, 4, 5, 6]).tables.rewards.some(
        (r) => r.achievement === "week",
      ),
    ).toBe(true);
    // Six separate recalls over three days, including both directions, for all pairs.
    const sessions: Session[] = [];
    const attempts: Attempt[] = [];
    const journal: JournalEntry[] = [];
    const progress = new Map<string, PairProgress>();
    for (let day = 0; day < 3; day++)
      for (let block = 0; block < 12; block++) {
        const clock = { now: () => start + day * DAY_MS };
        let s = createLearning(
          `learning:${day}-${block}`,
          "adaptive",
          [],
          [],
          clock,
          random,
          undefined,
          { ...learningPolicy, timeZone: "UTC" },
        );
        s.sequence = day * 12 + block + 1;
        for (let n = 0; n < 24; n++) {
          const f = multiplicationFacts[(block * 12 + (n % 12)) % 144]!;
          s = {
            ...s,
            phase: "question",
            order: [...s.order.slice(0, s.cursor), f.id],
          };
          const r = answerLearning(
            s,
            f.expectedAnswer,
            1800,
            progress.get(f.canonicalId),
            clock,
          );
          s = r.session;
          progress.set(f.canonicalId, r.progress);
          attempts.push(r.attempt);
          journal.push({ id: r.attempt.id, sequence: journal.length + 1 });
        }
        sessions.push({ ...s, phase: "completed" });
      }
    const result = replayLearning(sessions, attempts, journal);
    expect(result.progress.filter((p) => p.masteredAt !== null)).toHaveLength(
      78,
    );
    expect(
      result.rewards
        .filter((r) => r.kind === "achievement")
        .map((r) => r.achievement),
    ).toEqual(
      expect.arrayContaining([
        "first10",
        "master25",
        "master50",
        "master100",
        "all",
      ]),
    );
  });
  it("computes correct-only speed and leaves an untested reverse unknown", () => {
    const data = fixture([0], ["mul:7:8"]);
    const a = data.tables.attempts[0]!;
    expect(
      statistics([a, { ...a, correct: false, responseTimeMs: 999999 }]),
    ).toEqual({
      answered: 2,
      correct: 1,
      accuracy: 0.5,
      meanCorrectMs: 1800,
      medianCorrectMs: 1800,
    });
    expect(
      directionStatus(
        "mul:8:7",
        data.tables.attempts,
        data.tables.progress,
        start,
      ),
    ).toBe("unknown");
    expect(
      directionStatus(a.exerciseId, [{ ...a, mode: "diagnostic" }], [], start),
    ).toBe("fluent");
    expect(
      directionStatus(a.exerciseId, [{ ...a, correct: false }], [], start),
    ).toBe("difficult");
    expect(
      directionStatus(
        a.exerciseId,
        [{ ...a, responseTimeMs: 6000 }],
        [],
        start,
      ),
    ).toBe("developing");
    const mastered = fixture();
    expect(
      directionStatus(
        a.exerciseId,
        mastered.tables.attempts,
        mastered.tables.progress,
        start + 12 * DAY_MS,
      ),
    ).toBe("stable");
  });
  it("increments stars transactionally, handles duplicate submits, and gives no empty/diagnostic rewards", async () => {
    const db = database();
    const clock = { now: () => start };
    const repo = new LearningRepository(db, clock, random);
    await repo.start();
    let s = await repo.claim("owner");
    await repo.finish(s);
    expect(await db.rewards.count()).toBe(0);
    await repo.start();
    s = await repo.claim("owner");
    for (let i = 0; i < 10; i++) {
      const old = s;
      s = await repo.submit(
        s,
        getFact(s.order[s.cursor]!).expectedAnswer,
        1000,
      );
      await expect(repo.submit(old, 0, 1000)).rejects.toThrow();
      if (i < 9) s = await repo.advance(s);
    }
    await repo.finish(s);
    expect((await db.rewards.toArray()).reduce((n, r) => n + r.stars, 0)).toBe(
      14,
    );
    expect(await db.rewards.get("achievement:first10")).toBeDefined();
    const diag = new DiagnosticRepository(db, clock, random);
    await diag.start();
    const d = await diag.claim("diag");
    await diag.submit(d, getFact(d.order[0]!).expectedAnswer, 1000);
    expect((await db.rewards.toArray()).reduce((n, r) => n + r.stars, 0)).toBe(
      14,
    );
    validateBackup(await exportBackup(db));
  });
});

describe("transactional versioned backups", () => {
  it("keeps incremental mastery and review-cycle rewards identical to replay across restores", async () => {
    const db = database();
    await restoreBackup(fixture([0, 1]), true, db);
    let time = start + 2 * DAY_MS;
    const clock = { now: () => time };
    async function recall() {
      const repo = new LearningRepository(db, clock, random, "weak", "mul:7:8");
      await repo.start();
      const s = await repo.claim(crypto.randomUUID());
      const answered = await repo.submit(s, 56, 1800);
      await repo.finish(answered);
      return exportBackup(db, time);
    }
    let backup = await recall();
    expect(
      backup.tables.rewards.filter((r) => r.kind === "mastery"),
    ).toHaveLength(1);
    expect(
      backup.tables.rewards.filter((r) => r.kind === "retention"),
    ).toHaveLength(0);
    const due = backup.tables.progress[0]!.nextReviewAt;
    time = due - DAY_MS;
    backup = await recall();
    expect(
      backup.tables.rewards.filter((r) => r.kind === "retention"),
    ).toHaveLength(0);
    time = due;
    backup = await recall();
    expect(
      backup.tables.rewards.filter((r) => r.kind === "retention"),
    ).toHaveLength(1);
    await restoreBackup(backup, true, db);
    await restoreBackup(backup, true, db);
    backup = await recall();
    expect(
      backup.tables.rewards.filter((r) => r.kind === "retention"),
    ).toHaveLength(1);
    time = backup.tables.progress[0]!.nextReviewAt;
    backup = await recall();
    expect(
      backup.tables.rewards.filter((r) => r.kind === "retention"),
    ).toHaveLength(2);
    expect(
      backup.tables.rewards.filter((r) => r.kind === "mastery"),
    ).toHaveLength(1);
  });
  it("round trips all tables, cancels unchanged, restores a draft and resumes without duplicate rewards", async () => {
    const db = database();
    const repo = new LearningRepository(db, { now: () => start }, random);
    await repo.start();
    let s = await repo.claim("owner");
    s = await repo.submit(s, getFact(s.order[0]!).expectedAnswer, 1800);
    s = await repo.advance(s);
    await repo.checkpoint(s, 1400, "42");
    const before = await exportBackup(db, start);
    expect(parseBackup(JSON.stringify(before))).toEqual(before);
    expect(await restoreBackup(fixture(), false, db)).toBe(false);
    expect(await exportBackup(db, start)).toEqual(before);
    await restoreBackup(before, true, db);
    await restoreBackup(before, true, db);
    const resumed = new LearningRepository(db, { now: () => start }, random);
    const stored = await resumed.get();
    expect(stored?.draft).toBe("42");
    expect(stored?.activeMs).toBe(1400);
    expect(stored?.owner).toBeNull();
    await expect(repo.submit(s, 42, 1400)).rejects.toThrow();
    const claimed = await resumed.claim("new");
    await resumed.submit(
      claimed,
      getFact(claimed.order[claimed.cursor]!).expectedAnswer,
      2000,
    );
    expect(await db.attempts.count()).toBe(2);
    expect((await db.rewards.toArray()).reduce((n, r) => n + r.stars, 0)).toBe(
      2,
    );
    validateBackup(await exportBackup(db));
  });
  it("rejects corrupted fields, foreign versions, broken references and forged aggregates before replacement", async () => {
    const good = fixture();
    validateBackup(good);
    const db = database();
    await restoreBackup(good, true, db);
    const mutations: ((b: Backup) => void)[] = [
      (b) => {
        b.version = 2 as 1;
      },
      (b) => {
        b.databaseVersion = 2 as 3;
      },
      (b) => {
        b.format = "foreign" as Backup["format"];
      },
      (b) => {
        b.tables.attempts[0]!.responseTimeMs = Infinity;
      },
      (b) => {
        b.tables.attempts[0]!.answer = "56" as unknown as number;
      },
      (b) => {
        b.tables.attempts[0]!.sessionId = "missing";
      },
      (b) => {
        b.tables.attempts[0]!.correct = false;
      },
      (b) => {
        b.tables.attempts.push(b.tables.attempts[0]!);
      },
      (b) => {
        b.tables.journal[0]!.sequence = 2;
      },
      (b) => {
        b.tables.progress[0]!.correct = 999;
      },
      (b) => {
        b.tables.rewards[0]!.stars = 999;
      },
      (b) => {
        b.tables.rewards = [];
      },
      (b) => {
        b.tables.rewardState[0]!.correct = 999;
      },
      (b) => {
        b.tables.sessions[0]!.cursor = 20;
      },
      (b) => {
        (b.tables.sessions[0] as LearningSession).summary.correct = 999;
      },
      (b) => {
        (b.tables.sessions[0] as LearningSession).policy.fastMs = 99999;
      },
      (b) => {
        b.tables.sessions[0]!.schemaVersion = 9 as 1;
      },
      (b) => {
        (b.tables.sessions[0] as LearningSession).repeats = [
          { canonicalId: "mul:1:1", due: 9, reason: "error" },
        ];
      },
    ];
    const before = await exportBackup(db, start);
    for (const mutate of mutations) {
      const bad = structuredClone(good);
      mutate(bad);
      await expect(restoreBackup(bad, true, db)).rejects.toThrow();
      expect(await exportBackup(db, start)).toEqual(before);
    }
    expect(() => parseBackup("{broken")).toThrow();
    expect(() => parseBackup('{"__proto__":{}}')).toThrow();
  });
  it("rolls back all tables if replacement or ledger insertion fails", async () => {
    const db = database();
    await restoreBackup(fixture(), true, db);
    const pin = { id: "parent", version: 1, salt: new Uint8Array(16), hash: new Uint8Array(32) } as const;
    await db.parentGate.put(pin);
    const beforePin = await db.parentGate.get("parent");
    const before = await exportBackup(db, start);
    const legacy = fixture([0]);
    const replacement: Backup = { ...legacy, version: 2, databaseVersion: 4 };
    const spy = vi
      .spyOn(db.rewards, "bulkAdd")
      .mockRejectedValueOnce(new Error("disk failure"));
    await expect(restoreBackup(replacement, true, db)).rejects.toThrow();
    spy.mockRestore();
    expect(await exportBackup(db, start)).toEqual(before);
    expect(await db.parentGate.get("parent")).toEqual(beforePin);
    const repo = new LearningRepository(
      db,
      { now: () => start + 100 * DAY_MS },
      random,
    );
    await repo.start();
    const s = await repo.claim("owner");
    const snapshot = await exportBackup(db, start);
    vi.spyOn(db.rewards, "add").mockRejectedValueOnce(
      new Error("ledger failure"),
    );
    await expect(
      repo.submit(s, getFact(s.order[0]!).expectedAnswer, 1000),
    ).rejects.toThrow();
    expect(await exportBackup(db, start)).toEqual(snapshot);
  });
  it("migrates v2 equal timestamps using sequence and normalizes ambiguous cross-stream derivatives", async () => {
    const oldData = fixture([0, 0], ["mul:7:8"], 0);
    // Lexicographic IDs conflict with actual sequence; source attempts must survive byte-for-byte.
    const replacements = new Map([
      ["learning:0", "learning:z"],
      ["learning:1", "learning:a"],
    ]);
    for (const s of oldData.tables.sessions) {
      s.id = replacements.get(s.id)!;
      if (s.lastAttempt) {
        s.lastAttempt = { ...s.lastAttempt, sessionId: s.id, id: `${s.id}:0` };
      }
    }
    for (const a of oldData.tables.attempts) {
      a.sessionId = replacements.get(a.sessionId)!;
      a.id = `${a.sessionId}:0`;
    }
    oldData.tables.attempts[0]!.answer = 56;
    oldData.tables.attempts[0]!.correct = true;
    oldData.tables.sessions[0]!.lastAttempt = {
      ...oldData.tables.attempts[0]!,
    };
    const name = `legacy-${crypto.randomUUID()}`;
    const old = new Dexie(name);
    old.version(2).stores({
      sessions: "id, mode, startedAt",
      attempts:
        "id, sessionId, exerciseId, canonicalId, mode, [sessionId+ordinal]",
      settings: "id",
      progress: "canonicalId, nextReviewAt, masteredAt",
    });
    await old.table("sessions").bulkPut(oldData.tables.sessions);
    await old.table("attempts").bulkPut(oldData.tables.attempts);
    await old.table("progress").bulkPut(oldData.tables.progress);
    old.close();
    const db = new MathHeroDB(name);
    databases.push(db);
    await db.open();
    expect(
      (await db.journal.orderBy("sequence").toArray()).map((e) => e.id),
    ).toEqual(["learning:z:0", "learning:a:0"]);
    expect(await db.attempts.toArray()).toEqual(
      [...oldData.tables.attempts].sort((a, b) => a.id.localeCompare(b.id)),
    );
    validateBackup(await exportBackup(db));
    expect(
      (await db.progress.toArray())[0]!.recent.map((e) => e.correct),
    ).toEqual([true, false]);
  });
  it("handles 90×24 historical answers with bounded incremental reward reads and exact replay parity", async () => {
    const sessions: Session[] = [];
    const attempts: Attempt[] = [];
    const journal: JournalEntry[] = [];
    let progress: PairProgress[] = [];
    let time = start;
    const clock = { now: () => time };
    for (let day = 0; day < 90; day++) {
      time = start + day * DAY_MS;
      let s = createLearning(
        `learning:history-${day}`,
        "adaptive",
        progress,
        [],
        clock,
        random,
      );
      s.sequence = day + 1;
      for (let n = 0; n < 24; n++) {
        const fact = getFact(s.order[s.cursor]!);
        const r = answerLearning(
          s,
          fact.expectedAnswer,
          1800,
          progress.find((p) => p.canonicalId === fact.canonicalId),
          clock,
        );
        progress = [
          ...progress.filter((p) => p.canonicalId !== fact.canonicalId),
          r.progress,
        ];
        attempts.push(r.attempt);
        journal.push({ id: r.attempt.id, sequence: journal.length + 1 });
        s = advanceLearning(r.session, progress, [], clock, random);
      }
      sessions.push(s);
    }
    const replay = replayLearning(sessions, attempts, journal);
    const db = database();
    await restoreBackup(
      {
        format: "math-hero-backup",
        version: 1,
        databaseVersion: 3,
        exportedAt: time,
        tables: {
          sessions,
          attempts,
          journal,
          progress,
          rewards: replay.rewards,
          rewardState: [replay.state],
          settings: [],
        },
      },
      true,
      db,
    );
    time += DAY_MS;
    const repo = new LearningRepository(db, clock, random);
    await repo.start();
    let s = await repo.claim("owner");
    const noHistory = vi.spyOn(db.attempts, "toArray");
    const noSessions = vi.spyOn(db.sessions, "toArray");
    const begun = performance.now();
    s = await repo.submit(s, getFact(s.order[0]!).expectedAnswer, 1800);
    expect(noHistory).not.toHaveBeenCalled();
    expect(noSessions).not.toHaveBeenCalled();
    console.info(
      "INCREMENTAL_AFTER_2160_MS",
      Math.round(performance.now() - begun),
    );
    noHistory.mockRestore();
    noSessions.mockRestore();
    validateBackup(await exportBackup(db));
    // Direct re-entry would fail the journal uniqueness constraint and roll back all changes.
    await expect(
      db.transaction("rw", db.tables, () =>
        recordRewards(db, s.lastAttempt!, s, undefined, progress[0]!),
      ),
    ).rejects.toThrow();
  }, 120000);
});
