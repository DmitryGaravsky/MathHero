export const MAX_ANSWER_DIGITS = 3;
export function normalizeAnswer(value: string): string {
  return value.replace(/[^0-9]/g, "").slice(0, MAX_ANSWER_DIGITS);
}
