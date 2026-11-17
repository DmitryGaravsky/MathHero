import { expect } from "@playwright/test";
import type { nativeSnapshot } from "../support/nativeSnapshot";

const columns = ["columnAttempts", "columnJournal", "columnProgress", "columnSeen", "columnSessions", "columnState"];

export function expectEmptyColumnStores(upgraded: Awaited<ReturnType<typeof nativeSnapshot>>) {
  expect(upgraded.version).toBe(50);
  const stores = upgraded.stores.filter(({ name }) => columns.includes(name));
  expect(stores.map(({ name }) => name)).toEqual(columns);
  expect(stores.map(({ rows }) => rows)).toEqual(columns.map(() => []));
  return upgraded.stores.filter(({ name }) => !columns.includes(name));
}
