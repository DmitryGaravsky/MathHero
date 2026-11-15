import { multiplicationFacts, getFact } from "../multiplication/facts";
import type { Attempt } from "../sessions/diagnostic";
import type { Session } from "./session";
import {
  calendarDay,
  learningPolicy,
  masteryEvidence,
  median,
  type PairProgress,
} from "./progress";

export const mapStatuses = [
  "unknown",
  "difficult",
  "developing",
  "fluent",
  "stable",
] as const;
export type MapStatus = (typeof mapStatuses)[number];
export function statistics(attempts: readonly Attempt[]) {
  const times = attempts.filter((a) => a.correct).map((a) => a.responseTimeMs);
  return {
    answered: attempts.length,
    correct: times.length,
    accuracy: attempts.length ? times.length / attempts.length : null,
    meanCorrectMs: times.length
      ? times.reduce((a, b) => a + b, 0) / times.length
      : null,
    medianCorrectMs: median(times),
  };
}
export function directionStatus(
  id: string,
  attempts: readonly Attempt[],
  progress: readonly PairProgress[],
  now: number,
): MapStatus {
  const directed = attempts.filter((a) => a.exerciseId === id);
  if (!directed.length) return "unknown";
  const trained = directed.filter((a) => a.mode !== "diagnostic");
  const recent = (trained.length ? trained : directed).slice(
    -learningPolicy.window,
  );
  const pair = progress.find((p) => p.canonicalId === getFact(id).canonicalId);
  if (trained.length && pair && masteryEvidence(pair, now).mastered)
    return "stable";
  if (recent.slice(-5).some((a) => !a.correct)) return "difficult";
  const stats = statistics(recent);
  return stats.accuracy !== null &&
    stats.accuracy >= 0.95 &&
    stats.medianCorrectMs !== null &&
    stats.medianCorrectMs <= learningPolicy.fastMs
    ? "fluent"
    : "developing";
}
export function analytics(
  attempts: readonly Attempt[],
  sessions: readonly Session[],
  progress: readonly PairProgress[],
  now: number,
) {
  const practice = attempts.filter((a) => a.mode !== "diagnostic");
  const sessionById = new Map(sessions.map((s) => [s.id, s]));
  const groups = new Map<string, Attempt[]>();
  for (const a of practice) {
    const session = sessionById.get(a.sessionId);
    const zone =
      session && session.mode !== "diagnostic"
        ? session.policy.timeZone
        : "UTC";
    const day = calendarDay(a.createdAt, zone);
    groups.set(day, [...(groups.get(day) ?? []), a]);
  }
  const daily = [...groups.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([day, rows]) => ({
      day,
      ...statistics(rows),
      activeMs: rows.reduce((n, a) => n + a.responseTimeMs, 0),
    }));
  const cells = multiplicationFacts.map((f) => ({
    ...f,
    status: directionStatus(f.id, attempts, progress, now),
  }));
  const difficult = cells
    .filter((f) => ["difficult", "developing"].includes(f.status))
    .map((f) => ({
      ...f,
      ...statistics(practice.filter((a) => a.exerciseId === f.id)),
    }))
    .sort(
      (a, b) =>
        (a.accuracy ?? 1) - (b.accuracy ?? 1) ||
        (b.medianCorrectMs ?? 0) - (a.medianCorrectMs ?? 0),
    );
  return {
    ...statistics(practice),
    daily,
    cells,
    difficult,
    masteredDirections: cells.filter((c) => c.status === "stable").length,
    masteredPairs: progress.filter((p) => masteryEvidence(p, now).mastered)
      .length,
  };
}
