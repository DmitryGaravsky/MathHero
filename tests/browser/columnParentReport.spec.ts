import { expect, test, type Page } from "@playwright/test";
import es from "../../src/locales/es.json" with { type: "json" };
import ru from "../../src/locales/ru.json" with { type: "json" };
import { columnProofBackup, mixedColumnReportBackup, reportDate, reportHour } from "../support/columnReportFixtures";
import { measureContrast } from "../support/contrast";
import { nativeSnapshot, rows } from "../support/nativeSnapshot";
import { goParent, openParent } from "../support/parentMode";
import type { FullBackup } from "../../src/database/backup";
import type { ColumnSessionRow } from "../../src/database/db";

const additionHash = "#parent/column-addition-report";
const subtractionHash = "#parent/column-subtraction-report";
const heading = (locale: typeof es, operation: "addition" | "subtraction") =>
  locale.columnReportHeading.replace("{operation}", operation === "addition" ? locale.columnAddition : locale.columnSubtraction);

async function importReport(page: Page, backup: FullBackup) {
  await page.goto("./");
  await openParent(page, "settings");
  await restoreReport(page, backup, es);
}

async function restoreReport(page: Page, backup: FullBackup, locale: typeof es) {
  await page.locator('input[type="file"]').setInputFiles({
    name: "column-report-example.json", mimeType: "application/json",
    buffer: Buffer.from(JSON.stringify(backup)),
  });
  await page.getByRole("dialog").getByRole("button", { name: locale.confirmRestore }).click();
  await expect(page.getByRole("status")).toHaveText(es.backupRestored);
}

async function fits(page: Page) {
  expect(await page.locator("body").evaluate((el) => el.scrollWidth)).toBeLessThanOrEqual(page.viewportSize()!.width);
}

test("guards column reports through direct hashes, history, child exit and reload", async ({ page }) => {
  const main = page.getByRole("main");
  const shell = page.locator(".app-shell");
  await page.goto("./#column-addition-report");
  await expect(shell).toHaveAttribute("data-mode", "child");
  await expect(main.getByRole("heading", { name: heading(es, "addition") })).toHaveCount(0);
  await openParent(page);
  await expect(main.getByRole("heading", { name: heading(es, "addition") })).toBeVisible();
  expect(new URL(page.url()).hash).toBe(additionHash);
  await expect(main.getByRole("region", { name: es.practiceTotals }).getByText(es.columnNoChecks)).toBeVisible();
  await expect(main.getByText("0%")).toHaveCount(0);

  const operations = page.getByRole("navigation", { name: es.columnChooseOperation });
  await expect(main).toBeFocused();
  await page.keyboard.press("Tab");
  const modules = page.getByRole("navigation", { name: es.parentModules });
  await expect(modules.getByRole("link", { name: es.childTables })).toBeFocused();
  await expect(modules.getByRole("link", { name: es.childTables })).toHaveCSS("outline-style", "solid");
  await operations.getByRole("link", { name: es.columnSubtraction }).tap();
  await expect(main.getByRole("heading", { name: heading(es, "subtraction") })).toBeVisible();
  await page.goBack();
  await expect(main.getByRole("heading", { name: heading(es, "addition") })).toBeVisible();
  await page.goForward();
  await expect(main.getByRole("heading", { name: heading(es, "subtraction") })).toBeVisible();

  await page.getByRole("button", { name: es.childMode }).click();
  await expect(shell).toHaveAttribute("data-mode", "child");
  await page.goBack();
  await expect(main.getByRole("heading", { name: heading(es, "addition") })).toHaveCount(0);
  await openParent(page);
  await expect(main.getByRole("heading", { name: heading(es, "addition") })).toBeVisible();
  await page.reload();
  await expect(shell).toHaveAttribute("data-mode", "child");
  await expect(main.getByRole("heading", { name: heading(es, "addition") })).toHaveCount(0);

  await page.goto("./#child/column-subtraction-report");
  await expect(main.getByRole("heading", { name: heading(es, "subtraction") })).toHaveCount(0);
  await openParent(page);
  await expect(main.getByRole("heading", { name: heading(es, "subtraction") })).toBeVisible();
  expect(new URL(page.url()).hash).toBe(subtractionHash);
});

