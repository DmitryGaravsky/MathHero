import { afterEach, expect, it, vi } from "vitest";
import { exportBackup, parseBackup, restoreBackup, type FullBackup, type LegacyBackup } from "../src/database/backup";
import { ColumnRepository, StaleColumnSessionError, columnTables, type ColumnSnapshot } from "../src/database/columnRepository";
import { ColumnSeen } from "../src/database/columnSeen";
import { MathHeroDB } from "../src/database/db";
import { columnWork, operandPairId, type ColumnOperation } from "../src/engine/column/arithmetic";
import { columnInput, editColumnDraft, newColumnDraft, type ColumnInput } from "../src/engine/column/draft";
import { replayColumnJournal } from "../src/engine/column/replay";

const start = Date.UTC(2026, 9, 1, 12);
const day = 86_400_000;
const databases: MathHeroDB[] = [];

afterEach(async () => {
  for (const db of databases.splice(0)) await db.delete();
});

function setup() {
  const db = new MathHeroDB(`column-tests-${crypto.randomUUID()}`);
  databases.push(db);
  let at = start;
  let next = 0;
  const repository = new ColumnRepository(db, { now: () => at }, { next: () => 42 / 2 ** 32 },
    () => String(++next), () => "Europe/Paris");
  return { db, repository, time: (value: number) => { at = value; } };
}

function open(repo: ColumnRepository, operation: ColumnOperation, owner: string = operation) {
  return repo.readOpen(operation).then((state) => repo.claim(operation, state, owner));
}

function input(snapshot: ColumnSnapshot, value?: number): ColumnInput {
  const { exercise } = snapshot.session.order.at(-1)!;
  let draft = newColumnDraft();
  for (const digit of String(value ?? columnWork(exercise).answer).split("").reverse()) {
    draft = editColumnDraft(exercise.operation, draft, { type: "digit", digit: Number(digit) });
  }
  return columnInput(editColumnDraft(exercise.operation, draft, { type: "toggle-mark", place: 1 }));
}

function captured(snapshot: ColumnSnapshot) {
  return { input: columnInput(snapshot.session.draft!), activeMs: snapshot.session.activeMs };
}

function columnRows(db: MathHeroDB) {
  return Promise.all(columnTables(db).map((table) => table.toArray()));
}

it("claims exactly one open session per operation across connections and resumes the complete draft", async () => {
  const { db, repository } = setup();
  const otherDB = new MathHeroDB(db.name);
  const other = new ColumnRepository(otherDB);
  try {
    const [observation, competing, subtraction] = await Promise.all([
      repository.readOpen("addition"), other.readOpen("addition"), other.readOpen("subtraction"),
    ]);
    const results = await Promise.allSettled([
      repository.claim("addition", observation, "first"),
      other.claim("addition", competing, "second"),
      other.claim("subtraction", subtraction, "subtract"),
    ]);
    expect(results.filter(({ status }) => status === "fulfilled")).toHaveLength(2);
    expect(results.find((r) => r.status === "rejected")).toMatchObject({ reason: expect.any(StaleColumnSessionError) });
    const initial = (await repository.readOpen("addition")).open!;
    const oldSubtraction = (await repository.readOpen("subtraction")).open!;
    const marked = input(initial, 233);
    const hinted = await repository.act(initial.token, { type: "hint", input: marked, activeMs: 750 });
    const current = await other.checkpoint(hinted.token, marked, 1500);
    await expect(repository.checkpoint(hinted.token, marked, 1600)).rejects.toBeInstanceOf(StaleColumnSessionError);
    await expect(repository.checkpoint(current.token, marked, 1499)).rejects.toThrow("elapsed time");
    await expect(repository.claim("addition", observation, "old")).rejects.toBeInstanceOf(StaleColumnSessionError);
    const paused = await other.release(current.token, { input: marked, activeMs: 1600 });
    expect(paused.token).toMatchObject({ owner: null, revision: current.token.revision + 1 });
    expect(paused.session).toMatchObject({ draft: { ...marked, phase: "answering", hintShown: true }, activeMs: 1600 });
    const resumed = await open(repository, "addition", "resumed");
    expect(resumed.session).toEqual(paused.session);
    expect((await other.readOpen("subtraction")).open).toEqual(oldSubtraction);
    await expect(other.release(current.token)).rejects.toBeInstanceOf(StaleColumnSessionError);
    expect(await db.columnJournal.orderBy("sequence").primaryKeys()).toEqual([1, 2, 3]);
  } finally {
    otherDB.close();
  }
});

