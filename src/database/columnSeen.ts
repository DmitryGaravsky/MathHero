import type { ColumnOperation } from "../engine/column/arithmetic";

// Both operations use canonical pairs from the same triangular 900-by-900 domain.
const byteCount = Math.ceil((900 * 901 / 2) / 8);

function pairIndex(id: string) {
  const [, top, bottom] = id.split(":");
  const row = Number(top) - 100;
  return row * (row + 1) / 2 + Number(bottom) - 100;
}

/** One bounded IndexedDB record per operation serves synchronous generator lookups. */
export class ColumnSeen {
  constructor(readonly operation: ColumnOperation, readonly bits: Uint8Array = new Uint8Array(byteCount)) {}

  has(id: string) {
    if (!id.startsWith(`${this.operation}:`)) return false;
    const index = pairIndex(id);
    return !!(this.bits[index >>> 3]! & (1 << (index & 7)));
  }

  add(id: string) {
    const index = pairIndex(id);
    const byte = index >>> 3;
    const before = this.bits[byte]!;
    const after = before | (1 << (index & 7));
    this.bits[byte] = after;
    return before !== after;
  }
}