test("shows separate counts and history in both locales and themes and returns to the exact child draft", async ({ page }, info) => {
  await page.emulateMedia({ colorScheme: "light", reducedMotion: "reduce" });
  await importReport(page, mixedColumnReportBackup());
  await page.getByRole("button", { name: es.childMode }).click();
  await page.goto("./#column-subtraction");
  await page.getByRole("button", { name: es.resumeLearning, exact: true }).click();
  const selected = page.locator('.column-board [aria-current="step"]');
  await expect(selected).toHaveAttribute("aria-label", /Centenas/i);
  await expect(page.locator(".column-board [aria-pressed=true]")).toHaveCount(2);
  await page.getByRole("button", { name: es.pause, exact: true }).click();
  await expect(page.getByRole("heading", { name: es.paused })).toBeVisible();
  const before = await nativeSnapshot(page);
  const open = rows<ColumnSessionRow>(before, "columnSessions").find(({ openOperation }) => openOperation === "subtraction")!;
  const elapsed = new Intl.NumberFormat("ru", { maximumFractionDigits: 1 }).format(open.session.activeMs / 1000);

  await openParent(page);
  const modules = page.getByRole("navigation", { name: es.parentModules });
  await modules.getByRole("link", { name: es.columnTitle }).tap();
  await expect(page.getByRole("heading", { name: heading(es, "addition") })).toBeVisible();
  const overview = page.getByRole("region", { name: es.practiceTotals });
  await expect(overview.locator("dd")).toHaveText(["40 % (2 de 5)", "1 de 5", "1", "4 de 6"]);
  await expect(overview.getByText(es.columnExampleCounts
    .replace("{issued}", "6").replace("{checked}", "5").replace("{unchecked}", "1").replace("{skipped}", "2")
    .replace("{unfinished}", "1"))).toBeVisible();
  const module = modules.getByRole("link", { name: es.columnTitle });
  const operations = page.getByRole("navigation", { name: es.columnChooseOperation });
  for (const link of [module, modules.getByRole("link", { name: es.childTables }),
    operations.getByRole("link", { name: es.columnAddition }), operations.getByRole("link", { name: es.columnSubtraction })]) {
    const { width, height } = (await link.boundingBox())!;
    expect(Math.min(width, height)).toBeGreaterThanOrEqual(44);
  }
  await measureContrast(module, "Selected module, light", 4.5);
  await fits(page);
  await page.screenshot({ path: info.outputPath("report-summary-light-es.png") });

  const timing = page.locator(".column-timing > summary");
  await timing.press("Enter");
  await expect(page.locator(".column-timing-groups dd")).toContainText(["Ejercicios: 1"]);
  await expect(page.locator(".column-timing")).toContainText("1,8 s");
  await expect(page.locator(".column-timing")).toHaveCSS("animation-name", "none");

  const filter = page.getByLabel(es.columnSessionStatus);
  await filter.selectOption("open");
  await expect(page.getByText(es.columnNoSessions)).toBeVisible();
  await filter.selectOption("early");
  const session = page.locator(".column-history-session");
  await expect(session).toHaveCount(1);
  await expect(session.locator(".column-history-examples")).toHaveCount(0);
  await session.locator(":scope > summary").press("Enter");
  const examples = session.locator(".column-history-examples > li");
  await expect(examples).toHaveCount(6);
  await expect(examples.nth(0).locator(".column-history-checks li")).toHaveCount(2);
  await expect(examples.nth(1)).toContainText(es.columnHelpAtCheck);
  await expect(examples.nth(2)).toContainText(es.columnHintDate.split(":")[0]!);
  await expect(examples.nth(2)).toContainText(es.columnNoHelpAtCheck);
  await expect(examples.nth(4)).toContainText(es.columnCheckIndependent);
  await expect(examples.nth(5)).toContainText(es.columnStatusUnfinished);
  await expect(examples.nth(5)).toContainText(es.columnHintDate.split(":")[0]!);
  await expect(session).toContainText("7,5 s");
  await examples.nth(5).screenshot({ path: info.outputPath("unfinished-help-light-es.png") });

  await page.emulateMedia({ colorScheme: "dark" });
  await expect(page.locator("html")).toHaveCSS("color-scheme", "dark");
  await page.getByRole("button", { name: ru.russian }).first().click();
  await expect(page.getByRole("heading", { name: heading(ru, "addition") })).toBeVisible();
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.screenshot({ path: info.outputPath("report-summary-dark-ru.png") });
  await expect(examples.nth(5)).toContainText(ru.columnStatusUnfinished);
  await expect(examples.nth(5)).toContainText(ru.columnHintDate.split(" {date}")[0]!);
  await measureContrast(examples.nth(5).locator(".column-history-checks span").first(), "Check details, dark", 4.5);
  await fits(page);
  await examples.nth(5).screenshot({ path: info.outputPath("unfinished-help-dark-ru.png") });

  await page.getByRole("navigation", { name: ru.columnChooseOperation }).getByRole("link", { name: ru.columnSubtraction }).tap();
  await expect(page.getByRole("region", { name: ru.practiceTotals }).locator("dd"))
    .toHaveText(["100 % (2 из 2)", "2 из 2", "0", "0 из 3"]);
  await page.getByLabel(ru.columnSessionStatus).selectOption("open");
  await expect(session).toHaveCount(1);
  await session.locator(":scope > summary").press("Enter");
  await expect(session).toContainText(ru.columnActiveTime.replace("{time}", ru.seconds.replace("{value}", elapsed)));
  await expect(session).toContainText("17");
  await expect(session).toContainText(ru.columnRecordedBorrows.split(":")[0]!);
  await fits(page);

  await page.getByRole("navigation", { name: ru.parentModules }).getByRole("link", { name: ru.childTables }).tap();
  await expect(page.locator(".app-shell")).toHaveAttribute("data-screen", "home");
  await goParent(page, "results");
  await expect(page.getByRole("heading", { name: ru.analytics })).toBeVisible();
  await expect(page.getByRole("link", { name: ru.childTables, exact: true })).toHaveAttribute("aria-current", "true");
  await expect(page.locator(".session-metrics dd")).toHaveText(["100 %", "3,2 с", "3,2 с"]);
  const after = await nativeSnapshot(page);
  expect(after.stores.filter(({ name }) => name !== "settings")).toEqual(before.stores.filter(({ name }) => name !== "settings"));

  await goParent(page, "settings");
  await page.getByLabel(ru.theme, { exact: true }).selectOption("light");
  await page.getByRole("link", { name: ru.columnTitle, exact: true }).tap();
  await expect(page.locator("html")).toHaveCSS("color-scheme", "light");
  await goFromColumnToSettings(page, ru);
  await page.getByLabel(ru.theme, { exact: true }).selectOption("dark");
  await page.emulateMedia({ colorScheme: "light" });
  await page.getByRole("link", { name: ru.columnTitle, exact: true }).tap();
  await expect(page.locator("html")).toHaveCSS("color-scheme", "dark");
  await page.getByRole("button", { name: ru.childMode }).click();
  expect(new URL(page.url()).hash).toBe("#column-subtraction");
  await page.getByRole("button", { name: ru.resumeLearning, exact: true }).click();
  await expect(selected).toHaveAttribute("aria-label", /Сотни/i);
  await expect(page.locator(".column-board [aria-pressed=true]")).toHaveCount(2);
  await expect(page.locator(".column-board .column-answer")).toHaveText(["", "1", "7"]);
});

