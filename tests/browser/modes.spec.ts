import { expect, test } from "@playwright/test";
import { nativeSnapshot, rows } from "../support/nativeSnapshot";
import { openParent } from "../support/parentMode";
import type { LearningSession } from "../../src/engine/learning/session";

test("protected legacy and namespaced hashes require the PIN across history and reload", async ({ page }) => {
  await page.goto("./#settings");
  const shell = page.locator(".app-shell");
  const opener = page.getByRole("button", { name: "Modo adulto", exact: true });
  await expect(shell).toHaveAttribute("data-mode", "child");
  await expect(page.locator('nav a[href*="settings"], nav a[href*="results"], nav a[href*="map"]')).toHaveCount(0);
  await expect(page.getByRole("button", { name: "Elegir copia para importar" })).toHaveCount(0);

  await page.locator('nav a[href="#achievements"]').click();
  await expect(shell).toHaveAttribute("data-screen", "achievements");
  await page.goto("./#parent/settings");
  await expect(shell).toHaveAttribute("data-screen", "home");
  await page.goBack();
  await expect(shell).toHaveAttribute("data-screen", "achievements");
  await page.goForward();
  await expect(shell).toHaveAttribute("data-mode", "child");

  await opener.focus();
  await opener.press("Enter");
  const dialog = page.getByRole("dialog", { name: "Modo adulto" });
  const pin = dialog.getByLabel("PIN para adultos");
  await expect(pin).toBeFocused();
  const enter = dialog.getByRole("button", { name: "Entrar", exact: true });
  for (const malformed of ["", "12", "ab12"]) {
    await pin.fill(malformed);
    await enter.click();
    await expect(dialog.getByRole("alert")).toHaveText("Introduce cuatro cifras.");
    await expect(pin).toBeFocused();
  }
  await pin.fill("1000");
  await pin.press("Enter");
  await expect(dialog.getByRole("alert")).toContainText("El PIN no es correcto");
  await expect(pin).toBeFocused();
  await page.keyboard.press("Escape");
  await expect(dialog).toHaveCount(0);
  await expect(opener).toBeFocused();

  await openParent(page);
  await expect(shell).toHaveAttribute("data-screen", "settings");
  await page.getByRole("button", { name: "Modo infantil", exact: true }).click();
  await expect(shell).toHaveAttribute("data-screen", "achievements");
  await page.goBack();
  await page.goForward();
  await expect(shell).toHaveAttribute("data-mode", "child");
  await page.goto("./#parent/weak?pair=mul%3A8%3A7");
  await expect(shell).toHaveAttribute("data-screen", "home");
  await openParent(page);
  await expect(shell).toHaveAttribute("data-screen", "weak");
  await expect(page).toHaveURL(/pair=mul%3A7%3A8$/);
  await page.reload();
  await expect(shell).toHaveAttribute("data-mode", "child");
  await expect(page.getByRole("button", { name: "Empezar a practicar" })).toHaveCount(0);
});

