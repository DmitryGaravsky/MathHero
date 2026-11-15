import { expect, test, type Page } from "@playwright/test";
import type { Reward } from "../../src/engine/learning/rewards";
import type { LearningSession } from "../../src/engine/learning/session";
import type { Attempt } from "../../src/engine/sessions/diagnostic";
import { nativeSnapshot, rows } from "../support/nativeSnapshot";

const start = "Empezar a practicar";
const resume = "Continuar práctica";
const saved = "Guardar y salir";
const next = "Siguiente";

function answerBox(page: Page) {
  return page.getByRole("textbox", { name: "Tu respuesta" });
}

async function product(page: Page) {
  const [a, b] = (await page.locator(".equation").getAttribute("aria-label"))!.split(" × ").map(Number);
  return String(a! * b!);
}

async function submit(page: Page, value: string) {
  await answerBox(page).fill(value);
  await answerBox(page).press("Enter");
}

async function setHidden(page: Page, hidden: boolean) {
  await page.evaluate((value) => {
    Object.defineProperty(document, "hidden", { configurable: true, value });
    document.dispatchEvent(new Event("visibilitychange"));
  }, hidden);
}

test("child opens to one primary action and gets to a new or saved exercise in two actions", async ({ page }, info) => {
  await page.goto("./");
  await page.emulateMedia({ reducedMotion: "reduce" });
  await expect(page.locator(".app-shell")).toHaveAttribute("data-mode", "child");
  await expect(page.locator("main .primary")).toHaveCount(1);
  await expect(page.getByRole("progressbar", { name: "multiplicaciones que ya recuerdas" })).toHaveAttribute("value", "0");
  await expect(page.getByText(/Análisis para adultos|Objetivo diario/)).toHaveCount(0);
  await expect(page.locator("nav a")).toHaveCount(3);
  await page.screenshot({ path: info.outputPath("child-home-es.png"), fullPage: true });

  await page.getByRole("link", { name: start }).click();
  await page.getByRole("button", { name: start }).click();
  await expect(answerBox(page)).toBeFocused();
  await expect(page.getByText("Pregunta 1 de 24")).toBeVisible();
  await expect(page.getByText(/CALENTAMIENTO|10 minutos/)).toHaveCount(0);
  const keypadGroup = page.getByRole("group", { name: "Teclado numérico" });
  const keypad = await keypadGroup.boundingBox();
  const viewport = page.viewportSize()!;
  expect(await page.evaluate(() => scrollY)).toBe(0);
  expect(keypad!.y).toBeGreaterThanOrEqual(0);
  expect(keypad!.y + keypad!.height).toBeLessThanOrEqual(viewport.height);
  if (viewport.width === 390) {
    const navigation = await page.locator("nav").boundingBox();
    expect(keypad!.y + keypad!.height).toBeLessThanOrEqual(navigation!.y);
  }
  if (viewport.width === 844) {
    const problem = (await page.locator(".equation").boundingBox())!;
    const answerBottom = await answerBox(page).evaluate((input) => {
      const style = getComputedStyle(input);
      const outline = style.outlineStyle === "none" ? 0 :
        parseFloat(style.outlineWidth) + parseFloat(style.outlineOffset);
      return input.getBoundingClientRect().bottom + outline;
    });
    const bottom = viewport.height - 12;
    expect(problem.y).toBeGreaterThanOrEqual(0);
    expect(Math.max(problem.y + problem.height, answerBottom, keypad!.y + keypad!.height)).toBeLessThanOrEqual(bottom);
    const targetSizes = await keypadGroup.getByRole("button").evaluateAll((buttons) =>
      buttons.map((button) => Math.min(button.clientWidth, button.getBoundingClientRect().height)),
    );
    expect(Math.min(...targetSizes)).toBeGreaterThanOrEqual(44);
    await page.screenshot({ path: info.outputPath("child-exercise-viewport.png") });
  }
  const equation = await page.locator(".equation").getAttribute("aria-label");
  await page.getByRole("button", { name: "4", exact: true }).click();
  await page.getByRole("button", { name: "2", exact: true }).click();
  await expect(answerBox(page)).toHaveValue("42");
  await page.getByRole("link", { name: saved }).click();
  await expect(page.getByRole("link", { name: resume })).toBeVisible();
  await page.reload();
  await page.getByRole("link", { name: resume }).click();
  await page.getByRole("button", { name: resume }).click();
  await expect(answerBox(page)).toBeFocused();
  await expect(answerBox(page)).toHaveValue("42");
  await expect(page.locator(".equation")).toHaveAttribute("aria-label", equation!);
  await page.getByRole("link", { name: saved }).click();

  await page.locator("main").getByRole("link", { name: "Tus logros" }).click();
  await expect(page.getByRole("heading", { name: "Tus logros" })).toBeVisible();
  await expect(page.getByText("Por descubrir", { exact: true })).toHaveCount(6);
  await page.getByRole("button", { name: "Русский", exact: true }).click();
  await expect(page.locator(".child-badges li")).toHaveCount(6);
  await expect(page.locator("html")).toHaveAttribute("lang", "ru");
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.screenshot({ path: info.outputPath("child-achievements-ru.png"), fullPage: true });
});

