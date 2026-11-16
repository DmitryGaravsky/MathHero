import { getFact } from "../multiplication/facts";
import type { Attempt } from "../sessions/diagnostic";
import {
  calendarDay,
  legacyLearningPolicy,
  masteryEvidence,
  median,
  retentionAfter,
  updateProgress,
  type LearningPolicy,
  type PairProgress,
  type RetentionCheck,
} from "./progress";

export const knowledgeStates = ["learned", "fluent", "retained"] as const;
export type PolicyBySession = ReadonlyMap<string, LearningPolicy>;
export const observationWindow = 10;
const learnedAccuracy = 0.8;
const fluentAccuracy = 0.9;
const fluentFastShare = 0.8;

export function knowledgeState(
  progress: PairProgress | undefined,
  policies: PolicyBySession,
  now: number,
  check = progress?.retentionCheck,
) {
  if (!progress) return "unconfirmed";
  const latest = new Map(progress.recent.map((row) => [row.exerciseId, row]));
  const [a, b] = getFact(progress.canonicalId).operands;
  const successes = progress.recent.filter((row) => row.correct);
  const accuracy = successes.length / progress.recent.length;
  const learned = successes.length >= 2 && accuracy >= learnedAccuracy &&
    latest.size === (a === b ? 1 : 2) && [...latest.values()].every((row) => row.correct);
  if (!learned) return "unconfirmed";
  const fast = successes.filter((row) => row.responseTimeMs <= policies.get(row.sessionId)!.fastMs);
  const fluent = accuracy >= fluentAccuracy && fast.length / successes.length >= fluentFastShare &&
    fast.length >= 3 && new Set(fast.map((row) => row.sessionId)).size >= 2 &&
    [...latest.values()].every((row) => fast.includes(row));
  if (!fluent) return "learned";
  const lastPolicy = policies.get(progress.recent.at(-1)!.sessionId)!;
  return check && masteryEvidence(progress, now, lastPolicy).mastered ? "retained" : "fluent";
}

export function replayPairEvidence(attempts: readonly Attempt[], policies: PolicyBySession) {
  let progress: PairProgress | undefined;
  let check: RetentionCheck | null = null;
  let masteredBefore = false;
  let setbacks: string[] = [];
  // Callers supply journal order. An equal or earlier wall-clock timestamp can still be a later answer.
  for (const attempt of attempts) {
    if (attempt.mode === "diagnostic") continue;
    const policy = policies.get(attempt.sessionId)!;
    const next = updateProgress(progress, attempt, policy);
    const nextCheck = retentionAfter(check, progress, next, attempt, policy);
    const mastered = next.masteredAt !== null;
    if ((mastered && progress?.masteredAt == null) || (nextCheck && nextCheck !== check))
      setbacks = [];
    if (masteredBefore && (!attempt.correct || attempt.responseTimeMs > policy.fastMs))
      setbacks = [...setbacks.slice(1 - observationWindow), attempt.id];
    masteredBefore ||= mastered;
    check = nextCheck ?? null;
    progress = next;
  }
  return { check, setbacks };
}

interface Observation {
  sessionId: string;
  day: string;
  correct: boolean;
  responseTimeMs: number;
  fastMs: number;
}

function acrossSessionsAndDays(rows: readonly Observation[]) {
  return new Set(rows.map((row) => row.sessionId)).size >= 2 &&
    new Set(rows.map((row) => row.day)).size >= 2;
}

export function recentObservations(rows: readonly Observation[]) {
  const wrong = rows.filter((row) => !row.correct);
  const times = rows.filter((row) => row.correct).map((row) => row.responseTimeMs);
  return {
    answered: rows.length,
    wrong: wrong.length,
    slow: rows.filter((row) => row.correct && row.responseTimeMs > row.fastMs).length,
    recurring: acrossSessionsAndDays(wrong),
    accuracy: rows.length ? times.length / rows.length : null,
    medianCorrectMs: median(times),
  };
}

export function observedAttempt(attempt: Attempt, policies: PolicyBySession) {
  const policy = attempt.mode === "diagnostic" ? legacyLearningPolicy : policies.get(attempt.sessionId)!;
  return {
    ...attempt,
    fastMs: policy.fastMs,
    day: calendarDay(attempt.createdAt, policy.timeZone),
  };
}

export function pairObservations(attempts: readonly Attempt[], policies: PolicyBySession) {
  const practice = attempts.filter((attempt) => attempt.mode !== "diagnostic");
  const rows = (practice.length ? practice : attempts).slice(-observationWindow)
    .map((attempt) => observedAttempt(attempt, policies));
  const stats = recentObservations(rows);
  const replay = replayPairEvidence(practice, policies);
  const unstable = acrossSessionsAndDays(rows.filter((row) => replay.setbacks.includes(row.id)));
  const wrong = rows.find((row) => !row.correct);
  let possibleSlip = false;
  if (practice.length && stats.wrong === 1 && wrong) {
    const direction = rows.filter((row) => row.exerciseId === wrong.exerciseId);
    const position = direction.indexOf(wrong);
    const before = direction[position - 1];
    const after = direction[position + 1];
    const expected = String(wrong.expectedAnswer);
    possibleSlip = expected.length === 2 && String(wrong.answer) === [...expected].reverse().join("") &&
      before !== undefined && after !== undefined &&
      [before, after].every((row) => row.correct && row.responseTimeMs <= row.fastMs) &&
      new Set([before.sessionId, wrong.sessionId, after.sessionId]).size === 3 &&
      new Set([before.day, wrong.day, after.day]).size === 3;
  }
  return { ...stats, ...replay, unstable, possibleSlip, diagnosticOnly: !practice.length && !!rows.length };
}
