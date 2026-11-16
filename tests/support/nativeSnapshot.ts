import type { Page } from "@playwright/test";

export function nativeSnapshot(page: Page) {
  return page.evaluate(async () => {
    const open = indexedDB.open("math-hero");
    const db = await new Promise<IDBDatabase>((resolve, reject) => {
      open.onsuccess = () => resolve(open.result);
      open.onerror = () => reject(open.error);
    });
    try {
      const tx = db.transaction([...db.objectStoreNames]);
      const stores = await Promise.all([...db.objectStoreNames].map(async (name) => {
        const store = tx.objectStore(name);
        const indexes = [...store.indexNames].map((name) => {
          const index = store.index(name);
          return { name, keyPath: index.keyPath, unique: index.unique, multiEntry: index.multiEntry };
        });
        const rows = await new Promise<unknown[]>((resolve, reject) => {
          const get = store.getAll();
          get.onsuccess = () => resolve(get.result);
          get.onerror = () => reject(get.error);
        });
        // Preserve the byte values in test attachments and Playwright comparisons.
        if (name === "parentGate") {
          const pinRows = rows as { salt: Uint8Array; hash: Uint8Array }[];
          return { name, keyPath: store.keyPath, autoIncrement: store.autoIncrement, indexes,
            rows: pinRows.map((row) => ({
              ...row, salt: [...row.salt], hash: [...row.hash],
              saltType: row.salt.constructor.name, hashType: row.hash.constructor.name,
            })),
          };
        }
        return { name, keyPath: store.keyPath, autoIncrement: store.autoIncrement, indexes, rows };
      }));
      return { version: db.version, stores };
    } finally {
      db.close();
    }
  });
}

export function rows<T>(snapshot: Awaited<ReturnType<typeof nativeSnapshot>>, name: string) {
  const store = snapshot.stores.find((store) => store.name === name);
  if (!store) throw new Error(`Missing store ${name}`);
  return store.rows as T[];
}
