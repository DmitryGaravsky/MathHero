import { readFile } from "node:fs/promises";
import { expect, test, type APIRequestContext, type Page, type TestInfo } from "@playwright/test";
import type { Backup } from "../../src/database/backup";
import type { LearningSession } from "../../src/engine/learning/session";
import type { PairProgress } from "../../src/engine/learning/progress";
import type { Attempt } from "../../src/engine/sessions/diagnostic";
import { nativeSnapshot, rows } from "../support/nativeSnapshot";
import { goParent, openParent } from "../support/parentMode";
import { expectEmptyColumnStores } from "./columnStores";

const provenance = {
  commit: "9309abde58cff9c001e7944f29d2b727965ee093",
  workerRevision: "01ee92a8204ef083b478",
  timeZone: "Europe/Paris",
  randomSeed: 20261116,
  historySource: "Synthetic dates and scripted answers entered through the published 1.1 browser UI",
};

async function serve(request: APIRequestContext, version: "published11" | "candidate") {
  const response = await request.post(`http://127.0.0.1:4175/__test/release?version=${version}`);
  expect(response.ok()).toBe(true);
}

function input(page: Page) {
  return page.getByRole("textbox", { name: "Tu respuesta" });
}

async function answer(page: Page, value: string, status: string) {
  await expect(input(page)).toBeEnabled();
  await input(page).fill(value);
  await input(page).press("Enter");
  await expect(page.getByRole("status")).toContainText(status);
}

async function downloadBackup(page: Page, info: TestInfo, name: string) {
  const download = page.waitForEvent("download");
  await page.getByRole("button", { name: "Descargar copia" }).click();
  const path = info.outputPath(name);
  await (await download).saveAs(path);
  await info.attach(name, { path, contentType: "application/json" });
  return { path, backup: JSON.parse(await readFile(path, "utf8")) as Backup };
}

test.use({ serviceWorkers: "block" });

test("upgrades the empty native published 1.1 database", async ({ page, request }, info) => {
  await serve(request, "published11");
  await page.goto("./");
  await expect(page.locator(".app-shell")).toHaveAttribute("data-mode", "child");
  await expect(page.getByRole("progressbar", { name: "multiplicaciones que ya recuerdas" })).toHaveAttribute("value", "0");
  const old = await nativeSnapshot(page);
  expect(old.version).toBe(40);
  expect(old.stores).toHaveLength(8);
  expect(old.stores.every((store) => store.rows.length === 0)).toBe(true);
  await info.attach("published-1.1-native-empty.json", { body: JSON.stringify({ provenance, ...old }), contentType: "application/json" });

  await serve(request, "candidate");
  await page.reload();
  await expect(page.locator(".app-shell")).toHaveAttribute("data-mode", "child");
  expect(expectEmptyColumnStores(await nativeSnapshot(page))).toEqual(old.stores);
});

