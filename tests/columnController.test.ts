import { afterEach, expect, it, vi } from "vitest";
import { exportBackup, restoreBackup } from "../src/database/backup";
import { ColumnRepository } from "../src/database/columnRepository";
import { MathHeroDB } from "../src/database/db";
import { columnWork } from "../src/engine/column/arithmetic";
import { ColumnController } from "../src/features/column/ColumnController";

const databases: MathHeroDB[] = [];

afterEach(async () => {
  for (const db of databases.splice(0)) await db.delete();
});

function setup() {
  const db = new MathHeroDB("column-controller-" + crypto.randomUUID());
  databases.push(db);
  const repository = new ColumnRepository(db, { now: () => Date.UTC(2026, 9, 1) }, { next: () => 42 / 2 ** 32 },
    () => crypto.randomUUID(), () => "Europe/Paris");
  let now = 0;
  const callbacks = new Set<() => void>();
  const schedule = vi.fn((callback: () => void) => {
    callbacks.add(callback);
    return () => { callbacks.delete(callback); };
  });
  const view = new ColumnController("addition", repository, "first", { now: () => now }, schedule);
  view.attach(true);
  return { db, repository, view, schedule, callbacks, time: (ms: number) => { now = ms; } };
}

function deferred() {
  let resolve!: () => void;
  const promise = new Promise<void>((done) => { resolve = done; });
  return { promise, resolve };
}

function barrier() {
  const started = deferred();
  const proceed = deferred();
  return {
    started: started.promise, go: () => proceed.resolve(),
    async wait() { started.resolve(); await proceed.promise; },
  };
}

function solve(view: ColumnController) {
  const value = columnWork(view.getSnapshot().session!.order.at(-1)!.exercise).answer;
  for (const digit of String(value).split("").reverse()) view.edit({ type: "digit", digit: Number(digit) });
  return view.act("check");
}

it("drains delayed edits and release before quick reentry of the same operation", async () => {
  const { repository, view, time } = setup();
  await view.enter();
  const checkpoint = repository.checkpoint.bind(repository);
  const checkpointGate = barrier();
  vi.spyOn(repository, "checkpoint").mockImplementationOnce(async (...args) => {
    await checkpointGate.wait();
    return checkpoint(...args);
  });
  const release = repository.release.bind(repository);
  const releaseGate = barrier();
  vi.spyOn(repository, "release").mockImplementationOnce(async (...args) => {
    await releaseGate.wait();
    return release(...args);
  });
  const read = vi.spyOn(repository, "readOpen");
  time(100);
  view.reveal();
  view.edit({ type: "digit", digit: 3 });
  await checkpointGate.started;
  time(260);
  view.edit({ type: "digit", digit: 3 });
  view.edit({ type: "digit", digit: 2 });
  for (const place of [1, 2, 3] as const) view.edit({ type: "toggle-mark", place });
  const paused = view.detach();
  view.attach(true);
  const reentered = view.enter();
  checkpointGate.go();
  await releaseGate.started;
  expect(read).not.toHaveBeenCalled();
  expect(view.getSnapshot().busy).toBe(true);
  expect(view.getSnapshot().session?.draft?.digits).toEqual([3, 3, 2, null]);
  releaseGate.go();
  await expect(paused).resolves.toBe(true);
  await expect(reentered).resolves.toBe(true);
  const open = (await repository.readOpen("addition")).open!;
  expect(open.session).toMatchObject({
    draft: { digits: [3, 3, 2, null], activePlace: 3, marks: [false, true, true, true] }, activeMs: 160,
  });
  expect(view.getSnapshot()).toMatchObject({ status: "active", session: open.session });
});

it("aborts a pending check when covered and releases the full latest draft", async () => {
  const { db, repository, view, time } = setup();
  await view.enter();
  const act = repository.act.bind(repository);
  const gate = barrier();
  vi.spyOn(repository, "act").mockImplementationOnce(async (...args) => {
    await gate.wait();
    return act(...args);
  });
  time(5);
  view.reveal();
  time(505);
  const checked = solve(view);
  const digits = view.getSnapshot().session!.draft!.digits;
  await gate.started;
  const detached = view.detach();
  gate.go();
  await expect(checked).resolves.toBe(false);
  await expect(detached).resolves.toBe(true);
  expect(await db.columnAttempts.count()).toBe(0);
  const open = (await repository.readOpen("addition")).open!;
  expect(open.session).toMatchObject({ activeMs: 500, draft: { digits, phase: "answering" } });
  expect(open.token.owner).toBeNull();
  view.attach(true);
  await view.load();
  expect(view.getSnapshot()).toMatchObject({ status: "paused", session: open.session });
});

it("recovers interrupted initial reads and claims passively without creating practice", async () => {
  const { db, repository, view } = setup();
  const read = repository.readOpen.bind(repository);
  const readGate = barrier();
  vi.spyOn(repository, "readOpen").mockImplementationOnce(async (...args) => {
    await readGate.wait();
    return read(...args);
  });
  const loading = view.load();
  await readGate.started;
  const detached = view.detach();
  view.attach(true);
  const reloaded = view.load();
  readGate.go();
  await expect(loading).resolves.toBe(false);
  await detached;
  await expect(reloaded).resolves.toBe(true);
  expect(view.getSnapshot().status).toBe("ready");

  const claim = repository.claim.bind(repository);
  const claimGate = barrier();
  vi.spyOn(repository, "claim").mockImplementationOnce(async (...args) => {
    await claimGate.wait();
    return claim(...args);
  });
  const entering = view.enter();
  await claimGate.started;
  view.setVisible(false);
  view.setVisible(true);
  const observedAgain = view.load();
  claimGate.go();
  await expect(entering).resolves.toBe(false);
  await expect(observedAgain).resolves.toBe(true);
  expect(view.getSnapshot()).toMatchObject({ status: "ready", busy: false });
  expect(await db.columnSessions.count()).toBe(0);
  await expect(view.enter()).resolves.toBe(true);
});

