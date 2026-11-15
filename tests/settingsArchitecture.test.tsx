import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { expect, it, vi } from "vitest";
import { AppProvider } from "../src/app/providers";
import { LanguageSwitcher } from "../src/components/layout/LanguageSwitcher";
import { db } from "../src/database/db";
import { exportBackup, restoreBackup, type Backup } from "../src/database/backup";
import { settingsRepository } from "../src/database/settingsRepository";

const oldPreferences = {
  language: "ru", soundEnabled: false, animationsEnabled: false, dailyGoalMinutes: 5,
} as const;

it("merges concurrent transactional patches onto a legacy row and rejects invalid writes", async () => {
  await db.settings.put({ id: "preferences", value: oldPreferences });
  await Promise.all([
    settingsRepository.patch({ theme: "dark" }),
    settingsRepository.patch({ dailyGoalMinutes: 15 }),
  ]);
  const expected = { ...oldPreferences, theme: "dark", dailyGoalMinutes: 15 };
  expect(await settingsRepository.read()).toEqual(expected);
  await expect(settingsRepository.patch({ theme: "sepia" as "dark" })).rejects.toThrow("Invalid preferences");
  expect(await settingsRepository.read()).toEqual(expected);
});

it("displays only committed preferences after a failed save and refreshes on legacy restore", async () => {
  const user = userEvent.setup();
  render(<AppProvider><LanguageSwitcher /></AppProvider>);
  const spanish = await screen.findByRole("button", { name: "Español" });
  const russian = screen.getByRole("button", { name: "Русский" });
  const failed = vi.spyOn(db.settings, "put").mockRejectedValueOnce(new Error("Disk failure"));
  await user.click(russian);
  await screen.findByRole("alert");
  expect(spanish).toHaveAttribute("aria-pressed", "true");
  expect(russian).toHaveAttribute("aria-pressed", "false");
  expect(await db.settings.count()).toBe(0);
  failed.mockRestore();

  const exported = await exportBackup();
  const old: Backup = {
    ...exported,
    version: 1,
    databaseVersion: 3,
    tables: {
      ...exported.tables,
      settings: [{ id: "preferences", value: oldPreferences }],
    },
  };
  expect(await restoreBackup(old, true)).toBe(true);
  await waitFor(() => expect(russian).toHaveAttribute("aria-pressed", "true"));
  expect(await settingsRepository.read()).toEqual({ ...oldPreferences, theme: "system" });
  expect((await exportBackup()).tables.settings[0]?.value).toEqual({ ...oldPreferences, theme: "system" });
});
