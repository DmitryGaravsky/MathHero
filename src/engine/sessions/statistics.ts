import type { Attempt } from "./diagnostic";

export function diagnosticStatistics(attempts: readonly Attempt[]) {
  const diagnostic = attempts.filter((a) => a.mode === "diagnostic");
  const times = diagnostic
    .filter((a) => a.correct)
    .map((a) => a.responseTimeMs)
    .sort((a, b) => a - b);
  const middle = Math.floor(times.length / 2);
  return {
    answered: diagnostic.length,
    correct: times.length,
    accuracy: diagnostic.length ? times.length / diagnostic.length : null,
    meanCorrectMs: times.length
      ? times.reduce((a, b) => a + b, 0) / times.length
      : null,
    medianCorrectMs: times.length
      ? (times[(times.length - 1) >> 1]! + times[middle]!) / 2
      : null,
  };
}