it("starts time at reveal, records help before opening it and excludes hint, hidden and feedback intervals", async () => {
  const { db, repository, view, time, schedule } = setup();
  await view.enter();
  time(1000);
  view.reveal();
  view.edit({ type: "toggle-mark", place: 1 });
  time(1200);
  const act = repository.act.bind(repository);
  const hintGate = barrier();
  vi.spyOn(repository, "act").mockImplementationOnce(async (...args) => {
    await hintGate.wait();
    return act(...args);
  });
  view.toggleHint();
  await hintGate.started;
  expect(view.getSnapshot()).toMatchObject({ hintOpen: false, session: { draft: { hintShown: false } } });
  const revealed = deferred();
  const unsubscribe = view.subscribe(() => {
    if (view.getSnapshot().hintOpen && !view.getSnapshot().busy) revealed.resolve();
  });
  time(2000);
  hintGate.go();
  await revealed.promise;
  unsubscribe();
  expect((await repository.readOpen("addition")).open?.session).toMatchObject({ activeMs: 200, draft: { hintShown: true } });
  view.reveal();
  time(3000);
  view.toggleHint();
  time(3100);
  view.reveal();
  time(3410);
  view.setVisible(false);
  await view.pause();
  expect((await repository.readOpen("addition")).open?.session.activeMs).toBe(510);
  time(4000);
  view.setVisible(true);
  await view.enter();
  time(5000);
  view.reveal();
  time(5230);
  await solve(view);
  expect((await db.columnAttempts.toArray())[0]).toMatchObject({
    activeMs: 740, correct: true, independent: false, hintShown: true,
    input: { marks: [false, true, false, false] },
  });
  time(50_000);
  view.reveal();
  expect(schedule).toHaveBeenCalledTimes(1);
  await view.pause();
  expect((await repository.readOpen("addition")).open?.session.activeMs).toBe(740);
});

it("aborts advancement already queued behind a delayed transaction and never schedules restored feedback", async () => {
  const { db, repository, view, schedule, callbacks } = setup();
  await view.enter();
  view.reveal();
  await solve(view);
  view.reveal();
  const act = repository.act.bind(repository);
  const advanceGate = barrier();
  vi.spyOn(repository, "act").mockImplementationOnce(async (...args) => {
    await advanceGate.wait();
    return act(...args);
  });
  [...callbacks][0]!();
  await advanceGate.started;
  view.setVisible(false);
  const released = view.pause();
  advanceGate.go();
  await released;
  expect(callbacks.size).toBe(0);
  view.setVisible(true);
  await view.enter();
  view.reveal();
  expect(schedule).toHaveBeenCalledTimes(1);
  expect(view.getSnapshot().session).toMatchObject({ draft: { phase: "correct" }, summary: { solved: 1 } });
  expect(await db.columnJournal.count()).toBe(2);
  await view.act("advance");
  expect(view.getSnapshot().session?.order).toHaveLength(2);
});

it("cancels feedback on ownership changes and recovers read-only before a deliberate claim", async () => {
  const { db, repository, view, callbacks } = setup();
  await view.enter();
  await solve(view);
  view.reveal();
  const oldCallback = [...callbacks][0]!;
  const observed = await repository.readOpen("addition");
  const competitor = await repository.claim("addition", observed, "competitor");
  await view.verifyOwnership(competitor.token);
  expect(view.getSnapshot().status).toBe("stale");
  expect(callbacks.size).toBe(0);
  oldCallback();
  view.edit({ type: "digit", digit: 5 });
  await view.load();
  expect(view.getSnapshot().status).toBe("paused");
  expect((await repository.readOpen("addition")).open).toEqual(competitor);
  expect(await db.columnJournal.count()).toBe(2);
  await view.enter();
  expect(view.getSnapshot().session).toEqual(competitor.session);
});

it("cancels a feedback timer when restoring the same portable snapshot rotates ownership", async () => {
  const { db, repository, view, callbacks } = setup();
  await view.enter();
  await solve(view);
  view.reveal();
  const oldCallback = [...callbacks][0]!;
  const saved = await exportBackup(db);
  await restoreBackup(saved, true, db);
  const restored = await repository.readOpen("addition");
  await view.verifyOwnership(restored.open?.token);
  expect(view.getSnapshot().status).toBe("stale");
  expect(callbacks.size).toBe(0);
  oldCallback();
  expect((await repository.readOpen("addition")).open).toEqual(restored.open);
  expect(await db.columnJournal.count()).toBe(2);
});

it("ends only the paused snapshot the child observed, even if another view resumes it", async () => {
  const { db, repository, view } = setup();
  await view.enter();
  view.edit({ type: "digit", digit: 7 });
  await view.pause();
  expect(view.getSnapshot().canActOnPausedDraft).toBe(true);
  const competitor = await repository.claim("addition", await repository.readOpen("addition"), "another tab");
  await expect(view.actOnPausedDraft("finish")).resolves.toBe(false);
  expect(view.getSnapshot().status).toBe("stale");
  expect((await repository.readOpen("addition")).open).toEqual(competitor);
  expect(await db.columnJournal.count()).toBe(1);
});
