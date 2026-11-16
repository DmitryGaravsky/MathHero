import { mkdir, writeFile } from "node:fs/promises";
import { dirname } from "node:path";
import { expect, test, type Locator } from "@playwright/test";
import es from "../../src/locales/es.json" with { type: "json" };
import ru from "../../src/locales/ru.json" with { type: "json" };
import { contrastRatio, measureContrast, type ContrastReading } from "../support/contrast";
import { goParent } from "../support/parentMode";

const coveredProjects = new Set([
  "chromium-phone-portrait", "webkit-phone-landscape", "webkit-tablet-portrait", "chromium-tablet-landscape",
]);

for (const theme of ["light", "dark"] as const) {
  test(`rendered ${theme} theme across child and adult screens`, async ({ page }, info) => {
    test.setTimeout(90_000);
    const capture = coveredProjects.has(info.project.name);
    const russian = info.project.name.includes("webkit");
    const locale = russian ? ru : es;
    const readings: ContrastReading[] = [];
    async function inspect(element: Locator, sample: string, minimum = 4.5, property = "color", against: "inside" | "outside" = "inside") {
      readings.push(await measureContrast(element, sample, minimum, property, against));
    }
    async function screen(name: string, fullPage = true) {
      expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(page.viewportSize()!.width);
      if (capture) await page.screenshot({ path: info.outputPath(`${theme}-${name}.png`), fullPage });
    }
    const button = (name: string) => page.getByRole("button", { name, exact: true });
    await page.emulateMedia({ colorScheme: theme, reducedMotion: "reduce" });
    await page.goto("./");
    await expect(page.locator("html")).toHaveCSS("color-scheme", theme);
    if (russian) await button(ru.russian).click();
    await expect(page.getByRole("heading", { name: locale.childHomeTitle })).toBeVisible();
    await inspect(page.locator(".hero-copy p"), "Child home muted copy");
    await inspect(page.locator(".hero .primary"), "Child home primary label");
    await inspect(page.locator(".hero .primary"), "Child home primary fill", 3, "background-color", "outside");
    await inspect(page.locator(".language-switch [aria-pressed=true]"), "Active language label");
    await screen("child-home");

    await page.locator('nav a[href="#achievements"]').click();
    await expect(page.locator(".child-badges li")).toHaveCount(6);
    await inspect(page.locator(".child-badges li > span:last-child").first(), "Unearned badge status");
    await screen("child-achievements");

    await page.locator('nav a[href="#training"]').click();
    await expect(button(locale.startLearning)).toBeVisible();
    await screen("child-ready");
    await button(locale.startLearning).click();
    const answer = page.getByRole("textbox", { name: locale.answer, exact: true });
    await expect(answer).toBeEditable();
    await answer.focus();
    await inspect(answer, "Answer input text");
    await inspect(answer, "Answer input border", 3, "border-top-color", "outside");
    await expect(answer).toHaveCSS("outline-style", "solid");
    await inspect(answer, "Answer focus ring", 3, "outline-color", "outside");
    await inspect(page.locator(".equation span").first(), "Large equation operator", 3);
    await inspect(button("0"), "Keypad digit");
    await inspect(button("0"), "Keypad digit border", 3, "border-top-color", "outside");
    await inspect(button(locale.erase), "Keypad erase symbol");
    await screen("child-exercise");

    await button("0").click();
    await inspect(button(locale.confirm), "Enabled keypad confirmation");
    await button(locale.confirm).click();
    await inspect(page.locator(".input-feedback p"), "Incorrect feedback");
    await screen("child-wrong");
    await button(locale.childTryCorrection).click();
    const correction = page.getByLabel(locale.childCopyAnswer);
    await expect(correction).toBeEditable();
    await screen("child-correction");
    const shownProduct = (await page.locator(".equation").textContent())!.split("=").at(-1)!.trim();
    await correction.fill(shownProduct);
    await correction.press("Enter");
    await expect(page.locator(".input-feedback p")).toHaveText(locale.childCorrectionDone);
    await screen("child-correction-complete");
    await button(locale.next).click();

    await expect(answer).toBeEditable();
    const fact = (await page.locator(".equation").getAttribute("aria-label"))!.split(" × ").map(Number);
    await answer.fill(String(fact[0]! * fact[1]!));
    await answer.press("Enter");
    await expect(page.locator(".input-feedback")).toHaveAttribute("data-correct", "true");
    await inspect(page.locator(".input-feedback p"), "Correct feedback");
    await screen("child-correct");
    await expect(answer).toBeEditable();
    await button(locale.pause).click();
    await expect(button(locale.resumeLearning)).toBeVisible();
    await screen("child-paused");
    await button(locale.endSession).click();
    await expect(page.getByRole("heading", { name: locale.sessionEnded })).toBeVisible();
    await inspect(page.locator(".child-result-actions .secondary"), "Child result return button border", 3, "border-top-color", "outside");
    await screen("child-result");

    await button(locale.parentMode).click();
    const dialog = page.getByRole("dialog");
    const pin = dialog.getByLabel(locale.parentPin);
    await expect(pin).toBeFocused();
    await expect(pin).toHaveCSS("outline-style", "solid");
    await inspect(dialog.locator("#pin-default"), "Default PIN guidance");
    await inspect(pin, "PIN field border", 3, "border-top-color", "outside");
    await inspect(pin, "PIN field focus", 3, "outline-color", "outside");
    await screen("pin-entry", false);
    await pin.fill("0000");
    await button(locale.parentEnter).click();
    await inspect(dialog.getByRole("alert"), "Invalid PIN message");
    await inspect(pin, "Invalid PIN field border", 3, "border-top-color", "outside");
    if (page.viewportSize()!.height === 390) await expect(button(locale.pinReset)).toBeInViewport();
    await screen("pin-error", false);
    await button(locale.pinReset).click();
    await expect(button(locale.cancel)).toBeFocused();
    await screen("pin-reset", false);
    await button(locale.cancel).click();
    await pin.fill("1234");
    await pin.press("Enter");
    await expect(page.locator(".app-shell")).toHaveAttribute("data-mode", "parent");
    const toggle = page.locator(".parent-menu");
    if (await toggle.isVisible()) {
      await toggle.click();
      await expect(page.locator(".parent-navigation a:visible")).toHaveCount(8);
      await inspect(page.locator(".parent-navigation [aria-current=page]"), "Current parent destination");
      await screen("parent-expanded-menu");
      await toggle.click();
    }
    const overview = page.locator(".overview-progress");
    await inspect(overview.locator("a").first(), "Progress text link on tinted surface");
    await inspect(overview.locator("a").last(), "Achievement text link on tinted surface");
    const bar = await overview.locator("progress").evaluate((el) => {
      const css = getComputedStyle(el);
      function readToken(name: string) {
        const swatch = document.createElement("span");
        swatch.style.color = css.getPropertyValue(name);
        document.body.appendChild(swatch);
        const color = getComputedStyle(swatch).color;
        swatch.remove();
        return color;
      }
      return { foreground: readToken("--action"), background: css.backgroundColor };
    });
    const barContrast = contrastRatio(bar.foreground, bar.background);
    expect(barContrast).toBeGreaterThanOrEqual(3);
    readings.push({ sample: "Progress fill token against rendered track", ...bar, ratio: barContrast, minimum: 3 });
    await inspect(overview.locator("progress"), "Progress track boundary", 3, "border-top-color", "outside");
    await inspect(page.locator(".knowledge-counts dt").last(), "Knowledge state label");
    await inspect(page.locator(".knowledge-counts dd").last(), "Knowledge state count");
    await inspect(page.locator(".knowledge-counts + p"), "Knowledge count explanation");
    await page.locator(".latest-practice summary").click();
    await expect(page.locator(".latest-practice .session-metrics")).toBeVisible();
    await screen("parent-overview");
    await overview.getByRole("link", { name: locale.achievements }).click();
    await expect(page.locator(".achievements li")).toHaveCount(6);
    await screen("parent-achievements");

    await goParent(page, "training");
    await expect(page.getByRole("heading", { name: locale.sessionEnded })).toBeVisible();
    await screen("parent-practice-result");
    await button(locale.newSession).click();
    await expect(answer).toBeEditable();
    await screen("parent-practice-exercise");
    await button(locale.pause).click();
    await expect(button(locale.resumeLearning)).toBeVisible();
    await screen("parent-practice-paused");

    await goParent(page, "diagnosis");
    await expect(page.getByRole("link", { name: locale.start })).toBeVisible();
    await screen("parent-diagnosis-new");
    await page.getByRole("link", { name: locale.start }).click();
    await button(locale.start).click();
    await expect(answer).toBeEditable();
    await screen("parent-diagnosis-exercise");
    await answer.fill("0");
    await answer.press("Enter");
    await expect(page.locator(".input-feedback")).toHaveAttribute("data-correct", "false");
    await screen("parent-diagnosis-feedback");
    await goParent(page, "diagnosis");
    await expect(page.getByRole("link", { name: locale.resume })).toBeVisible();
    await screen("parent-diagnosis-partial");

    await goParent(page, "map");
    for (const status of ["unknown", "difficult", "developing", "fluent", "stable"]) {
      const symbol = page.locator(`.legend-symbol.${status}`);
      await inspect(symbol, `Map legend symbol ${status}`, 3);
      await inspect(symbol, `Map legend boundary ${status}`, 3, "border-top-color", "outside");
    }
    const difficult = page.locator("button.map-cell.difficult").first();
    await difficult.tap();
    await inspect(difficult, "Selected map cell symbol", 3);
    await inspect(difficult, "Selected map cell border against cell", 3, "border-top-color");
    await inspect(difficult, "Selected map cell border against panel", 3, "border-top-color", "outside");
    await inspect(page.locator(".map-cell.unknown").first(), "Map cell boundary", 3, "border-top-color", "outside");
    await expect(page.locator(".fact-detail .history-list").first().getByRole("listitem")).not.toHaveCount(0);
    await inspect(page.locator(".fact-detail .pair-evidence p strong"), "Pair knowledge state");
    await inspect(page.locator(".fact-detail .evidence-list li").first(), "Recorded incorrect count");
    await screen("parent-map");

    await goParent(page, "results");
    await expect(page.locator(".daily-trend meter")).toHaveCount(1);
    await inspect(page.locator(".daily-trend meter"), "Trend meter boundary", 3, "border-top-color", "outside");
    await inspect(page.locator(".daily-trend time"), "Localized trend date");
    await inspect(page.locator(".daily-trend li span").first(), "Trend details");
    await screen("parent-analytics");

    await goParent(page, "weak-spots");
    await expect(page.locator(".difficult-list li").first()).toBeVisible();
    await inspect(page.locator(".difficult-list a").first(), "Weak-pair practice link");
    await inspect(page.locator(".weak-pair-observations").first(), "Weak-pair observation counts");
    await page.locator(".difficult-list summary").first().click();
    const weakEvidence = page.locator(".difficult-list .pair-evidence");
    await expect(weakEvidence).toBeVisible();
    await inspect(weakEvidence.locator(".evidence-list li").first(), "Weak-pair incorrect count");
    await screen("parent-weak");
    await page.locator(".difficult-list a").first().click();
    await expect(button(locale.startLearning)).toBeVisible();
    await screen("parent-targeted-practice");

    await goParent(page, "history");
    await page.locator(".session-history summary").first().click();
    await expect(page.locator(".history-list li").first()).toBeVisible();
    await inspect(page.locator(".history-filter select"), "History native select text");
    await inspect(page.locator(".history-filter select"), "History native select border", 3, "border-top-color", "outside");
    await screen("parent-history");

    await goParent(page, "settings");
    const themeSelect = page.getByLabel(locale.theme, { exact: true });
    await expect(themeSelect).toHaveValue("system");
    await themeSelect.selectOption(theme);
    await expect(page.locator(".app-shell")).toHaveAttribute("data-theme", theme);
    await inspect(page.locator(".setting-row p").first(), "Muted settings copy");
    await inspect(page.getByRole("switch"), "Animation switch boundary", 3, "background-color", "outside");
    await inspect(page.getByRole("switch").locator("span"), "Animation switch thumb", 3, "background-color", "outside");
    await page.getByRole("switch").click();
    await expect(page.getByRole("switch")).toHaveAttribute("aria-checked", "false");
    await inspect(page.getByRole("switch"), "Animation switch off boundary", 3, "background-color", "outside");
    await inspect(page.getByRole("switch").locator("span"), "Animation switch thumb when off", 3, "background-color", "outside");
    await screen("parent-settings-data");
    await page.locator(".glossary summary").click();
    await screen("parent-glossary");
    const download = page.waitForEvent("download");
    await button(locale.exportBackup).click();
    const backup = await download;
    await page.locator('input[type="file"]').setInputFiles((await backup.path())!);
    const restore = page.getByRole("dialog", { name: locale.replaceData });
    await inspect(restore.locator("#restore-warning"), "Restore dialog muted copy");
    await inspect(restore.getByRole("button", { name: locale.confirmRestore }), "Restore confirmation text");
    await screen("parent-restore-dialog", false);
    await restore.getByRole("button", { name: locale.cancel }).click();
    await expect(restore).toBeHidden();
    await info.attach("computed-contrast", { body: JSON.stringify(readings, null, 2), contentType: "application/json" });
    const report = info.outputPath(`${theme}-contrast.json`);
    await mkdir(dirname(report), { recursive: true });
    await writeFile(report, JSON.stringify(readings, null, 2));
  });
}
