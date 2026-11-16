import { expect, test } from "@playwright/test";
import es from "../../src/locales/es.json" with { type: "json" };
import ru from "../../src/locales/ru.json" with { type: "json" };
import { goParent, openParent } from "../support/parentMode";

test("system follows live color changes, explicit preferences override them and persist on reload", async ({ page }) => {
  await page.emulateMedia({ colorScheme: "dark", reducedMotion: "reduce" });
  await page.goto("./");
  const root = page.locator("html");
  const shell = page.locator(".app-shell");
  await expect(shell).toHaveAttribute("data-theme", "system");
  await expect(root).toHaveCSS("color-scheme", "dark");
  const dark = await root.evaluate((el) => getComputedStyle(el).backgroundColor);
  await page.getByRole("link", { name: es.childTables }).click();
  await expect(page.locator('.child-practice-panel .mascot[data-state="greeting"]')).toHaveCSS("animation-name", "none");
  await page.emulateMedia({ colorScheme: "light" });
  await expect(root).toHaveCSS("color-scheme", "light");
  await expect(root).not.toHaveCSS("background-color", dark);

  await openParent(page, "settings");
  const theme = page.getByLabel(es.theme, { exact: true });
  await theme.selectOption("dark");
  await expect(root).toHaveCSS("color-scheme", "dark");
  const meta = page.locator('meta[name="theme-color"]');
  const darkChrome = await meta.getAttribute("content");
  const rgb = (hex: string) => `rgb(${hex.slice(1).match(/../g)!.map((s) => parseInt(s, 16)).join(", ")})`;
  expect(rgb(darkChrome!)).toBe(dark);
  await page.emulateMedia({ colorScheme: "dark" });
  await page.emulateMedia({ colorScheme: "light" });
  await expect(root).toHaveCSS("background-color", dark);
  await theme.selectOption("light");
  await page.emulateMedia({ colorScheme: "dark" });
  await expect(root).toHaveCSS("color-scheme", "light");
  await expect(meta).not.toHaveAttribute("content", darkChrome!);

  await page.reload();
  await expect(shell).toHaveAttribute("data-mode", "child");
  await expect(shell).toHaveAttribute("data-theme", "light");
  await expect(root).toHaveCSS("color-scheme", "light");
  await openParent(page);
  await expect(theme).toHaveValue("light");
  await theme.selectOption("system");
  await expect(root).toHaveCSS("color-scheme", "dark");
  await page.emulateMedia({ colorScheme: "light" });
  await expect(root).toHaveCSS("color-scheme", "light");
});

