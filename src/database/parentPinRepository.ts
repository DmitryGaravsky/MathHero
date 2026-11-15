import { db, type MathHeroDB } from "./db";

export const defaultParentPin = "1234";
const validPin = /^[0-9]{4}$/;
export const isParentPin = (value: string) => validPin.test(value);

async function hashPin(pin: string, salt: Uint8Array<ArrayBuffer>) {
  const key = await crypto.subtle.importKey(
    "raw", new TextEncoder().encode(pin), "PBKDF2", false, ["deriveBits"],
  );
  const hash = await crypto.subtle.deriveBits(
    { name: "PBKDF2", hash: "SHA-256", salt, iterations: 100_000 }, key, 256,
  );
  return new Uint8Array(hash);
}

export class ParentPinRepository {
  constructor(private readonly database: MathHeroDB = db) {}

  async verify(pin: string) {
    if (!isParentPin(pin)) return false;
    const verifier = await this.database.parentGate.get("parent");
    if (!verifier) return pin === defaultParentPin;
    if (verifier.version !== 1 || verifier.salt.length !== 16 || verifier.hash.length !== 32)
      throw new Error("Invalid parent PIN verifier");
    const hash = await hashPin(pin, verifier.salt);
    return hash.reduce((difference, byte, i) => difference | (byte ^ verifier.hash[i]!), 0) === 0;
  }

  async change(pin: string) {
    if (!isParentPin(pin)) throw new Error("Invalid parent PIN");
    const salt = crypto.getRandomValues(new Uint8Array(16));
    await this.database.parentGate.put({ id: "parent", version: 1, salt, hash: await hashPin(pin, salt) });
  }

  reset() {
    return this.database.parentGate.delete("parent");
  }
}

export const parentPinRepository = new ParentPinRepository();
