import Dexie, { type Table } from "dexie";
import type { MathHeroDB } from "./db";

/** A view can cancel its write until IndexedDB commits the transaction. */
export async function sessionTransaction<T>(
  database: MathHeroDB,
  tables: Table[],
  signal: AbortSignal | undefined,
  write: () => Promise<T>,
) {
  let abort: (() => void) | undefined;
  try {
    return await database.transaction("rw", tables, async () => {
      signal?.throwIfAborted();
      const transaction = Dexie.currentTransaction!;
      abort = () => {
        try {
          transaction.idbtrans.abort();
        } catch (error) {
          // A completed native transaction can still have its completion event queued.
          if ((error as DOMException).name !== "InvalidStateError") throw error;
        }
      };
      signal?.addEventListener("abort", abort, { once: true });
      return await write();
    });
  } finally {
    if (abort) signal?.removeEventListener("abort", abort);
  }
}
