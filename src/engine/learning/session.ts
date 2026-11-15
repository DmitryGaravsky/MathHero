import type { Clock, RandomSource } from "../core/Exercise";
import { getFact } from "../multiplication/facts";
import {
  answerDiagnostic,
  type DiagnosticSession,
  type Attempt,
} from "../sessions/diagnostic";
import { selectNext, updateRepeats, type Repeat } from "./scheduler";
import {
  updateProgress,
  learningPolicy,
  type LearningPolicy,
  type PairProgress,
} from "./progress";

export interface LearningSession extends Omit<
  DiagnosticSession,
  "schemaVersion" | "mode" | "phase"
> {
  schemaVersion: 2;
  mode: "adaptive" | "weak";
  phase: "question" | "feedback" | "completed";
  total: number;
  sequence: number; // Monotonic within mode + target, including equal wall-clock timestamps.
  policy: LearningPolicy;
  targetPair?: string;
  repeats: Repeat[];
  endReason: "complete" | "early" | null;
  summary: {
    answered: number;
    correct: number;
    correctTimes: number[];
    improvedPairs: string[];
    masteredPairs: string[];
  };
}
export type Session = DiagnosticSession | LearningSession;
export function createLearning(
  id: string,
  mode: LearningSession["mode"],
  progress: PairProgress[],
  diagnostics: Attempt[],
  clock: Clock,
  random: RandomSource,
  targetPair?: string,
  policy = learningPolicy,
): LearningSession {
  const target = targetPair ? getFact(targetPair).canonicalId : undefined;
  const session: LearningSession = {
    schemaVersion: 2,
    id,
    mode,
    order: [],
    cursor: 0,
    phase: "question",
    draft: "",
    activeMs: 0,
    owner: null,
    startedAt: clock.now(),
    completedAt: null,
    lastAttempt: null,
    total: 24,
    sequence: 0,
    policy: { ...policy, intervals: [...policy.intervals] },
    repeats: [],
    endReason: null,
    summary: {
      answered: 0,
      correct: 0,
      correctTimes: [],
      improvedPairs: [],
      masteredPairs: [],
    },
    ...(target ? { targetPair: target } : {}),
  };
  session.order.push(
    selectNext(
      { ...session, history: [] },
      progress,
      diagnostics,
      clock.now(),
      random,
    ),
  );
  return session;
}
export function answerLearning(
  session: LearningSession,
  answer: number,
  activeMs: number,
  previous: PairProgress | undefined,
  clock: Clock,
) {
  // Shared answer validation and fact evaluation; diagnostic evidence is never persisted here.
  const evaluated = answerDiagnostic(
    { ...session, schemaVersion: 1, mode: "diagnostic" },
    answer,
    activeMs,
    clock,
  );
  const attempt = { ...evaluated.attempt, mode: session.mode };
  const progress = updateProgress(previous, attempt, session.policy);
  const improved =
    attempt.correct &&
    previous !== undefined &&
    (previous.recent.at(-1)?.correct === false ||
      (previous.recent.at(-1)!.responseTimeMs > session.policy.fastMs &&
        attempt.responseTimeMs <= session.policy.fastMs));
  const next: LearningSession = {
    ...session,
    cursor: session.cursor + 1,
    phase: "feedback",
    draft: "",
    activeMs: 0,
    lastAttempt: attempt,
    completedAt:
      session.cursor + 1 === session.total ? attempt.createdAt : null,
    endReason: session.cursor + 1 === session.total ? "complete" : null,
    repeats: updateRepeats(session.repeats, attempt, progress.attempts),
    summary: {
      answered: session.cursor + 1,
      correct: session.summary.correct + Number(attempt.correct),
      correctTimes: attempt.correct
        ? [...session.summary.correctTimes, attempt.responseTimeMs]
        : session.summary.correctTimes,
      improvedPairs: [
        ...new Set([
          ...session.summary.improvedPairs,
          ...(improved ? [attempt.canonicalId] : []),
        ]),
      ],
      masteredPairs: [
        ...new Set([
          ...session.summary.masteredPairs,
          ...(progress.masteredAt !== null && previous?.masteredAt == null
            ? [attempt.canonicalId]
            : []),
        ]),
      ],
    },
  };
  return { session: next, attempt, progress };
}
export function advanceLearning(
  session: LearningSession,
  progress: PairProgress[],
  diagnostics: Attempt[],
  clock: Clock,
  random: RandomSource,
): LearningSession {
  if (session.phase !== "feedback")
    throw new Error("Cannot advance this phase");
  if (session.cursor === session.total)
    return { ...session, phase: "completed" };
  const next = selectNext(
    { ...session, history: session.order.slice(0, session.cursor) },
    progress,
    diagnostics,
    clock.now(),
    random,
  );
  return { ...session, phase: "question", order: [...session.order, next] };
}