test("a slow correct answer advances, while correcting a wrong answer remains deliberate and earns nothing twice", async ({ page }, info) => {
  await page.clock.install();
  await page.goto("./#training");
  await page.getByRole("button", { name: start }).click();
  await expect(answerBox(page)).toBeFocused();
  await page.clock.fastForward(5000);
  await submit(page, await product(page));
  await expect(page.getByRole("status")).toHaveText("¡Correcto!");
  const feedback = await nativeSnapshot(page);
  expect(rows<LearningSession>(feedback, "sessions")[0]).toMatchObject({ cursor: 1, phase: "feedback", activeMs: 0 });
  expect(rows<Attempt>(feedback, "attempts")[0]!.responseTimeMs).toBeGreaterThanOrEqual(5000);
  await page.clock.fastForward(800);
  await expect(page.getByText("Pregunta 2 de 24")).toBeVisible();
  await expect(answerBox(page)).toBeFocused();

  const expected = await product(page);
  await submit(page, "0");
  await expect(page.getByRole("status")).toContainText("La respuesta correcta");
  const wrong = await nativeSnapshot(page);
  expect(rows<Attempt>(wrong, "attempts").find((attempt) => !attempt.correct)!.responseTimeMs).toBeLessThan(2000);
  await page.clock.fastForward(60_000);
  expect(await nativeSnapshot(page)).toEqual(wrong);
  await page.getByRole("button", { name: "Probar con la respuesta correcta" }).click();
  const correction = page.getByRole("textbox", { name: "Escribe la respuesta correcta" });
  await expect(correction).toBeFocused();
  await correction.fill("0");
  await correction.press("Enter");
  await expect(page.getByRole("status")).toContainText("Mira el resultado");
  await correction.fill(expected);
  await correction.press("Enter");
  await expect(page.getByRole("status")).toContainText("¡Eso es!");
  await page.clock.fastForward(60_000);
  expect(await nativeSnapshot(page)).toEqual(wrong);
  await page.screenshot({ path: info.outputPath("child-correction-es.png"), fullPage: true });
  await page.getByRole("button", { name: next, exact: true }).click();
  await expect(page.getByText("Pregunta 3 de 24")).toBeVisible();
  const advanced = await nativeSnapshot(page);
  expect(rows(advanced, "attempts")).toEqual(rows(wrong, "attempts"));
  expect(rows(advanced, "rewards")).toEqual(rows(wrong, "rewards"));

  await submit(page, await product(page));
  await expect(page.getByRole("status")).toHaveText("¡Correcto!");
  const correct = await nativeSnapshot(page);
  const third = rows<Attempt>(correct, "attempts").find((attempt) => attempt.ordinal === 2)!;
  expect(third.responseTimeMs).toBeLessThan(5000);
  await page.getByRole("button", { name: next, exact: true }).evaluate((button) => {
    (button as HTMLButtonElement).click();
    (button as HTMLButtonElement).click();
  });
  await page.clock.fastForward(800);
  await expect(page.getByText("Pregunta 4 de 24")).toBeVisible();
  const latest = await nativeSnapshot(page);
  expect(rows(latest, "attempts")).toEqual(rows(correct, "attempts"));
  expect(rows(latest, "rewards")).toEqual(rows(correct, "rewards"));
});

test("hidden and PIN-covered correct feedback stays saved, and switching modes requires deliberate continuation", async ({ page }) => {
  await page.clock.install();
  await page.goto("./#training");
  await page.getByRole("button", { name: start }).click();
  await submit(page, await product(page));
  await expect(page.getByRole("status")).toHaveText("¡Correcto!");
  await setHidden(page, true);
  const feedback = await nativeSnapshot(page);
  expect(rows<LearningSession>(feedback, "sessions")[0]).toMatchObject({ phase: "feedback", cursor: 1, activeMs: 0 });
  await page.clock.fastForward(60_000);
  expect(await nativeSnapshot(page)).toEqual(feedback);

  await page.getByRole("button", { name: "Modo adulto", exact: true }).click();
  const dialog = page.getByRole("dialog");
  await expect(dialog).toBeVisible();
  await setHidden(page, false);
  await page.clock.fastForward(60_000);
  expect(await nativeSnapshot(page)).toEqual(feedback);
  await dialog.getByLabel("PIN para adultos").fill("1234");
  await dialog.getByRole("button", { name: "Entrar", exact: true }).click();
  await expect(page.locator(".app-shell")).toHaveAttribute("data-mode", "parent");
  await page.clock.fastForward(60_000);
  expect(await nativeSnapshot(page)).toEqual(feedback);
  await page.getByRole("button", { name: "Modo infantil", exact: true }).click();
  await expect(page.getByRole("status")).toHaveText("¡Correcto!");
  await page.clock.fastForward(60_000);
  expect(await nativeSnapshot(page)).toEqual(feedback);
  await page.getByRole("button", { name: next, exact: true }).click();
  await expect(page.getByText("Pregunta 2 de 24")).toBeVisible();
  const resumed = await nativeSnapshot(page);
  expect(rows(resumed, "rewards")).toEqual(rows(feedback, "rewards"));
  expect(rows(resumed, "attempts")).toEqual(rows(feedback, "attempts"));
});

