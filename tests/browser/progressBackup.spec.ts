import { readFile } from "node:fs/promises";
import { expect, test, type Page } from "@playwright/test";
import { goParent, openParent } from "../support/parentMode";

async function answer(page: Page) {
  await expect(page.getByRole("textbox")).toBeEnabled();
  const equation = await page.locator(".equation").getAttribute("aria-label");
  const [a, b] = equation!.split(" × ").map(Number);
  await page.getByRole("textbox").fill(String(a! * b!));
  await page.getByRole("textbox").press("Enter");
  await expect(page.getByRole("status")).toContainText("¡Correcto!");
}
async function snapshot(page: Page) {
  return page.evaluate(async () => {
    const request = indexedDB.open("math-hero");
    const db = await new Promise<IDBDatabase>((resolve, reject) => {
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
    const result: Record<string, unknown[]> = {};
    const tx = db.transaction([...db.objectStoreNames], "readonly");
    await Promise.all(
      [...db.objectStoreNames].map(
        (name) =>
          new Promise<void>((resolve, reject) => {
            const r = tx.objectStore(name).getAll();
            r.onsuccess = () => {
              result[name] = r.result;
              resolve();
            };
            r.onerror = () => reject(r.error);
          }),
      ),
    );
    db.close();
    return result;
  });
}

test("real stars, child results, parent history and interactive accessible map", async ({
  page,
}, info) => {
  await page.goto("./#training");
  await page.getByRole("button", { name: "Empezar a practicar" }).click();
  const first = await page.locator(".equation").getAttribute("aria-label");
  for (let n = 0; n < 5; n++) {
    await answer(page);
    if (n < 4) await expect(page.getByRole("textbox")).toBeEnabled();
  }
  await page.getByRole("button", { name: "Terminar esta práctica" }).click();
  await expect(page.getByText("Estrellas en esta práctica: 8.")).toBeVisible();
  await page.reload();
  await expect(page.getByText("Estrellas en esta práctica: 8.")).toBeVisible();
  await openParent(page, "home");
  await expect(page.locator(".overview-progress")).toContainText("8");
  await goParent(page, "results");
  await expect(page.locator(".daily-trend")).toContainText(
    "Correctas: 5 de 5.",
  );
  await expect(page.locator(".daily-trend li")).toHaveCount(1);
  await goParent(page, "map");
  await expect(page.locator("button.map-cell")).toHaveCount(144);
  const [a, b] = first!.split(" × ");
  await page.getByRole("combobox", { name: "Primer factor" }).selectOption(a!);
  await page.getByRole("combobox", { name: "Segundo factor" }).selectOption(b!);
  await expect(page.locator(".fact-detail h2")).toHaveText(
    `${first} = ${Number(a) * Number(b)}`,
  );
  await expect(
    page.locator(".fact-detail .history-list").first().locator("li"),
  ).toHaveCount(1);
  await page.getByRole("combobox", { name: "Segundo factor" }).focus();
  await page.keyboard.press("Tab");
  await expect(
    page.getByRole("link", { name: "Practicar este par", exact: false }),
  ).toBeFocused();
  await page.keyboard.press("Tab");
  await expect(page.locator('.map-cell[aria-pressed="true"]')).toBeFocused();
  await page.keyboard.press("Home");
  await expect(
    page.getByRole("combobox", { name: "Segundo factor" }),
  ).toHaveValue("1");
  expect(await page.locator('.map-cell[tabindex="0"]').count()).toBe(1);
  const cell = page.getByRole("button", { name: "12 × 12:", exact: false });
  await cell.focus();
  await page.keyboard.press("Enter");
  await expect(cell).toHaveAttribute("aria-pressed", "true");
  await expect(
    page.getByRole("combobox", { name: "Primer factor" }),
  ).toHaveValue("12");
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  await page.screenshot({ path: info.outputPath("map.png"), fullPage: true });
  await page.getByRole("link", { name: "Practicar este par" }).click();
  await page.getByRole("button", { name: "Empezar a practicar" }).click();
  await expect(page.locator(".equation")).toHaveAttribute(
    "aria-label",
    "12 × 12",
  );
});

test("downloads all data, rejects corruption, cancels unchanged and restores resumable practice with RU preferences", async ({
  page,
}, info) => {
  await page.goto("./#training");
  await page.getByRole("button", { name: "Empezar a practicar" }).click();
  await answer(page);
  await expect(page.getByRole("textbox")).toBeEnabled();
  const equation = await page.locator(".equation").getAttribute("aria-label");
  await page.getByRole("textbox").fill("42");
  await page.getByRole("button", { name: "Pausar", exact: true }).click();
  await openParent(page, "settings");
  await page
    .getByRole("combobox", { name: "Objetivo diario" })
    .selectOption("5");
  await page
    .getByRole("button", { name: "Русский", exact: true })
    .first()
    .click();
  const downloading = page.waitForEvent("download");
  await page.getByRole("button", { name: "Скачать копию" }).click();
  const download = await downloading;
  const path = info.outputPath("math-hero.json");
  await download.saveAs(path);
  const backup = JSON.parse(await readFile(path, "utf8"));
  expect(Object.keys(backup.tables).sort()).toEqual(
    [
      "sessions",
      "attempts",
      "progress",
      "settings",
      "journal",
      "rewards",
      "rewardState",
    ].sort(),
  );
  expect(backup.tables.sessions[0].draft).toBe("42");
  expect(backup.tables.attempts).toHaveLength(1);
  await page
    .getByRole("button", { name: "Español", exact: true })
    .first()
    .click();
  await page
    .getByRole("combobox", { name: "Objetivo diario" })
    .selectOption("15");
  await expect
    .poll(async () => (await snapshot(page)).settings)
    .toEqual([
      {
        id: "preferences",
        value: {
          language: "es",
          soundEnabled: false,
          animationsEnabled: true,
          dailyGoalMinutes: 15,
          theme: "system",
        },
      },
    ]);
  const before = await snapshot(page);
  const invalid = structuredClone(backup);
  invalid.tables.rewards[0].stars = 1000;
  await page.locator('input[type="file"]').setInputFiles({
    name: "invalid.json",
    mimeType: "application/json",
    buffer: Buffer.from(JSON.stringify(invalid)),
  });
  await expect(page.getByRole("alert")).toContainText("no son coherentes");
  expect(await snapshot(page)).toEqual(before);
  await page.locator('input[type="file"]').setInputFiles(path);
  await expect(page.getByRole("dialog")).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Cancelar", exact: true }),
  ).toBeFocused();
  await page.keyboard.press("Escape");
  await expect(page.getByRole("dialog")).not.toBeVisible();
  expect(await snapshot(page)).toEqual(before);
  await page.locator('input[type="file"]').setInputFiles(path);
  await page.getByRole("button", { name: "Reemplazar y restaurar" }).click();
  await expect(page.getByRole("status")).toContainText("Копия восстановлена");
  await expect(
    page.getByRole("combobox", { name: "Цель на день" }),
  ).toHaveValue("5");
  await page.locator('input[type="file"]').setInputFiles(path);
  await page.getByRole("button", { name: "Заменить и восстановить" }).click();
  await expect(page.getByRole("status")).toContainText("Копия восстановлена");
  expect((await snapshot(page)).rewards).toHaveLength(1);
  await goParent(page, "training");
  await page
    .getByRole("button", { name: "Продолжить тренировку", exact: true })
    .click();
  await expect(page.locator(".equation")).toHaveAttribute(
    "aria-label",
    equation!,
  );
  await expect(page.getByRole("textbox")).toHaveValue("42");
  await page.getByRole("button", { name: "Español", exact: true }).click();
  await answer(page);
  expect((await snapshot(page)).attempts).toHaveLength(2);
  expect((await snapshot(page)).rewards).toHaveLength(2);
});

test("goal and animation settings persist in both locales and all four calm fox states exist", async ({
  page,
}, info) => {
  await page.goto("./");
  await expect(page.locator('.mascot[data-state="greeting"]')).toBeVisible();
  await openParent(page, "settings");
  await page.getByRole("switch", { name: "Animaciones" }).click();
  await page
    .getByRole("combobox", { name: "Objetivo diario" })
    .selectOption("15");
  await expect
    .poll(async () => (await snapshot(page)).settings)
    .toEqual([
      {
        id: "preferences",
        value: {
          language: "es",
          soundEnabled: false,
          animationsEnabled: false,
          dailyGoalMinutes: 15,
          theme: "system",
        },
      },
    ]);
  await page.reload();
  await openParent(page);
  await expect(
    page.getByRole("switch", { name: "Animaciones" }),
  ).toHaveAttribute("aria-checked", "false");
  await expect(
    page.getByRole("combobox", { name: "Objetivo diario" }),
  ).toHaveValue("15");
  await goParent(page, "training");
  await page.getByRole("button", { name: "Empezar a practicar" }).click();
  await expect(page.locator('.mascot[data-state="thinking"]')).toBeVisible();
  await answer(page);
  await expect(page.locator('.mascot[data-state="happy"]')).toBeVisible();
  await expect(page.getByRole("textbox")).toBeEnabled();
  await page.getByRole("textbox").fill("0");
  await page.getByRole("textbox").press("Enter");
  await expect(page.locator('.mascot[data-state="support"]')).toBeVisible();
  await goParent(page, "results");
  await page.getByRole("button", { name: "Русский", exact: true }).click();
  await expect(page.locator(".daily-trend")).toContainText(
    "Правильно: 1 из 2.",
  );
  await page.screenshot({
    path: info.outputPath("analytics-ru.png"),
    fullPage: true,
  });
});
