import { createHash } from "node:crypto";
import { expect, test, type Page } from "@playwright/test";
import release from "../../package.json" with { type: "json" };
import type { ColumnSessionRow } from "../../src/database/db";
import es from "../../src/locales/es.json" with { type: "json" };
import { nativeSnapshot, rows } from "../support/nativeSnapshot";
import { openParent } from "../support/parentMode";
import { expectEmptyColumnStores } from "./columnStores";

const oldCache = "math-hero:/MathHero/:01ee92a8204ef083b478";
const base = "http://127.0.0.1:4175";
const button = (page: Page, name: string) => page.getByRole("button", { name, exact: true });
const answer = (page: Page) => page.getByRole("textbox", { name: es.answer });
const appCaches = (page: Page) => page.evaluate(async () =>
  (await caches.keys()).filter((name) => name.startsWith("math-hero:/MathHero/:")).sort());
const waiting = (page: Page) => page.evaluate(async () =>
  (await navigator.serviceWorker.getRegistration())?.waiting?.state);

async function expectController(page: Page) {
  await expect.poll(() => page.evaluate(() => navigator.serviceWorker.controller?.scriptURL))
    .toBe(base + "/MathHero/sw.js");
}

test("published 1.1 waits for two clients, upgrades offline and preserves both practice modules", async ({ page, context, request }, info) => {
  expect((await request.post(base + "/__test/release?version=published11")).ok()).toBe(true);
  await page.goto("./#settings");
  await expectController(page);
  expect(await appCaches(page)).toEqual([oldCache]);
  await openParent(page);
  await page.getByLabel(es.theme, { exact: true }).selectOption("dark");
  await page.getByLabel("Objetivo diario").selectOption("5");
  await page.getByRole("switch", { name: "Animaciones" }).click();
  await page.getByLabel("Nuevo PIN").fill("4321");
  await button(page, "Cambiar PIN").click();
  await expect(page.getByRole("status")).toContainText("PIN actualizado.");
  await button(page, es.childMode).click();
  await page.getByRole("link", { name: es.startLearning, exact: true }).click();
  await button(page, es.startLearning).click();
  const equation = await page.locator(".equation").getAttribute("aria-label");
  await answer(page).fill("42");
  await button(page, es.pause).click();
  await expect(page.getByRole("heading", { name: es.paused })).toBeVisible();
  const old = await nativeSnapshot(page);
  expect(old.version).toBe(40);
  expect(old.stores).toHaveLength(8);
  expect(rows(old, "sessions")).toEqual([expect.objectContaining({ draft: "42", phase: "question" })]);
  expect(rows(old, "parentGate")).toHaveLength(1);

  const other = await context.newPage();
  await other.goto("./#settings");
  await expectController(other);
  await openParent(other, undefined, "4321");
  const oldEntry = await other.locator('script[type="module"][src]').getAttribute("src");
  expect((await request.post(base + "/__test/release?version=candidate")).ok()).toBe(true);
  const worker = await (await request.get(base + "/MathHero/sw.js")).text();
  const cache = worker.match(/^const CACHE = "(math-hero:\/MathHero\/:[a-f0-9]{20})";$/m)?.[1];
  const files = JSON.parse(worker.match(/^const FILES = (\[.+\]);$/m)![1]!) as string[];
  expect(cache).toBeDefined();
  expect(cache).not.toBe(oldCache);
  const expectedAssets = Object.fromEntries(await Promise.all(files.map(async (path) => {
    const response = await request.get(base + path);
    expect(response.ok()).toBe(true);
    return [path, createHash("sha256").update(await response.body()).digest("hex")];
  })));

  await other.evaluate(async () => { await (await navigator.serviceWorker.getRegistration())!.update(); });
  await expect.poll(() => waiting(other)).toBe("installed");
  await expect(other.getByTestId("offline-status")).toContainText("actualización preparada");
  expect(await appCaches(other)).toEqual([oldCache, cache!].sort());
  expect(await nativeSnapshot(page)).toEqual(old);
  await page.close();
  expect(await waiting(other)).toBe("installed");
  await expect(other.locator('script[type="module"][src]')).toHaveAttribute("src", oldEntry!);
  expect(await nativeSnapshot(other)).toEqual(old);

  // An observer outside the worker's scope can wait for activation without keeping 1.1 alive.
  const observer = await context.newPage();
  await observer.goto(base + "/__test/observer");
  expect(await observer.evaluate(() => navigator.serviceWorker.controller)).toBeNull();
  expect(await waiting(other)).toBe("installed");
  await other.close();
  await expect.poll(() => appCaches(observer)).toEqual([cache]);
  await expect.poll(() => observer.evaluate(async () => {
    const registration = await navigator.serviceWorker.getRegistration("/MathHero/");
    return { active: registration?.active?.state, waiting: !!registration?.waiting };
  })).toEqual({ active: "activated", waiting: false });
  await observer.close();
  await context.setOffline(true);
  const candidate = await context.newPage();
  await candidate.goto("./#training");
  await expect(candidate.locator('meta[name="application-version"]')).toHaveAttribute("content", release.version);
  await expectController(candidate);
  await expect.poll(() => appCaches(candidate)).toEqual([cache]);
  await expect(candidate.getByRole("heading", { name: es.paused })).toBeVisible();
  const upgraded = await nativeSnapshot(candidate);
  expect(expectEmptyColumnStores(upgraded)).toEqual(old.stores);
  const script = await candidate.locator('script[type="module"][src]').getAttribute("src");
  const style = await candidate.locator('link[rel="stylesheet"]').getAttribute("href");
  expect(script).not.toBe(oldEntry);
  expect(files).toEqual(expect.arrayContaining([script, style]));
  const actualAssets = await candidate.evaluate(async (cacheName) => {
    const candidateCache = await caches.open(cacheName);
    return Object.fromEntries(await Promise.all((await candidateCache.keys()).map(async (key) => {
      const asset = (await candidateCache.match(key))!;
      const bytes = await asset.arrayBuffer();
      const sha = await crypto.subtle.digest("SHA-256", bytes);
      return [new URL(key.url).pathname, Array.from(new Uint8Array(sha), (byte) => byte.toString(16).padStart(2, "0")).join("")];
    })));
  }, cache!);
  expect(actualAssets).toEqual(expectedAssets);

  await openParent(candidate, "settings", "4321");
  await expect(candidate.getByLabel(es.theme, { exact: true })).toHaveValue("dark");
  await expect(candidate.getByLabel("Objetivo diario")).toHaveValue("5");
  await expect(candidate.getByRole("switch", { name: "Animaciones" })).not.toBeChecked();
  await button(candidate, es.childMode).click();
  await button(candidate, es.resumeLearning).click();
  await expect(answer(candidate)).toHaveValue("42");
  await expect(candidate.locator(".equation")).toHaveAttribute("aria-label", equation!);
  await button(candidate, es.pause).click();
  await expect(candidate.getByRole("heading", { name: es.paused })).toBeVisible();

  await candidate.goto("./#home");
  await candidate.getByRole("link", { name: new RegExp("^" + es.columnTitle) }).click();
  await button(candidate, es.columnAddition).click();
  const board = candidate.locator(".column-board");
  await expect(board).toHaveAccessibleName(/^\d{3} \+ \d{3} en columna$/);
  const exercise = await board.getAttribute("aria-label");
  await expect(board.locator(".column-answer")).toHaveText(["", "", "", ""]);
  await expect(board.locator('[aria-pressed="true"]')).toHaveCount(0);
  await board.locator('[data-column-mark="1"]').click();
  await board.locator('[data-column-mark="3"]').click();
  await board.locator('[data-column-place="0"]').press("7");
  await candidate.keyboard.press("0");
  await button(candidate, es.confirm).click();
  await expect(board.locator('[data-mismatch="true"]')).toHaveCount(1);
  await button(candidate, es.columnHint).click();
  await expect(candidate.getByRole("region", { name: es.columnExplanation })).toBeVisible();
  await button(candidate, es.columnHideHint).click();
  await button(candidate, es.pause).click();
  await expect(candidate.getByRole("heading", { name: es.paused })).toBeVisible();
  const saved = rows<ColumnSessionRow>(await nativeSnapshot(candidate), "columnSessions");
  expect(saved).toEqual([expect.objectContaining({
    owner: null,
    openOperation: "addition",
    session: expect.objectContaining({ draft: {
      digits: [7, 0, null, null], marks: [false, true, false, true], activePlace: 2, hintShown: true, phase: "incorrect",
    } }),
  })]);
  await candidate.close();

  const reopened = await context.newPage();
  await reopened.goto("./#column-addition");
  await expect(reopened.getByRole("heading", { name: es.paused })).toBeVisible();
  expect(rows(await nativeSnapshot(reopened), "columnSessions")).toEqual(saved);
  await button(reopened, es.resumeLearning).click();
  const resumed = reopened.locator(".column-board");
  await expect(resumed).toHaveAccessibleName(exercise!);
  await expect(resumed.locator(".column-answer")).toHaveText(["", "", "0", "7"]);
  await expect(resumed.locator('[data-mismatch="true"]')).toHaveCount(1);
  for (const cell of await resumed.locator(".column-answer").all()) await expect(cell).toBeDisabled();
  await expect(resumed.locator('[data-column-mark="1"]')).toHaveAttribute("aria-pressed", "true");
  await expect(resumed.locator('[data-column-mark="3"]')).toHaveAttribute("aria-pressed", "true");
  await expect(button(reopened, es.columnRetry)).toBeVisible();
  await expect(button(reopened, es.columnExplanation)).toBeVisible();
  await info.attach("offline-upgrade-assets.json", {
    body: JSON.stringify({ version: release.version, nativeIndexedDBVersion: upgraded.version, oldCache, cache, assets: actualAssets }, null, 2),
    contentType: "application/json",
  });
});