test("separate parent views expose diagnosis, filtered history and resumable targeted practice", async ({ page }) => {
  await page.goto("./#history");
  const shell = page.locator(".app-shell");
  await expect(shell).toHaveAttribute("data-screen", "home");
  await expect(page.getByRole("heading", { name: es.sessionHistory })).toHaveCount(0);
  await openParent(page);
  await expect(page.getByRole("heading", { name: es.sessionHistory })).toBeVisible();
  const toggle = page.getByRole("button", { name: es.parentMenu });
  if (await toggle.isVisible()) {
    await expect(toggle).toHaveAttribute("aria-expanded", "false");
    await toggle.press("Enter");
    const links = page.locator(".parent-navigation a:visible");
    await expect(links).toHaveCount(8);
    for (const link of await links.all()) {
      const bounds = (await link.boundingBox())!;
      expect(bounds.height).toBeGreaterThanOrEqual(52);
      expect(bounds.width).toBeGreaterThanOrEqual(44);
      expect(bounds.x + bounds.width).toBeLessThanOrEqual(page.viewportSize()!.width);
    }
    await page.keyboard.press("Tab");
    await expect(links.first()).toBeFocused();
    await page.keyboard.press("Escape");
    await expect(toggle).toBeFocused();
    await expect(toggle).toHaveAttribute("aria-expanded", "false");
  }

  await goParent(page, "diagnosis");
  await page.getByRole("link", { name: es.start }).click();
  await page.getByRole("button", { name: es.start }).click();
  const equation = page.locator(".equation");
  const factors = (await equation.getAttribute("aria-label"))!.split(" × ").map(Number);
  const input = page.getByRole("textbox", { name: es.answer });
  await input.fill("0");
  await input.press("Enter");
  await expect(page.locator(".input-feedback")).toHaveAttribute("data-correct", "false");
  await goParent(page, "diagnosis");
  await expect(page.getByRole("heading", { name: es.diagnosticPartial })).toBeVisible();
  await expect(page.getByText("Correctas: 0 de 1.", { exact: false })).toBeVisible();
  await expect(page.getByRole("link", { name: es.resume })).toBeVisible();
  await goParent(page, "results");
  await expect(page.getByText(es.notYet)).toBeVisible();
  await expect(page.locator(".daily-trend li")).toHaveCount(0);

  await goParent(page, "weak-spots");
  const pair = factors.join(" × ");
  const canonical = [...factors].sort((a, b) => a - b);
  const targetLink = page.getByRole("link", { name: `Practicar ${canonical.join(" × ")}`, exact: true });
  const target = canonical.join("%3A");
  await expect(targetLink).toHaveAttribute("href", `#parent/weak?pair=mul%3A${target}`);
  await targetLink.click();
  await page.getByRole("button", { name: es.startLearning }).click();
  await expect(input).toBeEditable();
  await input.fill("42");
  await goParent(page, "home");
  await expect(page.getByRole("link", { name: /^Continuar con / })).toHaveAttribute("href", `#parent/weak?pair=mul%3A${target}`);

  await goParent(page, "history");
  const mode = page.getByLabel(es.sessionType);
  await mode.selectOption("diagnostic");
  const session = page.locator(".session-history");
  await expect(session).toHaveCount(1);
  await expect(session.locator(".history-list")).toHaveCount(0);
  await session.locator("summary").click();
  await expect(session.locator(".history-list li")).toHaveCount(1);
  await expect(session.locator(".history-list li strong")).toHaveText(`${pair} = 0`);
  await mode.selectOption("weak");
  await expect(session).toHaveCount(1);
  await expect(session.locator("summary")).toContainText(es.weakSpots);

  await goParent(page, "map");
  const cell = page.getByRole("button", { name: `${pair}: ${es.difficult}` });
  await cell.tap();
  await expect(cell).toHaveAttribute("aria-pressed", "true");
  await expect(page.locator(".fact-detail h2")).toHaveText(`${pair} = ${factors[0]! * factors[1]!}`);
  await expect(page.locator(".fact-detail .history-list").first().locator("li")).toHaveCount(1);

  await goParent(page, "settings");
  const glossary = page.locator(".glossary");
  await expect(glossary.locator("dt").first()).toBeHidden();
  await glossary.locator("summary").click();
  await expect(glossary.locator("dt[lang=es]")).toHaveCount(4);
  await expect(glossary.locator("dd[lang=ru]")).toHaveCount(4);
  await expect(glossary.getByText("Producto", { exact: true })).toBeVisible();
  await page.getByRole("button", { name: ru.russian }).first().click();
  await expect(page.locator("html")).toHaveAttribute("lang", "ru");
  await expect(page.getByRole("heading", { name: ru.settingsData })).toBeVisible();

  await page.getByRole("button", { name: ru.childMode, exact: true }).click();
  const childHash = `#child/weak?pair=mul%3A${[...factors].sort((a, b) => b - a).join("%3A")}`;
  await page.goto(`./${childHash}`);
  await page.getByRole("button", { name: ru.resumeLearning, exact: true }).click();
  await expect(page.getByRole("textbox")).toHaveValue("42");
  await openParent(page, "settings");
  await page.getByRole("button", { name: ru.childMode, exact: true }).click();
  expect(new URL(page.url()).hash).toBe(`#weak?pair=mul%3A${target}`);
  await page.getByRole("button", { name: ru.resumeLearning, exact: true }).click();
  await expect(page.getByRole("textbox")).toHaveValue("42");
});
