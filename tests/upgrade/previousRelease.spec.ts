import { readFile } from "node:fs/promises";
import { expect, test, type APIRequestContext, type Page, type TestInfo } from "@playwright/test";
import { nativeSnapshot, rows } from "../support/nativeSnapshot";
import { openParent, parentNav } from "../support/parentMode";
import type { Attempt, DiagnosticSession } from "../../src/engine/sessions/diagnostic";
import type { LearningSession, Session } from "../../src/engine/learning/session";
import type { PairProgress } from "../../src/engine/learning/progress";
import type { Reward } from "../../src/engine/learning/rewards";
import type { Backup } from "../../src/database/backup";

const origin = "http://127.0.0.1:4175";
const provenance = {
  commit: "923d1f634047322e688eafb38679ad3dba66e1d7",
  publishedWorkerRevision: "7a73513eb82bcfc66d1d",
  timeZone: "Europe/Paris",
  randomSeed: 20261115,
};

async function serve(request: APIRequestContext, release: "legacy" | "candidate") {
  const response = await request.post(`${origin}/__test/release?version=${release}`);
  expect(response.ok()).toBe(true);
}

async function syntheticClock(page: Page) {
  await page.addInitScript((seed) => {
    let random = seed;
    Math.random = () => {
      random = (Math.imul(1664525, random) + 1013904223) >>> 0;
      return random / 2 ** 32;
    };
    const now = performance.now.bind(performance);
    performance.now = () => now() + Number(document.documentElement?.dataset.fixtureElapsed ?? 0);
  }, provenance.randomSeed);
  await day(page, "2026-10-01");
}

async function day(page: Page, date: string) {
  await page.clock.setFixedTime(new Date(`${date}T12:00:00Z`));
}

async function answer(page: Page, options: { wrong?: boolean; slow?: boolean } = {}) {
  const input = page.getByRole("textbox", { name: "Tu respuesta" });
  await expect(input).toBeEnabled();
  if (options.slow) {
    await page.evaluate(() => { document.documentElement.dataset.fixtureElapsed = "6200"; });
  }
  const label = await page.locator(".equation").getAttribute("aria-label");
  const [a, b] = label!.split(" × ").map(Number);
  await input.fill(options.wrong ? "0" : String(a! * b!));
  await input.press("Enter");
  await expect(page.getByRole("status")).toContainText(options.wrong ? "La respuesta correcta" : "¡Correcto!");
}

async function exportFile(page: Page, info: TestInfo, name: string) {
  const downloading = page.waitForEvent("download");
  await page.getByRole("button", { name: "Descargar copia" }).click();
  const path = info.outputPath(name);
  await (await downloading).saveAs(path);
  await info.attach(name, { path, contentType: "application/json" });
  return { path, backup: JSON.parse(await readFile(path, "utf8")) as Backup };
}

type NativeSnapshot = Awaited<ReturnType<typeof nativeSnapshot>>;

function expectAdditiveUpgrade(old: NativeSnapshot, upgraded: NativeSnapshot) {
  expect(old.version).toBe(30);
  expect(upgraded.version).toBe(40);
  // Store metadata includes native key paths and indexes in both engines.
  expect(upgraded.stores.filter(({ name }) => name !== "parentGate")).toEqual(old.stores);
  expect(upgraded.stores.find(({ name }) => name === "parentGate"))
    .toEqual({ name: "parentGate", keyPath: "id", indexes: [], rows: [] });
}

function businessTables(backup: Backup) {
  return { ...backup.tables, settings: backup.tables.settings.map(({ id, value }) => ({
    id, value: { ...value, theme: "system" },
  })) };
}