async function goFromColumnToSettings(page: Page, locale: typeof es) {
  await page.getByRole("navigation", { name: locale.parentModules }).getByRole("link", { name: locale.childTables }).click();
  await expect(page.locator(".app-shell")).toHaveAttribute("data-screen", "home");
  await goParent(page, "settings");
}

test("shows dated current and historical proof even after a regression", async ({ page }, info) => {
  await page.emulateMedia({ colorScheme: "light" });
  await importReport(page, columnProofBackup({ regress: false }));
  await page.getByRole("link", { name: es.columnTitle, exact: true }).tap();
  const skill = page.locator(".column-report-disclosures details").filter({ hasText: es.columnSkillNoCarry });
  await skill.locator("summary").press("Enter");
  await expect(skill).toContainText(es.columnVerified);
  await expect(skill).toContainText("25 h");
  await expect(skill).toContainText("1 oct");
  await expect(skill).toContainText("2 oct");
  await fits(page);
  await page.getByRole("region", { name: es.columnSkills }).screenshot({ path: info.outputPath("skill-proof-light-es.png") });
  await page.emulateMedia({ colorScheme: "dark" });
  await page.getByRole("button", { name: ru.russian }).first().click();
  const russianSkill = page.locator(".column-report-disclosures details").filter({ hasText: new RegExp(`^${ru.columnSkillNoCarry} ·`) });
  await expect(russianSkill).toContainText(ru.columnVerified);
  await expect(russianSkill).toContainText("25 ч");
  await fits(page);
  await page.getByRole("region", { name: ru.columnSkills }).screenshot({ path: info.outputPath("skill-proof-dark-ru.png") });

  await goFromColumnToSettings(page, ru);
  await restoreReport(page, columnProofBackup(), ru);
  await page.getByRole("link", { name: es.columnTitle, exact: true }).tap();
  await skill.locator("summary").press("Enter");
  await expect(skill).toContainText(es.columnRecurring);
  await expect(skill).toContainText(es.columnNoProof);
  await expect(skill).not.toContainText(es.columnVerified);
  const verifiedAt = new Date(reportDate + 79 * reportHour).toISOString();
  const verified = page.locator(".column-history-session").filter({ has: page.locator(`time[datetime="${verifiedAt}"]`) });
  await verified.locator("summary").press("Enter");
  const proof = verified.locator(".column-history-proof");
  await expect(proof).toContainText(es.columnHistoricalVerification);
  await expect(proof).toContainText("25 h");
  await proof.screenshot({ path: info.outputPath("historical-proof-after-regression.png") });
});
