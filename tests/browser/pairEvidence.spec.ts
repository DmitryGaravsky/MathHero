import { expect, test } from "@playwright/test";
import es from "../../src/locales/es.json" with { type: "json" };
import ru from "../../src/locales/ru.json" with { type: "json" };
import type { Backup } from "../../src/database/backup";
import { answerLearning, createLearning, type LearningSession } from "../../src/engine/learning/session";
import { DAY_MS, learningPolicy, type PairProgress } from "../../src/engine/learning/progress";
import { replayLearning } from "../../src/engine/learning/rewards";
import { getFact } from "../../src/engine/multiplication/facts";
import type { Attempt } from "../../src/engine/sessions/diagnostic";
import { goParent, openParent } from "../support/parentMode";

function history(language: "es" | "ru"): Backup {
  const today = Date.parse("2026-10-01T12:00:00Z");
  const policy = { ...learningPolicy, timeZone: "Europe/Paris" };
  const random = { next: () => 0.25 };
  const rows: [number, string, number?, number?][] = [
    [1, "mul:7:8", 56, 4400], [2, "mul:8:7", 56, 4400],
    [1, "mul:6:7"], [2, "mul:7:6"], [3, "mul:6:7"],
    ...[0, 1, 4, 11, 25, 39].map((day): [number, string] => [day, "mul:9:9"]),
    ...[0, 1, 4, 11, 25].map((day, i): [number, string] => [day, i % 2 ? "mul:8:6" : "mul:6:8"]),
    [26, "mul:8:6", 48, 5400], [27, "mul:6:8", 0], [28, "mul:8:6", 0],
    [0, "mul:8:9"], [1, "mul:8:9", 27], [2, "mul:8:9"],
  ];
  const sessions: LearningSession[] = [];
  const attempts: Attempt[] = [];
  const progress = new Map<string, PairProgress>();
  const stream = new Map<string, number>();
  for (const [day, id, answer, ms] of rows.sort(([a], [b]) => a - b)) {
    const clock = { now: () => today + day * DAY_MS };
    const fact = getFact(id);
    const target = fact.canonicalId;
    const session = createLearning(`learning:evidence:${sessions.length}`, "weak", [], [], clock, random, target, policy);
    session.order = [id];
    session.sequence = (stream.get(target) ?? 0) + 1;
    stream.set(target, session.sequence);
    const outcome = answerLearning(session, answer ?? fact.expectedAnswer, ms ?? 1800, progress.get(target), clock);
    progress.set(target, outcome.progress);
    sessions.push({ ...outcome.session, phase: "completed", completedAt: clock.now(), endReason: "early" });
    attempts.push(outcome.attempt);
  }
  const journal = attempts.map((a, i) => ({ id: a.id, sequence: i + 1 }));
  const replay = replayLearning(sessions, attempts, journal);
  return {
    format: "math-hero-backup", version: 2, databaseVersion: 4, exportedAt: today + 40 * DAY_MS,
    tables: {
      sessions, attempts, journal, progress: [...progress.values()], rewards: replay.rewards, rewardState: [replay.state],
      settings: [{ id: "preferences", value: { language, theme: "system", animationsEnabled: false, soundEnabled: false, dailyGoalMinutes: 10 } }],
    },
  };
}

test("shows cumulative knowledge, corroborated weaknesses and canonical practice in both orientations", async ({ page }, info) => {
  const locale = info.project.name.includes("webkit") ? ru : es;
  const language = locale === es ? "es" : "ru";
  const theme = info.project.name.endsWith("landscape") ? "dark" : "light";
  const capture = info.project.name.includes("phone");
  await page.emulateMedia({ colorScheme: theme, reducedMotion: "reduce" });
  await page.clock.setFixedTime(new Date("2026-11-12T12:00:00Z"));
  await page.goto("./#parent/settings");
  await openParent(page);
  await page.locator('input[type="file"]').setInputFiles({
    name: "synthetic-evidence.json", mimeType: "application/json",
    buffer: Buffer.from(JSON.stringify(history(language))),
  });
  await page.getByRole("button", { name: es.confirmRestore }).click();
  await expect(page.getByRole("status").filter({ hasText: locale.backupRestored })).toBeVisible();
  await expect(page.locator("html")).toHaveCSS("color-scheme", theme);
  const screenshot = async (name: string) => {
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(page.viewportSize()!.width);
    if (capture) await page.screenshot({ path: info.outputPath(`${language}-${theme}-${name}.png`), fullPage: true });
  };

  await goParent(page, "home");
  const counts = page.locator(".knowledge-counts");
  await expect(counts.locator("dt")).toHaveText([
    locale["knowledge.learned"], locale["knowledge.fluent"], locale["knowledge.retained"],
  ]);
  await expect(counts.locator("dd")).toHaveText(["3 / 78", "2 / 78", "1 / 78"]);
  await screenshot("overview");

  await goParent(page, "map");
  const detail = page.locator(".fact-detail .pair-evidence");
  await page.getByRole("button", { name: `9 × 9: ${locale.stable}`, exact: true }).tap();
  await expect(detail.locator("strong")).toHaveText(locale["knowledge.retained"]);
  const interval = new Intl.NumberFormat(language, { style: "unit", unit: "day", unitDisplay: "long" }).format(14);
  await expect(detail).toContainText(interval);
  await screenshot("retained");
  for (const direction of ["7 × 8", "8 × 7"]) {
    await page.getByRole("button", { name: `${direction}: ${locale.developing}`, exact: true }).tap();
    await expect(detail.locator("strong")).toHaveText(locale["knowledge.learned"]);
    await expect(page.getByRole("link", { name: `${locale.trainPair} · ${direction}` }))
      .toHaveAttribute("href", "#parent/weak?pair=mul%3A7%3A8");
  }

  await goParent(page, "weak-spots");
  const pairs = page.locator(".difficult-list > li");
  const regression = pairs.filter({ hasText: "6 × 8" });
  const slip = pairs.filter({ hasText: "8 × 9" });
  await regression.locator("summary").click();
  await expect(regression.locator(".pair-evidence")).toContainText(locale.unstableAfterMastery);
  await expect(regression.locator(".pair-evidence")).toContainText(locale.recurringErrors);
  await expect(regression.locator(".pair-evidence")).not.toContainText(locale.possibleInputSlip);
  await slip.locator("summary").click();
  await expect(slip.locator(".pair-evidence")).toContainText(locale.possibleInputSlip);
  await expect(slip.locator(".pair-evidence")).toContainText(locale.wrongObservations.replace("{count}", "1"));
  await screenshot("weakness");
  const action = regression.getByRole("link");
  await expect(action).toHaveAttribute("href", "#parent/weak?pair=mul%3A6%3A8");
  await action.click();
  await page.getByRole("button", { name: locale.newSession }).click();
  await expect(page.locator(".equation")).toHaveAttribute("aria-label", /^(6 × 8|8 × 6)$/);
});
