import type { Exercise, ExerciseEngine, RandomSource } from "../core/Exercise";

export interface MultiplicationFact extends Exercise {
  operation: "multiplication";
  operands: readonly [number, number];
  canonicalId: string;
}

export function multiplicationFact(a: number, b: number): MultiplicationFact {
  if (![a, b].every((n) => Number.isInteger(n) && n >= 1 && n <= 12)) {
    throw new RangeError("Multiplication operands must be integers in 1..12");
  }
  return {
    id: `mul:${a}:${b}`,
    canonicalId: `mul:${Math.min(a, b)}:${Math.max(a, b)}`,
    operation: "multiplication",
    operands: [a, b],
    expectedAnswer: a * b,
    display: { type: "inline" },
    difficulty: Math.max(a, b),
  };
}

export const multiplicationFacts: readonly MultiplicationFact[] = Object.freeze(
  Array.from({ length: 144 }, (_, i) => {
    const fact = multiplicationFact(Math.floor(i / 12) + 1, (i % 12) + 1);
    Object.freeze(fact.operands);
    Object.freeze(fact.display);
    return Object.freeze(fact);
  }),
);
const byId = new Map(multiplicationFacts.map((fact) => [fact.id, fact]));
export function getFact(id: string): MultiplicationFact {
  const fact = byId.get(id);
  if (!fact) throw new Error("Unknown multiplication fact");
  return fact;
}
export function randomIndex(length: number, random: RandomSource): number {
  const value = random.next();
  if (!Number.isFinite(value) || value < 0 || value >= 1)
    throw new RangeError("RNG must return [0, 1)");
  return Math.floor(value * length);
}
export function evaluateMultiplication(
  exercise: Exercise,
  answer: number,
): boolean {
  if (exercise.operation !== "multiplication")
    throw new Error("Unsupported operation");
  const [a, b] = exercise.operands;
  if (exercise.operands.length !== 2 || a === undefined || b === undefined)
    throw new Error("Invalid operands");
  return (
    Number.isSafeInteger(answer) &&
    answer === multiplicationFact(a, b).expectedAnswer
  );
}
export class MultiplicationEngine implements ExerciseEngine {
  constructor(private readonly random: RandomSource) {}
  generate() {
    return multiplicationFacts[randomIndex(144, this.random)]!;
  }
  evaluate = evaluateMultiplication;
}