test("preserves the populated native 1.1 database and imports its published v2 export", async ({ page, request }, info) => {
  await serve(request, "published11");
  await page.addInitScript((seed) => {
    let random = seed;
    Math.random = () => {
      random = (Math.imul(1664525, random) + 1013904223) >>> 0;
      return random / 2 ** 32;
    };
  }, provenance.randomSeed);
  const dates = ["2026-10-01", "2026-10-02", "2026-10-05", "2026-10-12", "2026-10-26", "2026-11-09"];
  const setDay = (day: string) => page.clock.setFixedTime(new Date(`${day}T12:00:00Z`));
  await setDay(dates[0]!);
  await page.goto("./#parent/settings");
  await openParent(page);
  await page.getByRole("combobox", { name: "Tema" }).selectOption("dark");
  await page.getByRole("combobox", { name: "Objetivo diario" }).selectOption("5");
  await page.getByRole("switch", { name: "Animaciones" }).click();
  await page.getByLabel("Nuevo PIN").fill("4321");
  await page.getByRole("button", { name: "Cambiar PIN" }).click();
  await expect(page.getByRole("status").filter({ hasText: "PIN actualizado." })).toBeVisible();

  await page.goto("./#parent/weak?pair=mul%3A9%3A9");
  for (const [index, day] of dates.entries()) {
    await setDay(day);
    const start = page.getByRole("button", { name: index === 0 ? "Empezar a practicar" : "Nueva práctica" });
    await expect(start).toBeVisible();
    await start.click();
    await expect(page.locator(".equation")).toHaveAttribute("aria-label", "9 × 9");
    await answer(page, "81", "¡Correcto!");
    await page.getByRole("button", { name: "Terminar esta práctica" }).click();
    await expect(page.getByRole("heading", { name: "Práctica finalizada" })).toBeVisible();
  }

  await page.goto("./#parent/weak?pair=mul%3A7%3A8");
  await page.getByRole("button", { name: "Empezar a practicar" }).click();
  await answer(page, "0", "La respuesta correcta");

  await goParent(page, "training");
  await page.getByRole("button", { name: "Empezar a practicar" }).click();
  await expect(input(page)).toBeEnabled();
  const equation = await page.locator(".equation").getAttribute("aria-label");
  await input(page).fill("42");
  await page.getByRole("button", { name: "Pausar", exact: true }).click();
  await expect(page.getByRole("heading", { name: "En pausa" })).toBeVisible();
  await goParent(page, "settings");
  const { path, backup } = await downloadBackup(page, info, "published-1.1-v2.json");
  expect(backup).toMatchObject({ version: 2, databaseVersion: 4 });
  const old = await nativeSnapshot(page);
  expect(old.version).toBe(40);
  expect(old.stores).toHaveLength(8);
  const sessions = rows<LearningSession>(old, "sessions");
  const draft = sessions.find(({ mode }) => mode === "adaptive");
  expect(draft).toMatchObject({ phase: "question", draft: "42", cursor: 0, policy: { version: 2 } });
  expect(draft!.activeMs).toBeGreaterThan(0);
  expect(sessions.find(({ targetPair }) => targetPair === "mul:7:8"))
    .toMatchObject({ phase: "feedback", cursor: 1, lastAttempt: { correct: false } });
  expect(rows<Attempt>(old, "attempts")).toHaveLength(7);
  expect(rows(old, "journal")).toHaveLength(7);
  expect(rows<PairProgress>(old, "progress").find(({ canonicalId }) => canonicalId === "mul:9:9"))
    .toMatchObject({ retentionCheck: { at: Date.UTC(2026, 10, 9, 12), intervalDays: 14 } });
  expect(rows(old, "rewards")).toContainEqual(expect.objectContaining({ kind: "retention", stars: 5 }));
  expect(rows(old, "rewardState")).toHaveLength(1);
  expect(rows(old, "settings")).toEqual([{ id: "preferences", value: {
    theme: "dark", language: "es", soundEnabled: false, animationsEnabled: false, dailyGoalMinutes: 5,
  } }]);
  const [pin] = rows<{ id: string; version: number; salt: number[]; hash: number[] }>(old, "parentGate");
  expect(pin).toMatchObject({ id: "parent", version: 1, saltType: "Uint8Array", hashType: "Uint8Array" });
  expect(pin!.salt).toHaveLength(16);
  expect(pin!.hash).toHaveLength(32);
  await info.attach("published-1.1-native-populated.json", { body: JSON.stringify({ provenance, ...old }, null, 2), contentType: "application/json" });

  await serve(request, "candidate");
  await page.reload();
  await expect(page.locator(".app-shell")).toHaveAttribute("data-mode", "child");
  expect(expectEmptyColumnStores(await nativeSnapshot(page))).toEqual(old.stores);
  await openParent(page, undefined, "4321");
  await expect(page.getByRole("combobox", { name: "Tema" })).toHaveValue("dark");
  const { backup: candidate } = await downloadBackup(page, info, "candidate-v3.json");
  expect(candidate).toMatchObject({ version: 3, databaseVersion: 5 });
  const portable = {
    ...backup.tables,
    sessions: backup.tables.sessions.map((session) => ({ ...session, owner: null })),
    columnSessions: [], columnAttempts: [], columnProgress: [], columnJournal: [],
  };
  expect(candidate.tables).toEqual(portable);

  await page.locator('input[type="file"]').setInputFiles(path);
  const dialog = page.getByRole("dialog");
  await expect(dialog).toContainText("Se conservarán el historial y las sesiones sin terminar de cálculo en columna");
  await dialog.getByRole("button", { name: "Reemplazar y restaurar" }).click();
  await expect(page.getByRole("status")).toContainText("Copia restaurada");
  expect(rows(await nativeSnapshot(page), "parentGate")).toEqual([pin]);
  const { backup: restored } = await downloadBackup(page, info, "restored-v3.json");
  expect(restored.tables).toEqual(portable);
  await page.reload();
  await openParent(page, undefined, "4321");
  await goParent(page, "training");
  await page.getByRole("button", { name: "Continuar práctica" }).click();
  await expect(input(page)).toHaveValue("42");
  await expect(page.locator(".equation")).toHaveAttribute("aria-label", equation!);
  await page.goto("./#parent/weak?pair=mul%3A7%3A8");
  await expect(page.getByRole("status")).toContainText("La respuesta correcta");
});