it("commits attempts once and rejects duplicate submits, duplicate advances and stale feedback timers", async () => {
  const { db, repository } = setup();
  const first = await open(repository, "addition");
  const seenRead = vi.spyOn(db.columnSeen, "get");
  const scan = vi.spyOn(db.columnJournal, "toArray");
  const attemptScan = vi.spyOn(db.columnAttempts, "toArray");
  const sessionScan = vi.spyOn(db.columnSessions, "toArray");
  const cmd = { type: "check", input: input(first), activeMs: 1020 } as const;
  const [a, b] = await Promise.allSettled([repository.act(first.token, cmd), repository.act(first.token, cmd)]);
  const fulfilled = [a, b].find((r) => r.status === "fulfilled");
  expect(fulfilled?.status).toBe("fulfilled");
  expect([a, b].find((r) => r.status === "rejected")).toMatchObject({ reason: expect.any(StaleColumnSessionError) });
  if (!fulfilled) throw new Error("Missing check");
  const solved = fulfilled.value;
  expect(await db.columnAttempts.get(`${first.session.id}:0:1`)).toMatchObject({ correct: true, independent: true, activeMs: 1020 });
  expect(seenRead).not.toHaveBeenCalled();
  const paused = await repository.release(solved.token);
  expect(paused.session.draft?.phase).toBe("correct");
  await expect(repository.act(solved.token, { type: "advance" })).rejects.toBeInstanceOf(StaleColumnSessionError);
  const resumed = await open(repository, "addition");
  await expect(repository.act(solved.token, { type: "advance" })).rejects.toBeInstanceOf(StaleColumnSessionError);
  const advanced = await repository.act(resumed.token, { type: "advance" });
  await expect(repository.act(resumed.token, { type: "advance" })).rejects.toBeInstanceOf(StaleColumnSessionError);
  expect(advanced.session.order).toHaveLength(2);
  expect(advanced.session.activeMs).toBe(0);
  expect(advanced.session.draft).toEqual(newColumnDraft());
  expect(await db.columnAttempts.count()).toBe(1);
  expect(seenRead).toHaveBeenCalledTimes(1);
  expect(scan).not.toHaveBeenCalled();
  expect(attemptScan).not.toHaveBeenCalled();
  expect(sessionScan).not.toHaveBeenCalled();
});

it("keeps incorrect feedback, hint exposure and retry accounting across ownership changes", async () => {
  const { db, repository, time } = setup();
  const started = await open(repository, "subtraction");
  const right = columnWork(started.session.order[0]!.exercise).answer;
  time(start - 1000);
  const wrong = await repository.act(started.token, { type: "check", input: input(started, right === 0 ? 1 : 0), activeMs: 300 });
  const hinted = await repository.act(wrong.token, { type: "hint", ...captured(wrong) });
  await repository.release(hinted.token);
  const resumed = await open(repository, "subtraction", "other");
  expect(resumed.session).toEqual(hinted.session);
  const retry = await repository.act(resumed.token, { type: "retry" });
  const correct = await repository.act(retry.token, { type: "check", input: input(retry), activeMs: 800 });
  expect(correct.session.summary).toEqual({ checked: 1, firstCorrect: 0, independent: 0, solved: 1, skipped: 0 });
  const [first, second] = await db.columnAttempts.orderBy("sequence").toArray();
  expect(first).toMatchObject({ correct: false, hintShown: false, at: start - 1000, effectiveAt: start });
  expect(second).toMatchObject({ correct: true, hintShown: true, checkNumber: 2, independent: false });
  const finished = await repository.act(correct.token, { type: "finish", ...captured(correct) });
  expect(finished.session.end?.reason).toBe("early");
  expect((await repository.readOpen("subtraction")).open).toBeNull();
  const replacement = await open(repository, "subtraction");
  expect(replacement.session.id).not.toBe(finished.session.id);
  expect(replayColumnJournal(await db.columnJournal.toArray()).cursor).toEqual({ sequence: 7, effectiveAt: start });
});

