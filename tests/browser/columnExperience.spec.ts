import { expect, test, type Page } from "@playwright/test";
import type { ColumnSessionRow } from "../../src/database/db";
import type { ColumnAttempt } from "../../src/engine/column/session";
import es from "../../src/locales/es.json" with { type: "json" };
import ru from "../../src/locales/ru.json" with { type: "json" };
import { columnExamples, importColumnFixture } from "../support/columnFixtures";
import { measureContrast } from "../support/contrast";
import { nativeSnapshot, rows } from "../support/nativeSnapshot";

const [largeSum, shortSum, borrowZero, shortDifference, zero] = columnExamples;
const board = (page: Page) => page.locator(".column-board");
const cell = (page: Page, place: number) => page.locator('.column-answer[data-column-place="' + place + '"]');
const mark = (page: Page, place: number) => page.locator('[data-column-mark="' + place + '"]');
const button = (page: Page, name: string) => page.getByRole("button", { name, exact: true });

async function choose(page: Page, operation: "addition" | "subtraction") {
  await page.getByRole("button", { name: operation === "addition" ? /^Suma/ : /^Resta/ }).click();
  await expect(board(page)).toHaveAttribute("data-operation", operation);
}

async function homeToColumn(page: Page) {
  await page.getByRole("link", { name: /^Cálculo en columna/ }).click();
}

async function digit(page: Page, value: string) {
  await page.getByRole("group", { name: es.keypad }).getByRole("button", { name: value, exact: true }).tap();
}

async function answer(page: Page, value: string) {
  await cell(page, 0).focus();
  for (const key of [...value].reverse()) await page.keyboard.press(key);
}

async function setHidden(page: Page, hidden: boolean) {
  await page.evaluate((value) => {
    Object.defineProperty(document, "hidden", { configurable: true, value });
    document.dispatchEvent(new Event("visibilitychange"));
  }, hidden);
}

async function openRows(page: Page) {
  return rows<ColumnSessionRow>(await nativeSnapshot(page), "columnSessions").filter((row) => !!row.openOperation);
}

async function haveDraft(page: Page, place: number, digits: string[], marks: number[]) {
  await expect(board(page).locator(".column-answer")).toHaveText(digits);
  await expect(cell(page, place)).toHaveAttribute("aria-current", "step");
  for (const index of marks) await expect(mark(page, index)).toHaveAttribute("aria-pressed", "true");
}

async function assertFits(page: Page) {
  const { width, height } = page.viewportSize()!;
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(width);
  const sizes = await page.locator(".column-board button, .column-controls .keypad button").evaluateAll((nodes) =>
    nodes.map((node) => {
      const { width, height } = node.getBoundingClientRect();
      return Math.min(width, height);
    }),
  );
  expect(Math.min(...sizes)).toBeGreaterThanOrEqual(44);
  const pad = (await page.getByRole("group", { name: /Teclado numérico|Цифровая клавиатура/ }).boundingBox())!;
  expect(pad.y).toBeGreaterThanOrEqual(0);
  const bottom = width === 390 ? (await page.locator("nav").boundingBox())!.y : height;
  expect(pad.y + pad.height).toBeLessThanOrEqual(bottom);
  const hint = (await page.locator(".column-hint-button").boundingBox())!;
  expect(hint.y + hint.height).toBeLessThanOrEqual(bottom);
}

