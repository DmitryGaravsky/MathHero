import { afterEach, expect, it } from "vitest";
import { exportBackup, parseBackup, restoreBackup } from "../src/database/backup";
import {
  columnTimingGroups, readColumnHistory, readColumnOverview, readColumnSession, readColumnTiming,
} from "../src/database/columnParentRead";
import { MathHeroDB } from "../src/database/db";
import { columnExamples, columnFixture } from "./support/columnFixtures";
import { columnProofBackup, mixedColumnReportBackup, paginatedColumnBackup, reportDate, reportHour } from "./support/columnReportFixtures";
import { replayColumnJournal } from "../src/engine/column/replay";
import type { ColumnJournalEntry, ColumnSession } from "../src/engine/column/session";

const databases: MathHeroDB[] = [];
function database() {
  const db = new MathHeroDB(`column-parent-${crypto.randomUUID()}`);
  databases.push(db);
  return db;
}
afterEach(async () => {
  for (const db of databases.splice(0)) await db.delete();
});

it("counts each checked example once, keeps help and notes distinct and reads both operations without writes", async () => {
  const db = database();
  const backup = mixedColumnReportBackup();
  await restoreBackup(parseBackup(JSON.stringify(backup)), true, db);
  const before = await exportBackup(db, backup.exportedAt);
  expect(before.tables.attempts).toHaveLength(1);
  expect(before.tables.attempts[0]).toMatchObject({ operation: "multiplication", correct: true, responseTimeMs: 3200 });

  const addition = await readColumnOverview("addition", db);
  expect(addition.skills).toHaveLength(4);
  expect(addition.results).toEqual({
    presented: 6, firstChecks: 5, firstCorrect: 2, firstAccuracy: 0.4,
    independent: 1, corrected: 1, solved: 3, helped: 4, skipped: 2, unchecked: 1, unfinished: 1,
  });
  const subtraction = await readColumnOverview("subtraction", db);
  expect(subtraction.skills).toHaveLength(5);
  expect(subtraction.results).toEqual({
    presented: 3, firstChecks: 2, firstCorrect: 2, firstAccuracy: 1,
    independent: 2, corrected: 0, solved: 2, helped: 0, skipped: 0, unchecked: 1, unfinished: 1,
  });
  expect(await readColumnTiming("addition", db)).toEqual([expect.objectContaining({ count: 1, medianMs: 1800 })]);
  expect((await readColumnTiming("subtraction", db)).reduce((sum, group) => sum + group.count, 0)).toBe(2);

  const mixed = (await readColumnSession("addition-mixed", db))!;
  expect(mixed.activeMs).toBe(7450);
  expect(mixed.examples.map(({ checks, hintAt, skipped, activeMs }) => [checks.length, hintAt !== null, skipped, activeMs])).toEqual([
    [2, true, false, 2300], [1, true, false, 1300], [1, true, true, 700],
    [0, false, true, 550], [1, false, false, 1800], [1, true, false, 800],
  ]);
  expect(mixed.examples[0]!.checks.map(({ correct, independent, hintShown }) => [correct, independent, hintShown]))
    .toEqual([[false, false, false], [true, false, true]]);
  expect(mixed.examples[1]!.checks[0]).toMatchObject({ correct: true, independent: false, hintShown: true });
  expect(mixed.examples[2]!.checks[0]!.hintShown).toBe(false);
  expect(mixed.examples[4]!.checks[0]).toMatchObject({ input: { marks: [false, true, false, false] }, independent: true });
  expect(mixed.examples[5]!.checks[0]!.hintShown).toBe(false);
  expect((await readColumnSession("subtraction-open", db))!.examples[0]).toMatchObject({
    activeMs: 1600, checks: [], lastInput: { digits: [7, 1, null, null], marks: [false, true, true, false], activePlace: 2 },
  });
  expect(await readColumnSession("missing", db)).toBeNull();
  expect(await exportBackup(db, backup.exportedAt)).toEqual(before);
});

