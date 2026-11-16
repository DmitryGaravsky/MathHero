import { getFact } from "../multiplication/facts";
import type { Attempt } from "../sessions/diagnostic";

export const DAY_MS = 86_400_000;
/** Pilot parameters, not educational norms. Inject timeZone for reproducible simulations. */
export const legacyLearningPolicy = {
  version: 1,
  timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
  window: 20,
  speedWindow: 15,
  minSuccesses: 5,
  minDays: 3,
  minSessions: 2,
  accuracy: 0.95,
  fastMs: 3000,
  recentErrorAttempts: 5,
  recentErrorDays: 7,
  intervals: [1, 3, 7, 14, 30],
};
export const learningPolicy = { ...legacyLearningPolicy, version: 2 };
export type LearningPolicy = typeof learningPolicy;
export type Difficulty =
  "unknown" | "error" | "slow" | "developing" | "fluent" | "mastered";
export interface Evidence {
  sessionId: string;
  exerciseId: string;
  correct: boolean;
  responseTimeMs: number;
  at: number;
  day: string;
  timeZone: string;
}
export interface PairProgress {
  canonicalId: string;
  policyVersion: number;
  attempts: number;
  correct: number;
  errors: number;
  consecutiveCorrect: number;
  recent: Evidence[];
  directions: Record<
    string,
    { attempts: number; correct: number; lastAttemptAt: number }
  >;
  lastAttemptAt: number;
  lastErrorAt: number | null;
  intervalIndex: number; // -1 means not yet stable enough for a full day.
  lastIntervalDay: string | null;
  nextReviewAt: number;
  masteredAt: number | null;
  retentionCheck?: RetentionCheck | null;
}
export interface RetentionCheck {
  at: number;
  dueAt: number;
  intervalDays: number;
  timeZone: string;
}
export function median(values: readonly number[]): number | null {
  if (!values.length) return null;
  const sorted = [...values].sort((a, b) => a - b);
  return (sorted[(sorted.length - 1) >> 1]! + sorted[sorted.length >> 1]!) / 2;
}
export function calendarDay(at: number, timeZone: string): string {
  const parts = new Intl.DateTimeFormat("en", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(at);
  return ["year", "month", "day"]
    .map((part) => parts.find((p) => p.type === part)!.value)
    .join("-");
}
export function masteryEvidence(
  progress: PairProgress,
  now: number,
  policy = learningPolicy,
) {
  const recent = progress.recent.slice(-policy.window);
  const successes = recent.filter((a) => a.correct);
  const speed = median(
    successes.slice(-policy.speedWindow).map((a) => a.responseTimeMs),
  );
  const fact = getFact(progress.canonicalId);
  const orientations = new Set([
    fact.id,
    `mul:${fact.operands[1]}:${fact.operands[0]}`,
  ]);
  const bothDirections = [...orientations].every((id) => {
    const direction = recent.filter((a) => a.exerciseId === id);
    return (
      direction.at(-1)?.correct === true &&
      direction.some((a) => a.correct && a.responseTimeMs <= policy.fastMs)
    );
  });
  const recentError =
    recent.slice(-policy.recentErrorAttempts).some((a) => !a.correct) ||
    (progress.lastErrorAt !== null &&
      now - progress.lastErrorAt < policy.recentErrorDays * DAY_MS);
  const accuracy = recent.length ? successes.length / recent.length : 0;
  const days = new Set(successes.map((a) => a.day)).size;
  const sessions = new Set(successes.map((a) => a.sessionId)).size;
  const eligible =
    successes.length >= policy.minSuccesses &&
    days >= policy.minDays &&
    sessions >= policy.minSessions &&
    accuracy >= policy.accuracy &&
    speed !== null &&
    speed <= policy.fastMs &&
    bothDirections &&
    !recentError;
  return {
    accuracy,
    speed,
    days,
    sessions,
    bothDirections,
    recentError,
    eligible,
    mastered: progress.masteredAt !== null && eligible,
  };
}
export function updateProgress(
  previous: PairProgress | undefined,
  attempt: Attempt,
  policy = learningPolicy,
): PairProgress {
  if (attempt.mode === "diagnostic")
    throw new Error("Diagnostics cannot grant learning evidence");
  if (previous && previous.canonicalId !== attempt.canonicalId)
    throw new Error("Different pair");
  const day = calendarDay(attempt.createdAt, policy.timeZone);
  const fast = attempt.correct && attempt.responseTimeMs <= policy.fastMs;
  const consecutiveCorrect = attempt.correct
    ? (previous?.consecutiveCorrect ?? 0) + 1
    : 0;
  let intervalIndex = previous?.intervalIndex ?? -1;
  let lastIntervalDay = previous?.lastIntervalDay ?? null;
  if (!attempt.correct) {
    intervalIndex = -1;
    lastIntervalDay = day;
  } else if (!fast) {
    intervalIndex = Math.min(intervalIndex, 0);
    lastIntervalDay = day;
  } else if (
    consecutiveCorrect >= 2 &&
    (intervalIndex < 0 ||
      (day !== lastIntervalDay &&
        attempt.createdAt >= (previous?.nextReviewAt ?? 0)))
  ) {
    intervalIndex = Math.min(intervalIndex + 1, policy.intervals.length - 1);
    lastIntervalDay = day;
  }
  const direction = previous?.directions[attempt.exerciseId];
  const proposedReview =
    attempt.createdAt + policy.intervals[Math.max(0, intervalIndex)]! * DAY_MS;
  const early =
    previous !== undefined &&
    previous.intervalIndex >= 0 &&
    attempt.createdAt < previous.nextReviewAt;
  const next: PairProgress = {
    canonicalId: attempt.canonicalId,
    policyVersion: policy.version,
    attempts: (previous?.attempts ?? 0) + 1,
    correct: (previous?.correct ?? 0) + Number(attempt.correct),
    errors: (previous?.errors ?? 0) + Number(!attempt.correct),
    consecutiveCorrect,
    recent: [
      ...(previous?.recent ?? []),
      {
        sessionId: attempt.sessionId,
        exerciseId: attempt.exerciseId,
        correct: attempt.correct,
        responseTimeMs: attempt.responseTimeMs,
        at: attempt.createdAt,
        day,
        timeZone: policy.timeZone,
      },
    ].slice(-policy.window),
    directions: {
      ...previous?.directions,
      [attempt.exerciseId]: {
        attempts: (direction?.attempts ?? 0) + 1,
        correct: (direction?.correct ?? 0) + Number(attempt.correct),
        lastAttemptAt: attempt.createdAt,
      },
    },
    lastAttemptAt: attempt.createdAt,
    lastErrorAt: attempt.correct
      ? (previous?.lastErrorAt ?? null)
      : attempt.createdAt,
    intervalIndex,
    lastIntervalDay,
    nextReviewAt: !attempt.correct
      ? attempt.createdAt
      : early
        ? Math.min(previous.nextReviewAt, proposedReview)
        : proposedReview,
    masteredAt: null,
  };
  next.masteredAt =
    attempt.correct && masteryEvidence(next, attempt.createdAt, policy).eligible
      ? (previous?.masteredAt ?? attempt.createdAt)
      : null;
  if (policy.version === learningPolicy.version || previous?.retentionCheck !== undefined) {
    const check = retentionAfter(previous?.retentionCheck, previous, next, attempt, policy);
    if (check !== undefined) next.retentionCheck = check;
  }
  return next;
}

export function retentionAfter(
  lastCheck: RetentionCheck | null | undefined,
  previous: PairProgress | undefined,
  next: PairProgress,
  attempt: Attempt,
  policy: LearningPolicy,
) {
  if (next.masteredAt === null || !attempt.correct || attempt.responseTimeMs > policy.fastMs)
    return null;
  const prior = previous?.recent.at(-1);
  const current = next.recent.at(-1)!;
  const intervalDays = previous && policy.intervals[previous.intervalIndex];
  if (
    previous && previous.masteredAt !== null && intervalDays !== undefined && prior &&
    attempt.createdAt >= previous.nextReviewAt &&
    attempt.createdAt - prior.at >= intervalDays * DAY_MS &&
    current.sessionId !== prior.sessionId &&
    current.day !== previous.lastIntervalDay &&
    current.day !== prior.day &&
    current.day !== calendarDay(prior.at, current.timeZone)
  ) {
    return {
      at: current.at,
      dueAt: previous.nextReviewAt,
      intervalDays,
      timeZone: current.timeZone,
    };
  }
  return lastCheck;
}
export function difficulty(
  progress: PairProgress | undefined,
  baseline: readonly Attempt[],
  now: number,
  policy = learningPolicy,
): Difficulty {
  if (progress) {
    const evidence = masteryEvidence(progress, now, policy);
    if (evidence.mastered) return "mastered";
    if (evidence.recentError) return "error";
    if (evidence.speed !== null && evidence.speed > policy.fastMs)
      return "slow";
    return evidence.bothDirections ? "fluent" : "developing";
  }
  if (baseline.some((a) => !a.correct)) return "error";
  if (baseline.some((a) => a.correct && a.responseTimeMs > policy.fastMs))
    return "slow";
  // A single orientation in the baseline never marks the whole pair checked.
  if (!baseline.length) return "unknown";
  const fact = getFact(baseline[0]!.canonicalId);
  const needed = fact.operands[0] === fact.operands[1] ? 1 : 2;
  return new Set(baseline.map((a) => a.exerciseId)).size < needed
    ? "unknown"
    : "fluent";
}
