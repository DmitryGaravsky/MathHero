/** Pure domain contracts. Implementations arrive in stage 2; no React imports here. */
export type OperationType =
  | "multiplication"
  | "division"
  | "multiDigitMultiplication"
  | "multiDigitDivision";
export interface Exercise {
  id: string;
  operation: OperationType;
  operands: readonly number[];
  expectedAnswer: number;
  display: { type: "inline" | "column" };
  difficulty: number;
}
export interface ExerciseEngine {
  generate(): Exercise;
  evaluate(exercise: Exercise, answer: number): boolean;
}
export interface Clock {
  now(): number;
}
export interface RandomSource {
  next(): number;
}