it("exposes current proof dates and an exact historical proof after helped regression", async () => {
  const db = database();
  const view = async () => (await readColumnOverview("addition", db)).skills.find(({ skill }) => skill === "no-carry");
  await restoreBackup(columnProofBackup({ regress: false }), true, db);
  const expectedProof = {
    supportDays: ["2026-10-01", "2026-10-02"], lastPracticeDay: "2026-10-03",
    reviewedDay: "2026-10-04", gapMs: 25 * reportHour,
  };
  expect(await view()).toMatchObject({ proof: expectedProof, recent: 4, misses: 0, recurring: false });
  await restoreBackup(columnProofBackup(), true, db);
  expect(await view()).toMatchObject({ proof: null, supportDays: [], recent: 4, misses: 2, recurring: true });
  const verified = (await readColumnSession("verified", db))!;
  expect([...verified.proofs.values()]).toEqual([expectedProof]);
  for (const id of ["same-day", "too-soon", "helped-review", "too-soon-after-verification", "regression"]) {
    const history = (await readColumnSession(id, db))!;
    const example = history.examples.find(({ selection }) => selection.skill === "no-carry");
    if (id === "helped-review" || id === "regression") {
      expect(example?.selection.review).not.toBeNull();
      expect(example?.checks[0]!.hintShown).toBe(true);
    } else expect(example?.selection.review).toBeNull();
    expect(history.proofs.size).toBe(0);
  }
});

it("orders and filters by commit sequence, pages within one operation, and preserves an honest empty state", async () => {
  const db = database();
  expect((await readColumnOverview("addition", db)).results).toMatchObject({
    firstAccuracy: null, presented: 0, unchecked: 0, unfinished: 0,
  });
  expect(await readColumnTiming("addition", db)).toEqual([]);
  await restoreBackup(paginatedColumnBackup(), true, db);
  const first = await readColumnHistory("addition", "all", Infinity, db);
  expect(first.sessions.map(({ id }) => id)).toEqual([9, 8, 7, 6, 5, 4, 3, 2].map((i) => `addition-${i}`));
  const next = await readColumnHistory("addition", "early", first.older!, db);
  expect(next.sessions.map(({ id }) => id)).toEqual(["addition-1", "addition-0"]);
  expect(next.older).toBeNull();
  expect((await readColumnHistory("addition", "open", Infinity, db)).sessions).toEqual([]);
  expect((await readColumnHistory("subtraction", "open", Infinity, db)).sessions.map(({ id }) => id)).toEqual(["subtraction"]);
  expect((await readColumnOverview("addition", db)).results).toMatchObject({
    firstAccuracy: null, presented: 10, unchecked: 10, unfinished: 10,
  });
});

it("separates identical borrow positions with different result lengths using the issued operands", () => {
  const cases = [columnExamples[2], columnExamples[3]] as const;
  const sessions = new Map<string, ColumnSession>();
  const checks = cases.flatMap((sample) => {
    const { columnJournal } = columnFixture(sample).tables;
    const entries = columnJournal.map((entry) => ({ ...entry, sessionId: `${entry.sessionId}-${sample.top}` }));
    const last = entries.at(-1)!;
    const digits = [...sample.answer].reverse().map(Number);
    const check = {
      type: "check", sequence: last.sequence + 1, sessionId: last.sessionId, at: last.at,
      activeMs: sample.top === 604 ? 2300 : 1200,
      input: { digits: [digits[0]!, digits[1] ?? null, digits[2] ?? null, null], marks: [true, true, false, false], activePlace: 2 },
    } satisfies ColumnJournalEntry;
    const replay = replayColumnJournal([...entries, check]);
    sessions.set(last.sessionId, replay.sessions.get(last.sessionId)!);
    return replay.attempts;
  });
  const timings = columnTimingGroups(checks, sessions);
  expect(timings).toMatchObject([
    { operation: "subtraction", places: [1, 2], throughZero: true, resultDigits: 1, count: 1, medianMs: 1200 },
    { operation: "subtraction", places: [1, 2], throughZero: true, resultDigits: 3, count: 1, medianMs: 2300 },
  ]);
});

it("counts a solved example at open feedback, before advance commits", async () => {
  const db = database();
  const backup = mixedColumnReportBackup();
  const journal = backup.tables.columnJournal.slice(0, -4);
  const replay = replayColumnJournal(journal);
  const session = replay.sessions.get("subtraction-early")!;
  expect(session.draft?.phase).toBe("correct");
  await restoreBackup({
    ...backup, exportedAt: reportDate,
    tables: {
      ...backup.tables, columnJournal: journal, columnSessions: [...replay.sessions.values()],
      columnAttempts: replay.attempts, columnProgress: [...replay.progress.addition.values(), ...replay.progress.subtraction.values()],
    },
  }, true, db);
  expect((await readColumnOverview("subtraction", db)).results).toMatchObject({ presented: 1, solved: 1, unfinished: 0 });
  expect((await readColumnHistory("subtraction", "open", Infinity, db)).sessions).toHaveLength(1);
  expect(await readColumnSession(session.id, db)).toMatchObject({ activeMs: 3250 });
});