it("rolls back partial journal, attempt, progress, seen, cursor and session writes on failures and cancellation", async () => {
  const { db, repository } = setup();
  const initial = await open(repository, "addition");
  const before = await columnRows(db);
  const check = { type: "check", input: input(initial), activeMs: 600 } as const;
  const fail = vi.spyOn(db.columnSessions, "put").mockRejectedValueOnce(new Error("session write failed"));
  await expect(repository.act(initial.token, check)).rejects.toThrow("session write failed");
  fail.mockRestore();
  expect(await columnRows(db)).toEqual(before);

  const controller = new AbortController();
  const writeState = db.columnState.put.bind(db.columnState);
  const abort = vi.spyOn(db.columnState, "put").mockImplementationOnce((...args) => writeState(...args).then((key) => {
    controller.abort();
    return key;
  }));
  await expect(repository.act(initial.token, { type: "skip", ...captured(initial) }, controller.signal)).rejects.toThrow();
  abort.mockRestore();
  expect(await columnRows(db)).toEqual(before);
  await expect(repository.checkpoint(initial.token, input(initial), 0, controller.signal)).rejects.toThrow();
  expect(await columnRows(db)).toEqual(before);
  await repository.act(initial.token, check);
  expect(await db.columnAttempts.count()).toBe(1);
});

async function populated() {
  const context = setup();
  const { db, repository, time } = context;
  for (let offset = 0; offset < 3; offset++) {
    time(start + offset * day);
    let record = await open(repository, "addition");
    while (!record.session.end) {
      record = await repository.act(record.token, { type: "check", input: input(record), activeMs: 1500 });
      record = await repository.act(record.token, { type: "advance" });
    }
  }
  const additionStart = await open(repository, "addition");
  const draft = input(additionStart, 233);
  const hinted = await repository.act(additionStart.token, { type: "hint", input: draft, activeMs: 700 });
  const addition = await repository.checkpoint(hinted.token, draft, 1200);
  const subtractionStart = await open(repository, "subtraction");
  const subtraction = await repository.act(subtractionStart.token, { type: "check", input: input(subtractionStart), activeMs: 700 });
  await db.parentGate.put({ id: "parent", version: 1, salt: new Uint8Array(16).fill(13), hash: new Uint8Array(32).fill(31) });
  return { ...context, addition, subtraction, backup: await exportBackup(db, start + 2 * day) };
}

function legacy(version: 1 | 2): LegacyBackup {
  const content = {
    format: "math-hero-backup", exportedAt: start,
  } as const;
  const tables: LegacyBackup["tables"] = { sessions: [], attempts: [], progress: [], settings: [], journal: [], rewards: [], rewardState: [] };
  return version === 1 ? { ...content, tables, version: 1, databaseVersion: 3 } : { ...content, tables, version: 2, databaseVersion: 4 };
}