test.describe("native IndexedDB upgrade", () => {
  test.use({ serviceWorkers: "block" });

  test("upgrades an empty previous install", async ({ page, request }) => {
    await serve(request, "legacy");
    await page.goto("./");
    await expect(page.locator(".journey-card .metrics")).toContainText("0 / 78");
    const old = await nativeSnapshot(page);
    expect(old.stores).toHaveLength(7);
    expect(old.stores.every((store) => store.rows.length === 0)).toBe(true);

    await serve(request, "candidate");
    await page.reload();
    await expect(page.locator(".app-shell")).toHaveAttribute("data-mode", "child");
    await expect(page.locator(".app-shell")).toHaveAttribute("data-theme", "system");
    expectAdditiveUpgrade(old, await nativeSnapshot(page));
    await openParent(page, "settings");
    await expect(page.getByRole("combobox", { name: "Tema" })).toHaveValue("system");
  });

  test("preserves old UI learning records, draft and feedback, and imports its v1 export", async ({ page, context, request, browser }, info) => {
    await serve(request, "legacy");
    await syntheticClock(page);
    await page.goto("./#settings");
    await page.getByRole("combobox", { name: "Objetivo diario" }).selectOption("5");
    await page.getByRole("switch", { name: "Animaciones" }).click();
    await page.goto("./#diagnostic");
    await page.getByRole("button", { name: "Empezar diagnóstico" }).click();
    for (let i = 0; i < 24; i++) {
      await answer(page, { wrong: i === 0 });
      await page.getByRole("button", { name: "Siguiente", exact: true }).click();
    }
    await expect(page.getByRole("heading", { name: "Parte 1 completada" })).toBeVisible();

    const masteryDates = ["2026-10-01", "2026-10-02", "2026-10-05", "2026-10-12", "2026-10-26"];
    const retentionDate = "2026-11-09";
    for (const date of [...masteryDates, retentionDate]) {
      await day(page, date);
      await page.goto("./#weak?pair=mul%3A9%3A9");
      await page.getByRole("button", { name: date === masteryDates[0] ? "Empezar a practicar" : "Nueva práctica" }).click();
      await expect(page.locator(".equation")).toHaveAttribute("aria-label", "9 × 9");
      await answer(page);
      if (date !== retentionDate) {
        await page.getByRole("button", { name: "Terminar esta práctica" }).click();
        await expect(page.getByRole("heading", { name: "Práctica guardada" })).toBeVisible();
      }
    }
    await page.goto("./#weak?pair=mul%3A8%3A7");
    await page.getByRole("button", { name: "Empezar a practicar" }).click();
    await answer(page, { wrong: true });

    await page.goto("./#training");
    await page.getByRole("button", { name: "Empezar a practicar" }).click();
    for (let i = 0; i < 4; i++) {
      await answer(page, { slow: i === 3 });
      await page.getByRole("button", { name: "Siguiente", exact: true }).click();
    }
    await expect(page.getByRole("textbox")).toBeEnabled();
    const equation = await page.locator(".equation").getAttribute("aria-label");
    await page.getByRole("textbox").fill("42");
    await page.getByRole("button", { name: "Pausar", exact: true }).click();
    await expect(page.getByRole("heading", { name: "En pausa" })).toBeVisible();
    await page.goto("./#settings");
    const { path, backup } = await exportFile(page, info, "published-v1.json");
    expect(backup).toMatchObject({ version: 1, databaseVersion: 3 });
    const old = await nativeSnapshot(page);
    const adaptive = rows<LearningSession>(old, "sessions").find((session) => session.mode === "adaptive")!;
    const weak = rows<LearningSession>(old, "sessions").find((session) => session.targetPair === "mul:7:8")!;
    const attempts = rows<Attempt>(old, "attempts");
    expect(adaptive).toMatchObject({ phase: "question", cursor: 4, draft: "42" });
    expect(adaptive.activeMs).toBeGreaterThan(0);
    expect(weak).toMatchObject({ phase: "feedback", cursor: 1, lastAttempt: { correct: false } });
    expect(weak.repeats).toHaveLength(1);
    expect(rows<DiagnosticSession>(old, "sessions").find(({ mode }) => mode === "diagnostic"))
      .toMatchObject({ phase: "break", cursor: 24 });
    expect(attempts.filter(({ mode }) => mode === "diagnostic")).toHaveLength(24);
    const slow = attempts.find(({ mode, ordinal }) => mode === "adaptive" && ordinal === 3);
    expect(slow?.correct).toBe(true);
    expect(slow?.responseTimeMs).toBeGreaterThan(6200);
    expect(attempts.filter(({ mode, canonicalId, correct }) => mode === "weak" && canonicalId === "mul:9:9" && correct))
      .toHaveLength(6);
    expect(rows<PairProgress>(old, "progress").find(({ canonicalId }) => canonicalId === "mul:9:9"))
      .toMatchObject({ masteredAt: Date.UTC(2026, 9, 26, 12) });
    const rewards = rows<Reward>(old, "rewards");
    expect(rewards).toEqual(expect.arrayContaining([
      expect.objectContaining({ id: "achievement:first10", kind: "achievement", achievement: "first10" }),
      expect.objectContaining({ id: `retention:mul:9:9:${Date.UTC(2026, 10, 9, 12)}`, kind: "retention", stars: 5 }),
    ]));
    expect(rows(old, "settings")).toEqual([{ id: "preferences", value: {
      language: "es", soundEnabled: false, animationsEnabled: false, dailyGoalMinutes: 5,
    } }]);
    await info.attach("published-native-db.json", { body: JSON.stringify({ provenance, ...old }, null, 2), contentType: "application/json" });
    const storage = info.outputPath("published-storage-state.json");
    await context.storageState({ indexedDB: true, path: storage });
    await info.attach("published-storage-state", { path: storage, contentType: "application/json" });

    await serve(request, "candidate");
    await page.reload();
    await expect(page.locator(".app-shell")).toHaveAttribute("data-mode", "child");
    expectAdditiveUpgrade(old, await nativeSnapshot(page));
    await openParent(page);
    await expect(page.getByRole("combobox", { name: "Objetivo diario" })).toHaveValue("5");
    await expect(page.getByRole("combobox", { name: "Tema" })).toHaveValue("system");
    await expect(page.getByRole("switch", { name: "Animaciones" })).toHaveAttribute("aria-checked", "false");
    const reexported = await exportFile(page, info, "candidate-v2.json");
    expect(reexported.backup).toMatchObject({ version: 2, databaseVersion: 4 });
    expect(reexported.backup.tables).toEqual(businessTables(backup));
    await parentNav(page, "training").click();
    await page.getByRole("button", { name: "Continuar práctica" }).click();
    await expect(page.getByRole("textbox")).toHaveValue("42");
    await expect(page.locator(".equation")).toHaveAttribute("aria-label", equation!);
    await page.goto("./#parent/weak?pair=mul%3A7%3A8");
    await expect(page.getByRole("status")).toContainText("La respuesta correcta");
    expect(rows<Attempt>(await nativeSnapshot(page), "attempts")).toEqual(attempts);

    const clean = await browser.newContext({ baseURL: `${origin}/MathHero/`, serviceWorkers: "block", timezoneId: provenance.timeZone });
    try {
      const restored = await clean.newPage();
      await restored.goto("./#settings");
      await openParent(restored);
      const notes = restored.getByRole("status");
      await restored.getByLabel("Nuevo PIN").fill("4321");
      await restored.getByRole("button", { name: "Cambiar PIN" }).click();
      await expect(notes.filter({ hasText: "PIN actualizado." })).toBeVisible();
      const localGate = rows(await nativeSnapshot(restored), "parentGate");
      await restored.locator('input[type="file"]').setInputFiles(path);
      await restored.getByRole("button", { name: "Reemplazar y restaurar" }).click();
      await expect(notes.filter({ hasText: "Copia restaurada" })).toBeVisible();
      const after = await nativeSnapshot(restored);
      expect(rows(after, "parentGate")).toEqual(localGate);
      const expectedSessions = backup.tables.sessions.map((session) => ({ ...session, owner: null }));
      expect(rows<Session>(after, "sessions")).toEqual(expectedSessions);
      expect(rows<Attempt>(after, "attempts")).toEqual(attempts);
      const roundTrip = await exportFile(restored, info, "restored-v2.json");
      expect(roundTrip.backup.tables).toEqual({ ...businessTables(backup), sessions: expectedSessions });
      await restored.reload();
      await openParent(restored, undefined, "4321");
      await expect(restored.getByRole("combobox", { name: "Objetivo diario" })).toHaveValue("5");
    } finally {
      await clean.close();
    }
  });
});

