import type { RandomSource } from "../core/Exercise";
import {
  columnSkills,
  columnWork,
  operandPairId,
  skillFor,
  type ColumnExercise,
  type ColumnOperation,
  type ColumnSkill,
  type ColumnWork,
} from "./arithmetic";

export type ColumnFeature = "answer-zero-digit" | "chained-carries" | "short-result";
const supportedFeatures: Record<ColumnFeature, readonly ColumnSkill[]> = {
  "answer-zero-digit": ["multiple-carries"],
  "chained-carries": ["carry-to-thousands"],
  "short-result": ["borrow-through-zero"],
};

export function columnRandomIndex(size: number, random: RandomSource): number {
  const value = random.next();
  if (!Number.isFinite(value) || value < 0 || value >= 1)
    throw new RangeError("RNG must return [0, 1)");
  return Math.floor(value * size);
}

/** A v1 seed and zero-based ordinal specify a repeatable random stream for one selection. */
export function columnRandom(seed: number, ordinal = 0): RandomSource {
  let state = (seed + Math.imul(ordinal, 0x9e3779b9)) | 0;
  return {
    next() {
      state = (state + 0x6d2b79f5) | 0;
      let n = Math.imul(state ^ (state >>> 15), state | 1);
      n ^= n + Math.imul(n ^ (n >>> 7), n | 61);
      return ((n ^ (n >>> 14)) >>> 0) / 0x1_0000_0000;
    },
  };
}

function hasFeature(work: ColumnWork, feature: ColumnFeature) {
  switch (feature) {
    case "answer-zero-digit":
      return String(work.answer).includes("0");
    case "chained-carries":
      return work.operation === "addition" && work.steps.some((step) => step.carryIn && step.carryOut);
    case "short-result":
      return work.answer > 0 && work.answer < 100;
  }
}

export function generateColumnExercise(
  operation: ColumnOperation,
  skill: ColumnSkill,
  random: RandomSource,
  seen: Pick<ReadonlySet<string>, "has">,
  feature?: ColumnFeature,
): { exercise: ColumnExercise; fresh: boolean } {
  const skills: readonly ColumnSkill[] = columnSkills[operation];
  if (!skills?.includes(skill) || (feature && !supportedFeatures[feature]?.includes(skill)))
    throw new RangeError("Invalid column generation target");

  const drawOperand = () => 100 + columnRandomIndex(900, random);
  let repeated: ColumnExercise | undefined;
  let freshWithoutFeature: ColumnExercise | undefined;
  function consider(exercise: ColumnExercise) {
    const work = columnWork(exercise);
    if (skillFor(work) !== skill) return;
    if (seen.has(operandPairId(exercise))) {
      repeated ??= exercise;
    } else if (feature && !hasFeature(work, feature)) {
      freshWithoutFeature ??= exercise;
    } else {
      return { exercise, fresh: true };
    }
  }

  for (let i = 0; i < 96; i++) {
    const a = drawOperand();
    const b = skill === "zero-result" ? a : drawOperand();
    const [top, bottom] = operation === "subtraction" && b > a ? [b, a] : [a, b];
    const result = consider({ operation, top, bottom });
    if (result) return result;
  }

  // Search each canonical pair at most once, even with a constant RNG or an exhausted skill.
  const start = columnRandomIndex(900, random);
  for (let i = 0; i < 900; i++) {
    const top = 100 + (start + i) % 900;
    const firstBottom = skill === "zero-result" ? top : 100;
    for (let bottom = firstBottom; bottom <= top; bottom++) {
      const result = consider({ operation, top, bottom });
      if (result) return result;
    }
  }
  if (freshWithoutFeature) return { exercise: freshWithoutFeature, fresh: true };
  if (repeated) return { exercise: repeated, fresh: false };
  throw new Error("Empty column skill");
}
