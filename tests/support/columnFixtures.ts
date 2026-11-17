import { expect, type Page } from "@playwright/test";
import type { FullBackup } from "../../src/database/backup";
import { columnInput, newColumnDraft, type ColumnInput } from "../../src/engine/column/draft";
import { replayColumnJournal } from "../../src/engine/column/replay";
import { checkpointColumnDraft, type ColumnJournalEntry } from "../../src/engine/column/session";
import es from "../../src/locales/es.json" with { type: "json" };
import { openParent } from "./parentMode";

export const columnExamples = [
  { operation: "addition", top: 586, bottom: 647, answer: "1233", seed: 11166409 },
  { operation: "addition", top: 199, bottom: 205, answer: "404", seed: 184041 },
  { operation: "subtraction", top: 604, bottom: 187, answer: "417", seed: 171511 },
  { operation: "subtraction", top: 501, bottom: 492, answer: "9", seed: 32978 },
  { operation: "subtraction", top: 304, bottom: 304, answer: "0", seed: 9655 },
] as const;

type Example = (typeof columnExamples)[number];
const primerAt = Date.UTC(2026, 9, 1, 12);
const exampleAt = primerAt + 2 * 86_400_000;

export function columnFixture(...examples: (Example & { input?: ColumnInput })[]): FullBackup {
  const journal: ColumnJournalEntry[] = [];
  for (const { operation } of examples) {
    const sessionId = operation + "-primer";
    journal.push({ type: "start", operation, policyVersion: 1, seed: 42, timeZone: "Europe/Paris",
      sequence: journal.length + 1, sessionId, at: primerAt });
    for (let i = 0; i < 6; i++) {
      journal.push({ type: "skip", input: columnInput(newColumnDraft()), activeMs: 0,
        sequence: journal.length + 1, sessionId, at: primerAt });
    }
  }
  for (const { operation, seed } of examples) {
    journal.push({ type: "start", operation, policyVersion: 1, seed, timeZone: "Europe/Paris",
      sequence: journal.length + 1, sessionId: operation + "-example", at: exampleAt });
  }
  const replay = replayColumnJournal(journal);
  for (const { operation, top, bottom, input } of examples) {
    const id = operation + "-example";
    const session = replay.sessions.get(id)!;
    expect(session.order[0]?.exercise).toEqual({ operation, top, bottom });
    if (input) replay.sessions.set(id, checkpointColumnDraft(session, input, 1450));
  }
  return {
    format: "math-hero-backup", version: 3, databaseVersion: 5, exportedAt: exampleAt,
    tables: {
      sessions: [], attempts: [], progress: [], settings: [], journal: [], rewards: [], rewardState: [],
      columnJournal: journal, columnSessions: [...replay.sessions.values()], columnAttempts: replay.attempts,
      columnProgress: [...replay.progress.addition.values(), ...replay.progress.subtraction.values()],
    },
  };
}

export async function importColumnFixture(page: Page, ...examples: (Example & { input?: ColumnInput })[]) {
  await page.goto("./");
  await openParent(page, "settings");
  await page.locator('input[type="file"]').setInputFiles({
    name: "column-example.json", mimeType: "application/json",
    buffer: Buffer.from(JSON.stringify(columnFixture(...examples))),
  });
  await page.getByRole("dialog").getByRole("button", { name: es.confirmRestore }).click();
  await expect(page.getByRole("status")).toHaveText(es.backupRestored);
  await page.getByRole("button", { name: es.childMode }).click();
}