test("published worker waits, then naturally activates the candidate and resumes offline", async ({ page, context, request }) => {
  await serve(request, "legacy");
  await page.goto("./#diagnostic");
  await expect.poll(() => page.evaluate(() => !!navigator.serviceWorker.controller)).toBe(true);
  expect(await page.evaluate(() => caches.keys())).toContain(`math-hero:/MathHero/:${provenance.publishedWorkerRevision}`);
  await page.getByRole("button", { name: "Empezar diagnóstico" }).click();
  await answer(page, { wrong: true });
  const old = await nativeSnapshot(page);
  expect(rows<DiagnosticSession>(old, "sessions")[0]).toMatchObject({ phase: "feedback", cursor: 1 });
  await serve(request, "candidate");
  await page.evaluate(async () => { await (await navigator.serviceWorker.getRegistration())!.update(); });
  await expect.poll(() => page.evaluate(async () => (await navigator.serviceWorker.getRegistration())?.waiting?.state))
    .toBe("installed");
  expect(await nativeSnapshot(page)).toEqual(old);
  await page.goto("about:blank");
  await context.setOffline(true);
  const next = await context.newPage();
  await expect(async () => {
    await next.goto("./#diagnostic");
    await expect(next.locator(".app-shell")).toHaveAttribute("data-mode", "child", { timeout: 2000 });
  }).toPass({ timeout: 15_000 });
  expectAdditiveUpgrade(old, await nativeSnapshot(next));
  await openParent(next);
  await expect(next.getByRole("status")).toContainText("La respuesta correcta");
  await next.getByRole("button", { name: "Siguiente", exact: true }).click();
  await expect(next.getByRole("textbox")).toHaveValue("");
  expect(rows(await nativeSnapshot(next), "attempts")).toHaveLength(1);
});