test("two-action entry, independent first drafts, keyboard focus and rapid exit to the same operation", async ({ page }, info) => {
  await page.emulateMedia({ colorScheme: "light", reducedMotion: "reduce" });
  await page.goto("./");
  const cards = page.locator("main .module-card");
  await expect(cards).toHaveCount(2);
  await expect(cards.locator("svg.module-art")).toHaveCount(2);
  await expect(page.getByRole("heading", { name: es.childTablesProgress })).toBeVisible();
  await expect(page.getByRole("link", { name: es.childTablesRewards }).last()).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(page.viewportSize()!.width);
  await page.screenshot({ path: info.outputPath("home-light-es.png"), fullPage: true });
  await page.emulateMedia({ colorScheme: "dark" });
  await button(page, es.russian).click();
  await expect(page.locator("html")).toHaveAttribute("lang", "ru");
  await expect(page.locator("html")).toHaveCSS("color-scheme", "dark");
  await page.screenshot({ path: info.outputPath("home-dark-ru.png"), fullPage: true });

  const columnCard = page.getByRole("link", { name: /^Столбиком/ });
  await columnCard.focus();
  await page.keyboard.press("Enter");
  const add = button(page, ru.columnAddition);
  await add.focus();
  await page.keyboard.press("Enter");
  await expect(board(page)).toHaveAccessibleName(/^\d{3} \+ \d{3} столбиком$/);
  await haveDraft(page, 0, ["", "", "", ""], []);
  await expect(page.locator("#column-explanation")).toHaveCount(0);
  await expect(button(page, ru.confirm)).toBeDisabled();
  await assertFits(page);
  const active = cell(page, 0);
  expect((await measureContrast(active, "Active column outline", 3, "border-top-color", "inside")).ratio).toBeGreaterThanOrEqual(3);
  await button(page, ru.spanish).click();
  await cell(page, 2).focus();
  await page.keyboard.press("Tab");
  await expect(cell(page, 1)).toBeFocused();
  await page.keyboard.press("4");
  await expect(cell(page, 1)).toHaveText("4");
  await expect(cell(page, 2)).toBeFocused();
  await page.keyboard.press("ArrowRight");
  await page.keyboard.press("Delete");
  await expect(cell(page, 1)).toHaveText("");
  await page.keyboard.press("ArrowRight");
  await page.keyboard.press("0");
  await page.keyboard.press("Backspace");
  await expect(cell(page, 0)).toHaveText("");
  await cell(page, 3).focus();
  await page.keyboard.press("1");
  await expect(cell(page, 3)).toHaveText("1");
  await page.keyboard.press("Delete");
  await mark(page, 3).focus();
  await page.keyboard.press("Enter");
  await expect(mark(page, 3)).toHaveText("1");
  expect(rows(await nativeSnapshot(page), "columnAttempts")).toHaveLength(0);

  await page.evaluate((saveLabel) => {
    const el = document.querySelector<HTMLButtonElement>('[data-column-place="0"]')!;
    el.focus();
    for (const key of ["3", "3", "2"]) {
      document.activeElement!.dispatchEvent(new KeyboardEvent("keydown", { key, bubbles: true, cancelable: true }));
    }
    [...document.querySelectorAll<HTMLButtonElement>(".column-actions button")].find((b) => b.textContent === saveLabel)!.click();
  }, es.childSaveAndExit);
  await expect(page).toHaveURL(/#columns$/);
  expect((await openRows(page))[0]).toMatchObject({ owner: null, session: { draft: { digits: [3, 3, 2, null], activePlace: 3 } } });
  await choose(page, "addition");
  await haveDraft(page, 3, ["", "2", "3", "3"], [3]);

  await page.getByRole("link", { name: es.home, exact: true }).last().click();
  await homeToColumn(page);
  await choose(page, "subtraction");
  await expect(board(page)).toHaveAccessibleName(/^\d{3} − \d{3} en columna$/);
  await haveDraft(page, 0, ["", "", ""], []);
  await expect(page.locator("#column-explanation")).toHaveCount(0);
  expect(await openRows(page)).toHaveLength(2);
  expect(rows(await nativeSnapshot(page), "sessions")).toHaveLength(0);
  await expect(button(page, es.columnSkip)).toHaveCount(0);
  await expect(button(page, es.endSession)).toHaveCount(0);
  await button(page, es.pause).click();
  await expect(page.getByRole("heading", { name: es.paused })).toBeVisible();
  await button(page, es.columnSkip).click();
  await expect(page.getByText("Ejercicio 2 de 6")).toBeVisible();
  const snapshot = await nativeSnapshot(page);
  expect(rows<ColumnSessionRow>(snapshot, "columnSessions").find(({ openOperation }) => openOperation === "subtraction")?.session.summary.skipped).toBe(1);
  expect(rows(snapshot, "columnAttempts")).toHaveLength(0);
});

test("586 + 647 and 604 − 187 keep marked drafts through pause, operation selection, parent and offline reload", async ({ page, context }, info) => {
  await page.emulateMedia({ colorScheme: "light", reducedMotion: "reduce" });
  await page.clock.install();
  await importColumnFixture(page, largeSum, borrowZero);
  await homeToColumn(page);
  await choose(page, "addition");
  await expect(board(page)).toHaveAccessibleName("586 + 647 en columna");
  for (const place of [1, 2, 3]) await mark(page, place).tap();
  for (const value of ["3", "3", "2"]) await digit(page, value);
  await haveDraft(page, 3, ["", "2", "3", "3"], [1, 2, 3]);
  await assertFits(page);
  await page.screenshot({ path: info.outputPath("addition-233-light-es.png"), fullPage: true });
  await button(page, es.pause).click();
  await expect(page.getByRole("heading", { name: es.paused })).toBeVisible();
  expect((await openRows(page)).find(({ openOperation }) => openOperation === "addition")?.owner).toBeNull();
  await button(page, es.resumeLearning).click();
  await haveDraft(page, 3, ["", "2", "3", "3"], [1, 2, 3]);
  await button(page, es.childSaveAndExit).click();
  await choose(page, "subtraction");
  await expect(board(page)).toHaveAccessibleName("604 − 187 en columna");
  await page.emulateMedia({ colorScheme: "dark" });
  await button(page, es.russian).click();
  await mark(page, 2).tap();
  await mark(page, 1).tap();
  await answer(page, "17");
  await haveDraft(page, 2, ["", "1", "7"], [1, 2]);
  await expect(mark(page, 1)).toHaveAccessibleName("Десятки, 0, отметка заимствования");
  await assertFits(page);
  await page.screenshot({ path: info.outputPath("subtraction-17-dark-ru.png"), fullPage: true });
  for (const place of [0, 1]) {
    await cell(page, place).focus();
    await page.keyboard.press("Delete");
  }
  await expect(board(page).locator(".column-answer")).toHaveText(["", "", ""]);
  await page.evaluate(() => {
    document.querySelector<HTMLButtonElement>('[data-column-place="0"]')!.focus();
    for (const key of ["7", "1"]) {
      document.activeElement!.dispatchEvent(new KeyboardEvent("keydown", { key, bubbles: true, cancelable: true }));
    }
    document.querySelector<HTMLButtonElement>(".mode-switch")!.click();
  });
  const dialog = page.getByRole("dialog");
  await expect(dialog.getByLabel(ru.parentPin)).toBeFocused();
  await page.keyboard.type("1234");
  await expect(dialog.getByLabel(ru.parentPin)).toHaveValue("1234");
  await page.keyboard.press("Enter");
  await expect(button(page, ru.childMode)).toBeVisible();
  await button(page, ru.childMode).click();
  await expect(page).toHaveURL(/#column-subtraction$/);
  await button(page, ru.resumeLearning).click();
  await haveDraft(page, 2, ["", "1", "7"], [1, 2]);
  await button(page, ru.pause).click();
  await expect(page.getByRole("heading", { name: ru.paused })).toBeVisible();
  await expect.poll(() => page.evaluate(() => !!navigator.serviceWorker.controller)).toBe(true);

  await context.setOffline(true);
  const saved = await openRows(page);
  await page.reload();
  await expect(page.getByRole("heading", { name: ru.paused })).toBeVisible();
  expect(await openRows(page)).toEqual(saved);
  await button(page, ru.resumeLearning).click();
  await haveDraft(page, 2, ["", "1", "7"], [1, 2]);
  await page.keyboard.press("4");
  await page.keyboard.press("Enter");
  await expect(page.getByRole("status")).toHaveText(ru.correct);
  await page.clock.fastForward(800);
  await expect(page.getByText("Пример 2 из 6")).toBeVisible();
  await button(page, ru.childSaveAndExit).click();
  await button(page, ru.spanish).click();
  await choose(page, "addition");
  await haveDraft(page, 3, ["", "2", "3", "3"], [1, 2, 3]);
  await digit(page, "1");
  await button(page, es.confirm).click();
  await expect(page.getByRole("status")).toHaveText(es.correct);
  const snapshot = await nativeSnapshot(page);
  expect(rows<ColumnAttempt>(snapshot, "columnAttempts")).toEqual(expect.arrayContaining([
    expect.objectContaining({ answer: 1233, independent: true, hintShown: false }),
    expect.objectContaining({ answer: 417, independent: true, hintShown: false }),
  ]));
  expect(rows(snapshot, "rewards")).toEqual([]);
});

for (const example of [shortSum, shortDifference, zero]) {
  test(`${example.top} and ${example.bottom} accept ${example.answer} with omitted leading cells`, async ({ page }) => {
    await page.clock.install();
    await importColumnFixture(page, example);
    await homeToColumn(page);
    await choose(page, example.operation);
    await expect(board(page)).toHaveAccessibleName(
      `${example.top} ${example.operation === "addition" ? "+" : "−"} ${example.bottom} en columna`,
    );
    await expect(button(page, es.confirm)).toBeDisabled();
    await answer(page, example.answer);
    await expect(cell(page, example.answer.length)).toHaveText("");
    await page.keyboard.press("Enter");
    await expect(page.getByRole("status")).toHaveText(es.correct);
    const attempts = rows<ColumnAttempt>(await nativeSnapshot(page), "columnAttempts");
    expect(attempts).toHaveLength(1);
    expect(attempts[0]).toMatchObject({
      answer: Number(example.answer), independent: true, hintShown: false,
      input: { digits: [...[...example.answer].reverse().map(Number), ...Array<null>(4 - example.answer.length).fill(null)] },
    });

    if (example === shortSum) {
      await page.clock.fastForward(800);
      for (let ordinal = 2; ordinal <= 6; ordinal++) {
        await expect(page.getByText(`Ejercicio ${ordinal} de 6`)).toBeVisible();
        const [, first, sign, second] = (await board(page).getAttribute("aria-label"))!.split(/^(\d{3}) (\+|−) (\d{3})/);
        await answer(page, String(sign === "+" ? Number(first) + Number(second) : Number(first) - Number(second)));
        await page.keyboard.press("Enter");
        await expect(page.getByRole("status")).toHaveText(es.correct);
        await page.clock.fastForward(800);
      }
      await expect(page.getByRole("heading", { name: es.columnComplete })).toBeVisible();
      await expect(page.getByText("Ejercicios resueltos: 6")).toBeVisible();
      const sessions = rows<ColumnSessionRow>(await nativeSnapshot(page), "columnSessions");
      expect(sessions.find(({ session }) => session.id === "addition-example")?.session.end?.reason).toBe("complete");
    }
    if (example === shortDifference) {
      await button(page, es.pause).click();
      await expect(page.getByRole("heading", { name: es.paused })).toBeVisible();
      await button(page, es.endSession).click();
      await expect(page.getByRole("heading", { name: es.columnComplete })).toBeVisible();
      await expect(page.getByText("Ejercicios resueltos: 1")).toBeVisible();
      const sessions = rows<ColumnSessionRow>(await nativeSnapshot(page), "columnSessions");
      expect(sessions.find(({ session }) => session.id === "subtraction-example")?.session.end?.reason).toBe("early");
    }
  });
}

test("incorrect feedback persists before deliberate help and retry and preserves first-check evidence", async ({ page }, info) => {
  await page.clock.install();
  await importColumnFixture(page, borrowZero);
  await homeToColumn(page);
  await choose(page, "subtraction");
  await mark(page, 2).tap();
  await mark(page, 1).tap();
  await answer(page, "107");
  await page.keyboard.press("Enter");
  await expect(cell(page, 1)).toHaveAttribute("data-mismatch", "true");
  await expect(board(page).locator(".column-answer")).toHaveText(["1", "0", "7"]);
  await page.clock.fastForward(60_000);
  await expect(page.getByText("Ejercicio 1 de 6")).toBeVisible();
  await button(page, es.columnHint).click();
  const explanation = page.getByRole("region", { name: es.columnExplanation });
  for (const work of ["14 − 7 = 7", "9 − 8 = 1", "5 − 1 = 4"]) await expect(explanation.getByText(work)).toBeVisible();
  expect((await openRows(page)).find(({ openOperation }) => openOperation === "subtraction")?.session.draft?.hintShown).toBe(true);
  await page.screenshot({ path: info.outputPath("subtraction-wrong-with-help-es.png"), fullPage: true });
  await button(page, es.columnHideHint).click();
  await button(page, es.pause).click();
  await expect(page.getByRole("heading", { name: es.paused })).toBeVisible();
  await page.screenshot({ path: info.outputPath("subtraction-paused-es.png"), fullPage: true });
  await page.reload();
  await button(page, es.resumeLearning).click();
  await expect(cell(page, 1)).toHaveAttribute("data-mismatch", "true");
  await expect(mark(page, 2)).toHaveAttribute("aria-pressed", "true");
  await expect(mark(page, 1)).toHaveAttribute("aria-pressed", "true");
  await expect(button(page, es.columnExplanation)).toBeVisible();
  await button(page, es.columnRetry).click();
  await expect(cell(page, 1)).toHaveAttribute("aria-current", "step");
  await expect(cell(page, 1)).toBeFocused();
  await page.keyboard.press("1");
  await page.keyboard.press("4");
  await page.keyboard.press("Enter");
  await expect(page.getByRole("status")).toHaveText(es.correct);
  const attempts = rows<ColumnAttempt>(await nativeSnapshot(page), "columnAttempts");
  expect(attempts).toEqual([
    expect.objectContaining({ checkNumber: 1, answer: 107, firstMismatch: 1, hintShown: false, correct: false }),
    expect.objectContaining({ checkNumber: 2, answer: 417, hintShown: true, independent: false, correct: true }),
  ]);
});

test("hidden and cross-tab feedback cannot advance or acquire ownership on passive reload", async ({ page, context }) => {
  await page.clock.install();
  await importColumnFixture(page, largeSum);
  await homeToColumn(page);
  await choose(page, "addition");
  await answer(page, "1233");
  await page.keyboard.press("Enter");
  await expect(page.getByRole("status")).toHaveText(es.correct);
  await setHidden(page, true);
  await expect(page.getByRole("heading", { name: es.paused })).toBeVisible();
  const saved = await openRows(page);
  expect(saved[0]).toMatchObject({ owner: null, session: { draft: { phase: "correct" } } });
  await page.clock.fastForward(60_000);
  await setHidden(page, false);
  expect(await openRows(page)).toEqual(saved);
  await page.reload();
  await expect(page.getByRole("heading", { name: es.paused })).toBeVisible();
  expect(await openRows(page)).toEqual(saved);
  await button(page, es.resumeLearning).click();
  await expect(page.getByRole("status")).toHaveText(es.correct);
  await setHidden(page, false);
  await page.clock.fastForward(60_000);
  await expect(page.getByText("Ejercicio 1 de 6")).toBeVisible();

  const other = await context.newPage();
  await other.goto("./#column-addition");
  await expect(other.getByRole("heading", { name: es.paused })).toBeVisible();
  await button(other, es.resumeLearning).click();
  await expect(other.getByRole("status")).toHaveText(es.correct);
  await expect(page.getByRole("alert")).toHaveText(es.columnStale);
  const claimed = await openRows(other);
  await button(page, es.retryLoad).click();
  await expect(page.getByRole("heading", { name: es.paused })).toBeVisible();
  expect(await openRows(other)).toEqual(claimed);
  await button(other, es.next).click();
  await expect(other.getByText("Ejercicio 2 de 6")).toBeVisible();
  expect(rows(await nativeSnapshot(other), "columnAttempts")).toHaveLength(1);
});
