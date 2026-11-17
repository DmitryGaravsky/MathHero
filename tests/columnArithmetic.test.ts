import { describe, expect, it } from "vitest";
import { columnExercise, columnSkills, columnWork, digitAt, exerciseId, operandPairId, skillFor, type ColumnOperation, type Place } from "../src/engine/column/arithmetic";
import { editColumnDraft, evaluateColumnAnswer, isColumnInput, newColumnDraft, columnInput, type ColumnDraft } from "../src/engine/column/draft";
import { columnRandom, generateColumnExercise } from "../src/engine/column/generator";

function enter(operation: ColumnOperation, digits: number[], marks: Place[] = [], draft: ColumnDraft = newColumnDraft()) {
  for (const place of marks) draft = editColumnDraft(operation, draft, { type: "toggle-mark", place });
  for (const digit of digits) draft = editColumnDraft(operation, draft, { type: "digit", digit });
  return draft;
}

describe("column arithmetic", () => {
  it("computes chained carry and borrow hint data", () => {
    const addition = columnWork(columnExercise("addition", 586, 647));
    const subtraction = columnWork(columnExercise("subtraction", 604, 187));
    expect(addition).toEqual({
      operation: "addition", answer: 1233, thousandsDigit: 1,
      steps: [
        { place: 0, topDigit: 6, bottomDigit: 7, carryIn: 0, sum: 13, carryOut: 1, resultDigit: 3 },
        { place: 1, topDigit: 8, bottomDigit: 4, carryIn: 1, sum: 13, carryOut: 1, resultDigit: 3 },
        { place: 2, topDigit: 5, bottomDigit: 6, carryIn: 1, sum: 12, carryOut: 1, resultDigit: 2 },
      ],
    });
    expect(subtraction).toEqual({
      operation: "subtraction", answer: 417,
      steps: [
        { place: 0, topDigit: 4, bottomDigit: 7, lentToLower: 0, borrowFromHigher: 1, adjustedTop: 14, resultDigit: 7 },
        { place: 1, topDigit: 0, bottomDigit: 8, lentToLower: 1, borrowFromHigher: 1, adjustedTop: 9, resultDigit: 1 },
        { place: 2, topDigit: 6, bottomDigit: 1, lentToLower: 1, borrowFromHigher: 0, adjustedTop: 5, resultDigit: 4 },
      ],
    });
  });

  it("satisfies per-place arithmetic invariants for every valid operand pair", () => {
    function failure(operation: ColumnOperation) {
      for (let a = 100; a <= 999; a++) {
        for (let b = 100; b <= (operation === "addition" ? 999 : a); b++) {
          const work = columnWork(columnExercise(operation, a, b));
          const expected = work.operation === "addition" ? a + b : a - b;
          if (work.answer !== expected || work.operation === "addition" && work.thousandsDigit !== digitAt(expected, 3)) return [a, b];
          for (const step of work.steps) {
            const { place, resultDigit, topDigit, bottomDigit } = step;
            const base = 10 ** place;
            if (resultDigit !== digitAt(expected, place)) return [a, b, place];
            if ("carryIn" in step) {
              const lowerCarry = Number(a % base + b % base >= base);
              const carry = Number(a % (base * 10) + b % (base * 10) >= base * 10);
              if (step.carryIn !== lowerCarry || step.carryOut !== carry || step.sum !== topDigit + bottomDigit + lowerCarry)
                return [a, b, place];
            } else {
              const lowerBorrow = Number(a % base < b % base);
              const borrow = Number(a % (base * 10) < b % (base * 10));
              if (step.lentToLower !== lowerBorrow || step.borrowFromHigher !== borrow || step.adjustedTop !== topDigit - lowerBorrow + 10 * borrow)
                return [a, b, place];
            }
          }
        }
      }
    }
    expect(failure("addition")).toBeUndefined();
    expect(failure("subtraction")).toBeUndefined();
    expect(columnWork(columnExercise("addition", 999, 999)).answer).toBe(1998);
    expect(() => columnExercise("subtraction", 100, 101)).toThrow(RangeError);
    expect(() => columnExercise("addition", 99, 100)).toThrow(RangeError);
    expect(() => columnExercise("addition", 100, 1000)).toThrow(RangeError);
  });

  it("restores the two approved marked drafts and their active places", () => {
    const addition = columnExercise("addition", 586, 647);
    const subtraction = columnExercise("subtraction", 604, 187);
    const addDraft = enter("addition", [3, 3, 2], [1, 2, 3]);
    const subDraft = enter("subtraction", [7, 1], [1, 2]);
    expect(addDraft).toEqual({ digits: [3, 3, 2, null], marks: [false, true, true, true], activePlace: 3, phase: "answering", hintShown: false });
    expect(subDraft).toEqual({ digits: [7, 1, null, null], marks: [false, true, true, false], activePlace: 2, phase: "answering", hintShown: false });
    const restore = (draft: ColumnDraft): ColumnDraft => JSON.parse(JSON.stringify(draft));
    expect(evaluateColumnAnswer(addition, enter("addition", [1], [], restore(addDraft)).digits).answer).toBe(1233);
    expect(evaluateColumnAnswer(subtraction, enter("subtraction", [4], [], restore(subDraft)).digits).answer).toBe(417);
  });

  it("distinguishes explicit zero and interior gaps from optional leading cells", () => {
    const check = (operation: ColumnOperation, a: number, b: number, digits: Parameters<typeof evaluateColumnAnswer>[1]) =>
      evaluateColumnAnswer(columnExercise(operation, a, b), digits);
    expect(check("addition", 199, 205, [4, 0, 4, null])).toEqual({ answer: 404, correct: true, firstMismatch: null });
    expect(check("addition", 199, 205, [4, null, 4, null])).toEqual({ answer: null, correct: false, firstMismatch: 1 });
    expect(check("addition", 199, 205, [4, 0, 4, 2])).toEqual({ answer: 2404, correct: false, firstMismatch: 3 });
    expect(check("addition", 501, 499, [0, 0, 0, 1]).correct).toBe(true);
    expect(check("addition", 501, 499, [0, null, null, 1]).firstMismatch).toBe(1);
    expect(check("addition", 501, 499, [0, 0, 0, null]).firstMismatch).toBe(3);
    expect(check("subtraction", 501, 492, [9, null, null, null]).correct).toBe(true);
    expect(check("subtraction", 501, 492, [9, 0, 0, null]).correct).toBe(true);
    expect(check("subtraction", 501, 492, [9, null, 0, null]).firstMismatch).toBe(1);
    expect(check("subtraction", 304, 304, [null, null, null, null]).firstMismatch).toBe(0);
    expect(check("subtraction", 304, 304, [0, null, null, null]).correct).toBe(true);
    expect(check("subtraction", 604, 187, [6, 2, 4, null]).firstMismatch).toBe(0);
  });

  it("lets the child select, replace, erase and toggle working notes independently", () => {
    const draft = enter("subtraction", [7, 1], [0, 2]);
    const erased = editColumnDraft("subtraction", draft, { type: "erase" });
    expect(erased).toEqual({ ...draft, activePlace: 1, digits: [7, null, null, null] });
    const selected = editColumnDraft("subtraction", erased, { type: "select", place: 0 });
    expect(enter("subtraction", [0], [2], selected)).toEqual({ ...draft, activePlace: 1, digits: [0, null, null, null], marks: [true, false, false, false] });
    expect(() => enter("addition", [], [0])).toThrow(RangeError);
    expect(() => enter("subtraction", [], [3])).toThrow(RangeError);
    expect(isColumnInput({ ...columnInput(draft), activePlace: 3 }, "subtraction")).toBe(false);
  });

  it("reproduces every skill and supplies fresh canonical pairs with a constant RNG", () => {
    for (const operation of ["addition", "subtraction"] as const) {
      for (const skill of columnSkills[operation]) {
        const seen = new Set<string>();
        for (let i = 0; i < 6; i++) {
          const a = generateColumnExercise(operation, skill, columnRandom(42, i), seen);
          const b = generateColumnExercise(operation, skill, columnRandom(42, i), seen);
          expect(a).toEqual(b);
          expect(a.fresh).toBe(true);
          expect(skillFor(columnWork(a.exercise))).toBe(skill);
          seen.add(operandPairId(a.exercise));
        }
      }
    }
    const a = generateColumnExercise("addition", "multiple-carries", { next: () => 0 }, new Set(), "answer-zero-digit");
    expect(String(columnWork(a.exercise).answer)).toContain("0");
    const b = generateColumnExercise("addition", "multiple-carries", { next: () => 0 }, new Set([operandPairId(a.exercise)]), "answer-zero-digit");
    expect(b.fresh).toBe(true);
    expect(operandPairId(b.exercise)).not.toBe(operandPairId(a.exercise));
    const [forward, reversed] = [columnExercise("addition", 586, 647), columnExercise("addition", 647, 586)];
    expect(operandPairId(forward!)).toBe(operandPairId(reversed!));
    expect(exerciseId(forward!)).not.toBe(exerciseId(reversed!));
    const exhausted = generateColumnExercise("subtraction", "zero-result", { next: () => 0 }, { has: () => true });
    expect(exhausted).toEqual({ exercise: { operation: "subtraction", top: 100, bottom: 100 }, fresh: false });
  });
});
