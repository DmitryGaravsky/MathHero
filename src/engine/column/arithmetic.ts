export type ColumnOperation = "addition" | "subtraction";
export type Place = 0 | 1 | 2 | 3;
export type OperandPlace = 0 | 1 | 2;
export type Places<T> = readonly [T, T, T, T];
export const places = [0, 1, 2, 3] as const;
const operandPlaces = [0, 1, 2] as const;

export const columnSkills = {
  addition: ["no-carry", "single-carry", "multiple-carries", "carry-to-thousands"],
  subtraction: ["no-borrow", "single-borrow", "multiple-borrows", "borrow-through-zero", "zero-result"],
} as const;
export type ColumnSkill = (typeof columnSkills)[ColumnOperation][number];

export interface ColumnExercise {
  readonly operation: ColumnOperation;
  readonly top: number;
  readonly bottom: number;
}

interface StepDigits {
  place: OperandPlace;
  topDigit: number;
  bottomDigit: number;
  resultDigit: number;
}
export interface AdditionStep extends StepDigits {
  carryIn: 0 | 1;
  sum: number;
  carryOut: 0 | 1;
}
export interface SubtractionStep extends StepDigits {
  lentToLower: 0 | 1;
  borrowFromHigher: 0 | 1;
  adjustedTop: number;
}
export type ColumnWork =
  | { operation: "addition"; steps: AdditionStep[]; thousandsDigit: 0 | 1; answer: number }
  | { operation: "subtraction"; steps: SubtractionStep[]; answer: number };

export function columnExercise(operation: ColumnOperation, top: number, bottom: number): ColumnExercise {
  if (
    (operation !== "addition" && operation !== "subtraction") ||
    ![top, bottom].every((n) => Number.isInteger(n) && n >= 100 && n <= 999) ||
    (operation === "subtraction" && bottom > top)
  ) throw new RangeError("Invalid column exercise");
  return { operation, top, bottom };
}

export function exerciseId({ operation, top, bottom }: ColumnExercise) {
  return `${operation}:${top}:${bottom}`;
}

export function operandPairId({ operation, top, bottom }: ColumnExercise) {
  return `${operation}:${Math.max(top, bottom)}:${Math.min(top, bottom)}`;
}

export function digitAt(n: number, place: Place) {
  return Math.floor(n / 10 ** place) % 10;
}

/** Step data for explicitly requested explanations, in units-to-hundreds order. */
export function columnWork({ operation, top, bottom }: ColumnExercise): ColumnWork {
  if (operation === "addition") {
    let carry: 0 | 1 = 0;
    const steps = operandPlaces.map((place): AdditionStep => {
      const topDigit = digitAt(top, place);
      const bottomDigit = digitAt(bottom, place);
      const carryIn = carry;
      const sum = topDigit + bottomDigit + carryIn;
      carry = sum >= 10 ? 1 : 0;
      return { place, topDigit, bottomDigit, carryIn, sum, carryOut: carry, resultDigit: sum % 10 };
    });
    return { operation, steps, thousandsDigit: carry, answer: top + bottom };
  }
  let borrow: 0 | 1 = 0;
  const steps = operandPlaces.map((place): SubtractionStep => {
    const topDigit = digitAt(top, place);
    const bottomDigit = digitAt(bottom, place);
    const lentToLower = borrow;
    borrow = topDigit - lentToLower < bottomDigit ? 1 : 0;
    const adjustedTop = topDigit - lentToLower + 10 * borrow;
    return { place, topDigit, bottomDigit, lentToLower, borrowFromHigher: borrow, adjustedTop, resultDigit: adjustedTop - bottomDigit };
  });
  return { operation, steps, answer: top - bottom };
}

export function skillFor(work: ColumnWork): ColumnSkill {
  if (work.operation === "addition") {
    if (work.thousandsDigit) return "carry-to-thousands";
    const carries = work.steps.filter((step) => step.carryOut).length;
    return carries === 2 ? "multiple-carries" : carries === 1 ? "single-carry" : "no-carry";
  }
  if (work.answer === 0) return "zero-result";
  if (work.steps.some((step) => step.topDigit === 0 && step.lentToLower && step.borrowFromHigher)) {
    return "borrow-through-zero";
  }
  const borrows = work.steps.filter((step) => step.borrowFromHigher).length;
  return borrows === 2 ? "multiple-borrows" : borrows === 1 ? "single-borrow" : "no-borrow";
}
