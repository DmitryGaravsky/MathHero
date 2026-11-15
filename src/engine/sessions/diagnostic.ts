import type { Clock, RandomSource, OperationType } from "../core/Exercise";
import {
  getFact,
  multiplicationFacts,
  randomIndex,
  evaluateMultiplication,
} from "../multiplication/facts";

export type SessionMode = "diagnostic" | "adaptive" | "weak";
export interface Attempt {
  id: string;
  sessionId: string;
  mode: SessionMode;
  operation: OperationType;
  ordinal: number;
  exerciseId: string;
  canonicalId: string;
  answer: number;
  expectedAnswer: number;
  correct: boolean;
  responseTimeMs: number;
  createdAt: number;
}
export interface DiagnosticSession {
  schemaVersion: 1;
  id: string;
  mode: "diagnostic";
  order: string[];
  cursor: number; // Number of committed answers; next unanswered index.
  phase: "question" | "feedback" | "break" | "completed";
  draft: string;
  activeMs: number; // Checkpoint of the current question, never a wall-clock start.
  owner: string | null;
  startedAt: number;
  completedAt: number | null;
  lastAttempt: Attempt | null;
}
export const PART_SIZE = 24;
export function createDiagnostic(
  id: string,
  clock: Clock,
  random: RandomSource,
): DiagnosticSession {
  const order = multiplicationFacts.map((fact) => fact.id);
  for (let i = order.length - 1; i > 0; i--) {
    const j = randomIndex(i + 1, random);
    [order[i], order[j]] = [order[j]!, order[i]!];
  }
  return {
    schemaVersion: 1,
    id,
    mode: "diagnostic",
    order,
    cursor: 0,
    phase: "question",
    draft: "",
    activeMs: 0,
    owner: null,
    startedAt: clock.now(),
    completedAt: null,
    lastAttempt: null,
  };
}
export function answerDiagnostic(
  session: DiagnosticSession,
  answer: number,
  activeMs: number,
  clock: Clock,
) {
  if (session.phase !== "question" || session.cursor >= session.order.length)
    throw new Error("No open question");
  if (
    !Number.isSafeInteger(answer) ||
    answer < 0 ||
    answer > 999 ||
    !Number.isFinite(activeMs) ||
    activeMs < 0
  )
    throw new Error("Invalid answer or timing");
  const fact = getFact(session.order[session.cursor]!);
  const attempt: Attempt = {
    id: `${session.id}:${session.cursor}`,
    sessionId: session.id,
    mode: "diagnostic",
    operation: "multiplication",
    ordinal: session.cursor,
    exerciseId: fact.id,
    canonicalId: fact.canonicalId,
    answer,
    expectedAnswer: fact.expectedAnswer,
    correct: evaluateMultiplication(fact, answer),
    responseTimeMs: Math.round(activeMs),
    createdAt: clock.now(),
  };
  const next: DiagnosticSession = {
    ...session,
    cursor: session.cursor + 1,
    phase: "feedback",
    activeMs: 0,
    draft: "",
    lastAttempt: attempt,
    completedAt:
      session.cursor + 1 === session.order.length ? attempt.createdAt : null,
  };
  return { session: next, attempt };
}
export function advanceDiagnostic(
  session: DiagnosticSession,
): DiagnosticSession {
  if (session.phase === "feedback")
    return {
      ...session,
      phase:
        session.cursor === session.order.length
          ? "completed"
          : session.cursor % PART_SIZE === 0
            ? "break"
            : "question",
    };
  if (session.phase === "break") return { ...session, phase: "question" };
  throw new Error("Cannot advance this phase");
}
