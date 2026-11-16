import "fake-indexeddb/auto";
import { db } from "../src/database/db";
import "@testing-library/jest-dom/vitest";
import { cleanup } from "@testing-library/react";
import { afterEach, vi } from "vitest";

Object.defineProperty(window, "scrollTo", { value: vi.fn(), writable: true });
Object.defineProperty(window, "matchMedia", {
  value: () => Object.assign(new EventTarget(), { matches: false }),
  writable: true,
});
afterEach(async () => {
  cleanup();
  window.location.hash = "";
  await db.transaction("rw", db.tables, async () => {
    for (const table of db.tables) await table.clear();
  });
});