test("localized PIN change and deliberate reset preserve learning and persist the theme", async ({ page }) => {
  await page.goto("./#training");
  await page.getByRole("button", { name: "Empezar a practicar" }).click();
  const input = page.getByRole("textbox");
  await input.fill("0");
  await input.press("Enter");
  await expect(page.getByRole("status")).toContainText("La respuesta correcta");
  await openParent(page, "settings");
  const baseline = await nativeSnapshot(page);

  await page.getByRole("combobox", { name: "Tema" }).selectOption("dark");
  await expect(page.locator(".app-shell")).toHaveAttribute("data-theme", "dark");
  await page.getByRole("button", { name: "Русский" }).first().click();
  await expect(page.locator("html")).toHaveAttribute("lang", "ru");
  const newPin = page.getByLabel("Новый PIN");
  await newPin.fill("42a");
  await page.getByRole("button", { name: "Изменить PIN" }).click();
  await expect(page.getByRole("alert")).toHaveText("Введите четыре цифры.");
  await expect(newPin).toBeFocused();
  await newPin.fill("0427");
  await page.getByRole("button", { name: "Изменить PIN" }).click();
  await expect(page.getByText("PIN изменён.")).toBeVisible();
  const saved = await nativeSnapshot(page);
  const verifiers = rows<{ id: string; salt: Uint8Array; hash: Uint8Array; version: number }>(saved, "parentGate");
  expect(verifiers).toHaveLength(1);
  expect(Object.keys(verifiers[0]!).sort()).toEqual(["hash", "id", "salt", "version"]);
  expect(Object.values(verifiers[0]!.salt)).toHaveLength(16);
  expect(Object.values(verifiers[0]!.hash)).toHaveLength(32);

  await page.reload();
  await expect(page.locator(".app-shell")).toHaveAttribute("data-mode", "child");
  await expect(page.locator(".app-shell")).toHaveAttribute("data-theme", "dark");
  await page.getByRole("button", { name: "Для родителей", exact: true }).click();
  const dialog = page.getByRole("dialog");
  await dialog.getByLabel("PIN для родителей").fill("1234");
  await dialog.getByRole("button", { name: "Войти", exact: true }).click();
  await expect(dialog.getByRole("alert")).toContainText("Неверный PIN");
  await dialog.getByRole("button", { name: "Сбросить PIN", exact: true }).click();
  await expect(dialog.getByRole("button", { name: "Отмена" })).toBeFocused();
  await page.keyboard.press("Escape");
  await expect(dialog.getByLabel("PIN для родителей")).toBeFocused();
  expect(rows(await nativeSnapshot(page), "parentGate")).toEqual(verifiers);
  await dialog.getByRole("button", { name: "Отмена" }).click();

  await openParent(page, undefined, "0427");
  await page.getByRole("button", { name: "Детский режим", exact: true }).click();
  await page.getByRole("button", { name: "Для родителей", exact: true }).click();
  await dialog.getByRole("button", { name: "Сбросить PIN", exact: true }).click();
  await dialog.getByRole("button", { name: "Сбросить", exact: true }).click();
  await expect(dialog.getByRole("status")).toHaveText("PIN снова 1234.");
  await dialog.getByLabel("PIN для родителей").fill("1234");
  await dialog.getByRole("button", { name: "Войти", exact: true }).click();
  await expect(page.locator(".app-shell")).toHaveAttribute("data-mode", "parent");
  const after = await nativeSnapshot(page);
  expect(rows(after, "parentGate")).toEqual([]);
  expect(after.stores.filter(({ name }) => name !== "parentGate" && name !== "settings"))
    .toEqual(baseline.stores.filter(({ name }) => name !== "parentGate" && name !== "settings"));
});

test("opening and cancelling the PIN overlay aborts a pending submit and preserves targeted feedback", async ({ page }) => {
  await page.goto("./#weak?pair=mul%3A8%3A7");
  await page.getByRole("button", { name: "Empezar a practicar" }).click();
  const input = page.getByRole("textbox");
  await input.fill("0");
  const before = rows<LearningSession>(await nativeSnapshot(page), "sessions")[0]!;
  await page.evaluate(() => {
    document.querySelector<HTMLFormElement>("main form")!.requestSubmit();
    document.querySelector<HTMLButtonElement>(".mode-switch")!.click();
  });
  const dialog = page.getByRole("dialog");
  await expect(dialog).toBeVisible();
  const overlay = await nativeSnapshot(page);
  const session = rows<LearningSession>(overlay, "sessions")[0]!;
  expect(session).toMatchObject({ id: before.id, phase: "question", cursor: 0, draft: "0", targetPair: "mul:7:8" });
  expect(rows(overlay, "attempts")).toHaveLength(0);
  await page.waitForTimeout(300);
  expect(await nativeSnapshot(page)).toEqual(overlay);
  await dialog.getByRole("button", { name: "Cancelar" }).click();
  await page.getByRole("button", { name: "Continuar práctica" }).click();
  await expect(input).toHaveValue("0");
  await input.press("Enter");
  await expect(page.getByRole("status")).toContainText("La respuesta correcta");
  const submitted = await nativeSnapshot(page);
  const feedback = rows<LearningSession>(submitted, "sessions")[0]!;
  expect(feedback.repeats).toHaveLength(1);

  await page.getByRole("button", { name: "Modo adulto", exact: true }).click();
  await page.waitForTimeout(300);
  expect(await nativeSnapshot(page)).toEqual(submitted);
  await dialog.getByRole("button", { name: "Cancelar" }).click();
  await expect(page.getByRole("status")).toContainText("La respuesta correcta");
  await openParent(page, "settings");
  await page.waitForTimeout(300);
  expect(await nativeSnapshot(page)).toEqual(submitted);
  await page.getByRole("button", { name: "Modo infantil", exact: true }).click();
  await expect(page).toHaveURL(/#weak\?pair=mul%3A7%3A8$/);
  await expect(page.getByRole("status")).toContainText("La respuesta correcta");
  await expect(page.locator(".equation")).toHaveAttribute("aria-label", /7 × 8|8 × 7/);
  expect(await nativeSnapshot(page)).toEqual(submitted);
  await page.getByRole("button", { name: "Siguiente", exact: true }).click();
  await expect(input).toHaveValue("");
  expect(rows(await nativeSnapshot(page), "attempts")).toHaveLength(1);
});