it("round trips a full v3 export, rotates generation on every restore and preserves the PIN", async () => {
  const { db, repository, addition, subtraction, backup } = await populated();
  expect(backup).toMatchObject({ version: 3, databaseVersion: 5 });
  expect(Object.keys(backup.tables)).not.toContain("parentGate");
  expect(backup.tables.columnSessions.every((session) => !Object.hasOwn(session, "owner"))).toBe(true);
  const pin = await db.parentGate.get("parent");
  const originalGeneration = addition.token.generation;
  const serialized = JSON.stringify(backup);
  expect(parseBackup(serialized)).toEqual(backup);
  await restoreBackup(parseBackup(serialized), true, db);
  const restored = await repository.readOpen("addition");
  expect(restored.generation).not.toBe(originalGeneration);
  expect(restored.open).toMatchObject({ session: addition.session, token: { owner: null, revision: 0 } });
  expect((await repository.readOpen("subtraction")).open?.session).toEqual(subtraction.session);
  await expect(repository.act(subtraction.token, { type: "advance" })).rejects.toBeInstanceOf(StaleColumnSessionError);
  await expect(repository.claim("addition", { generation: originalGeneration, open: addition }, "stale")).rejects.toBeInstanceOf(StaleColumnSessionError);
  const afterClaim = await repository.claim("addition", restored, "same-owner");
  await restoreBackup(backup, true, db);
  const afterRestore = await repository.readOpen("addition");
  expect(afterRestore.generation).not.toBe(restored.generation);
  const current = await repository.claim("addition", afterRestore, "same-owner");
  expect(current.token).toMatchObject({ sessionId: afterClaim.token.sessionId, owner: afterClaim.token.owner, revision: afterClaim.token.revision });
  await expect(repository.checkpoint(afterClaim.token, input(afterClaim), 2000)).rejects.toBeInstanceOf(StaleColumnSessionError);
  expect(await exportBackup(db, backup.exportedAt)).toEqual(backup);
  expect(await db.parentGate.get("parent")).toEqual(pin);
  const replay = replayColumnJournal(backup.tables.columnJournal);
  const seen = await db.columnSeen.toArray();
  expect(seen.map(({ operation }) => operation)).toEqual(["addition", "subtraction"]);
  for (const { operation, bits } of seen) {
    const lookup = new ColumnSeen(operation, bits);
    const expected = [...replay.seen].filter((id) => id.startsWith(operation));
    expect(expected.every((id) => lookup.has(id))).toBe(true);
    const count = bits.reduce((n, byte) => n + byte.toString(2).replaceAll("0", "").length, 0);
    expect(count).toBe(expected.length);
  }
  for (const session of replay.sessions.values()) {
    expect(session.order.every(({ exercise, fresh }) => fresh && replay.seen.has(operandPairId(exercise)))).toBe(true);
  }
  const advanced = await repository.act((await open(repository, "subtraction")).token, { type: "advance" });
  expect(advanced.session.order.at(-1)?.fresh).toBe(true);
  expect((await db.columnJournal.orderBy("sequence").last())?.sequence).toBe(replay.cursor.sequence + 1);
});

it("preserves every column row and active token after v1/v2 restore, and changes both scopes in a full replacement", async () => {
  const { db, repository, addition, backup } = await populated();
  const before = await columnRows(db);
  const pin = await db.parentGate.get("parent");
  for (const version of [1, 2] as const) {
    const old = legacy(version);
    old.tables.settings.push({ id: "preferences", value: { language: "ru", theme: "dark", animationsEnabled: true, soundEnabled: false, dailyGoalMinutes: 5 } });
    if (version === 1) delete old.tables.settings[0]!.value.theme;
    expect(await restoreBackup(old, true, db)).toBe(true);
    expect(await columnRows(db)).toEqual(before);
    expect((await repository.readOpen("addition")).open?.token).toEqual(addition.token);
    expect(await db.settings.get("preferences")).toEqual(old.tables.settings[0]);
  }
  await restoreBackup(backup, true, db);
  expect(await db.settings.count()).toBe(0);
  expect(await db.parentGate.get("parent")).toEqual(pin);
  const empty = await exportBackup(setup().db, start);
  await restoreBackup(empty, true, db);
  expect(await db.columnSessions.count()).toBe(0);
  expect(await db.columnSeen.count()).toBe(0);
  expect((await db.columnState.get("state"))?.cursor.sequence).toBe(0);
  expect(await db.parentGate.get("parent")).toEqual(pin);
});