test("reload and a second view do not claim or double-advance another owner's correct feedback", async ({ page, context }) => {
  await page.clock.install();
  await page.goto("./#training");
  await page.getByRole("button", { name: start }).click();
  await submit(page, await product(page));
  await expect(page.getByRole("status")).toHaveText("¡Correcto!");
  const first = await nativeSnapshot(page);
  await page.reload();
  await expect(page.getByRole("status")).toHaveText("¡Correcto!");
  await page.clock.fastForward(800);
  expect(await nativeSnapshot(page)).toEqual(first);

  const other = await context.newPage();
  await other.goto("./#training");
  await expect(other.getByRole("status")).toHaveText("¡Correcto!");
  expect(await nativeSnapshot(other)).toEqual(first);
  await other.getByRole("button", { name: next, exact: true }).click();
  await expect(other.getByText("Pregunta 2 de 24")).toBeVisible();
  await setHidden(page, false);
  await page.clock.fastForward(1000);
  const latest = await nativeSnapshot(other);
  expect(rows<LearningSession>(latest, "sessions")[0]).toMatchObject({ phase: "question", cursor: 1 });
  expect(rows<LearningSession>(latest, "sessions")[0]!.owner).not.toBe(rows<LearningSession>(first, "sessions")[0]!.owner);
  expect(rows<Attempt>(latest, "attempts")).toHaveLength(1);
  expect(rows<Reward>(latest, "rewards")).toHaveLength(1);
});

test("a still-active view yields its armed correct feedback timer when another tab continues", async ({ page, context }) => {
  await page.clock.install();
  await page.goto("./#training");
  // Keep the original adapter active when the second tab is opened in the test browser.
  await setHidden(page, false);
  await page.getByRole("button", { name: start }).click();
  const other = await context.newPage();
  await other.goto("./");
  await expect(other.getByRole("link", { name: resume })).toBeVisible();
  const now = await page.evaluate(() => Date.now());
  await page.clock.pauseAt(now + 1000);
  await submit(page, await product(page));
  await expect(page.getByRole("status")).toHaveText("¡Correcto!");
  const feedback = await nativeSnapshot(page);
  const before = rows<LearningSession>(feedback, "sessions")[0]!;
  expect(before).toMatchObject({ phase: "feedback", cursor: 1 });
  expect(rows(feedback, "attempts")).toHaveLength(1);
  expect(rows(feedback, "rewards")).toHaveLength(1);
  await other.goto("./#training");
  const armedAt = await page.evaluate(() => Date.now());
  await expect.poll(async () => {
    await page.clock.runFor(25);
    return other.locator(".input-feedback [role=status]").count();
  }).toBe(1);
  await expect(other.getByRole("status")).toHaveText("¡Correcto!");
  await expect(page.getByRole("status")).toHaveText("¡Correcto!");
  expect(await nativeSnapshot(other)).toEqual(feedback);
  await other.getByRole("button", { name: next, exact: true }).click();
  await expect.poll(async () => {
    await page.clock.runFor(25);
    return other.getByText("Pregunta 2 de 24").count();
  }).toBe(1);
  expect(await page.evaluate(() => Date.now()) - armedAt).toBeLessThan(800);
  const advanced = rows<LearningSession>(await nativeSnapshot(other), "sessions")[0]!;
  expect(advanced).toMatchObject({ phase: "question", cursor: 1 });
  expect(advanced.owner).not.toBe(before.owner);

  await page.clock.runFor(1600);
  await page.clock.resume();
  await expect(page.getByRole("alert")).toHaveCount(0);
  const latest = await nativeSnapshot(other);
  expect(rows<LearningSession>(latest, "sessions")[0]).toMatchObject({
    phase: "question", cursor: 1, owner: advanced.owner, order: advanced.order,
  });
  expect(rows<Attempt>(latest, "attempts")).toEqual(rows<Attempt>(feedback, "attempts"));
  expect(rows<Reward>(latest, "rewards")).toEqual(rows<Reward>(feedback, "rewards"));
});