it("rejects missing, duplicate, dangling, altered and unknown column records before any replacement", async () => {
  const { db, backup } = await populated();
  const before = await columnRows(db);
  const proof = backup.tables.columnProgress.findIndex((row) => row.retained !== null);
  expect(proof).toBeGreaterThanOrEqual(0);
  const mutate: [string, (tables: FullBackup["tables"]) => unknown][] = [
    ["unknown table", (t) => Object.assign(t, { columnState: [] })],
    ["missing snapshot", (t) => t.columnSessions.pop()],
    ["duplicate snapshot", (t) => t.columnSessions.push(t.columnSessions[0]!)],
    ["dangling snapshot", (t) => Object.assign(t.columnSessions[0]!, { id: "missing" })],
    ["local owner", (t) => Object.assign(t.columnSessions[0]!, { owner: null })],
    ["unknown policy", (t) => Object.assign(t.columnJournal[0]!, { policyVersion: 2 })],
    ["unknown journal action", (t) => Object.assign(t.columnJournal[0]!, { type: "pause" })],
    ["unknown journal field", (t) => Object.assign(t.columnJournal[1]!, { owner: "unknown" })],
    ["missing event", (t) => t.columnJournal.shift()],
    ["duplicate event", (t) => t.columnJournal.push(t.columnJournal[0]!)],
    ["wrong event sequence", (t) => Object.assign(t.columnJournal[0]!, { sequence: 2 })],
    ["impossible elapsed time", (t) => Object.assign(t.columnJournal[1]!, { activeMs: -1 })],
    ["forged support", (t) => Object.assign(t.columnProgress[proof]!.retained!, { supportingAttemptIds: ["missing"] })],
    ["dangling attempt", (t) => Object.assign(t.columnAttempts[0]!, { sessionId: "missing" })],
    ["missing attempt", (t) => t.columnAttempts.pop()],
    ["duplicate attempt", (t) => t.columnAttempts.push(t.columnAttempts[0]!)],
    ["altered attempt", (t) => Object.assign(t.columnAttempts[0]!, { independent: false })],
    ["missing progress", (t) => t.columnProgress.pop()],
    ["duplicate progress", (t) => t.columnProgress.push(t.columnProgress[0]!)],
    ["altered feedback phase", (t) => Object.assign(t.columnSessions.find((s) => s.draft?.phase === "correct")!.draft!, { phase: "answering" })],
    ["altered feedback time", (t) => Object.assign(t.columnSessions.find((s) => s.draft?.phase === "correct")!, { activeMs: 4000 })],
    ["cleared help flag", (t) => Object.assign(t.columnSessions.find((s) => s.draft?.hintShown)!.draft!, { hintShown: false })],
    ["editing time behind hint", (t) => Object.assign(t.columnSessions.find((s) => s.draft?.hintShown)!, { activeMs: 10 })],
    ["altered exercise order", (t) => Object.assign(t.columnSessions[0]!.order[0]!.exercise, { top: 99 })],
  ];
  for (const [name, change] of mutate) {
    const invalid = structuredClone(backup);
    change(invalid.tables);
    await expect(restoreBackup(invalid, true, db), name).rejects.toThrow();
    expect(await columnRows(db), name).toEqual(before);
  }
});

it("rolls back both scopes after a late full restore failure or abort and leaves Cancel untouched", async () => {
  const { db, backup } = await populated();
  const rows = await columnRows(db);
  const empty = await exportBackup(setup().db, start);
  empty.tables.settings.push({ id: "preferences", value: { language: "ru", theme: "dark", animationsEnabled: true, soundEnabled: false, dailyGoalMinutes: 5 } });
  expect(await restoreBackup(empty, false, db)).toBe(false);
  const failure = vi.spyOn(db.columnState, "add").mockRejectedValueOnce(new Error("state unavailable"));
  await expect(restoreBackup(empty, true, db)).rejects.toThrow("state unavailable");
  failure.mockRestore();
  expect(await exportBackup(db, backup.exportedAt)).toEqual(backup);
  expect(await columnRows(db)).toEqual(rows);

  const controller = new AbortController();
  const writeState = db.columnState.add.bind(db.columnState);
  const abort = vi.spyOn(db.columnState, "add").mockImplementationOnce((...args) => writeState(...args).then((key) => {
    controller.abort();
    return key;
  }));
  await expect(restoreBackup(empty, true, db, controller.signal)).rejects.toThrow();
  abort.mockRestore();
  expect(await exportBackup(db, backup.exportedAt)).toEqual(backup);
  expect(await columnRows(db)).toEqual(rows);
});
