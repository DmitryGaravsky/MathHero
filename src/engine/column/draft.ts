import { columnWork, digitAt, places, type ColumnExercise, type ColumnOperation, type Place, type Places } from "./arithmetic";

export interface ColumnInput {
  readonly digits: Places<number | null>;
  readonly marks: Places<boolean>;
  readonly activePlace: Place;
}

export interface ColumnDraft extends ColumnInput {
  readonly phase: "answering" | "incorrect" | "correct";
  readonly hintShown: boolean;
}

export type ColumnEdit =
  | { type: "select" | "toggle-mark"; place: Place }
  | { type: "digit"; digit: number }
  | { type: "erase" };

export function newColumnDraft(): ColumnDraft {
  return {
    digits: [null, null, null, null],
    marks: [false, false, false, false],
    activePlace: 0,
    phase: "answering",
    hintShown: false,
  };
}

export function columnInput({ digits, marks, activePlace }: ColumnDraft): ColumnInput {
  return { digits, marks, activePlace };
}

export function canMark(operation: ColumnOperation, place: Place) {
  return places.includes(place) && (operation === "addition" ? place > 0 : place < 3);
}

function isDigit(value: unknown): value is number {
  return typeof value === "number" && Number.isInteger(value) && value >= 0 && value <= 9;
}

export function isColumnInput(value: unknown, operation: ColumnOperation): value is ColumnInput {
  if (typeof value !== "object" || value === null) return false;
  const { digits, marks, activePlace } = value as Partial<ColumnInput>;
  return (
    Object.keys(value).length === 3 &&
    ["digits", "marks", "activePlace"].every((key) => Object.hasOwn(value, key)) &&
    Array.isArray(digits) && digits.length === 4 &&
    Array.isArray(marks) && marks.length === 4 &&
    activePlace !== undefined && places.includes(activePlace) &&
    (operation === "addition" || (activePlace < 3 && digits[3] === null)) &&
    places.every((place) =>
      (digits[place] === null || isDigit(digits[place])) &&
      (marks[place] === false || (marks[place] === true && canMark(operation, place))),
    )
  );
}

export function editColumnDraft(operation: ColumnOperation, draft: ColumnDraft, edit: ColumnEdit): ColumnDraft {
  if (draft.phase !== "answering") throw new Error("Column draft is in feedback");
  const maxPlace = operation === "addition" ? 3 : 2;
  const { activePlace } = draft;
  switch (edit.type) {
    case "select":
      if (!places.includes(edit.place) || edit.place > maxPlace) throw new RangeError("Invalid answer place");
      return { ...draft, activePlace: edit.place };
    case "digit": {
      if (!isDigit(edit.digit)) throw new RangeError("Invalid answer digit");
      const digits: [...Places<number | null>] = [...draft.digits];
      digits[activePlace] = edit.digit;
      return { ...draft, digits, activePlace: Math.min(activePlace + 1, maxPlace) as Place };
    }
    case "erase": {
      const right = (activePlace - 1) as Place;
      const place = activePlace > 0 && draft.digits[activePlace] === null && draft.digits[right] !== null
        ? right
        : activePlace;
      const digits: [...Places<number | null>] = [...draft.digits];
      digits[place] = null;
      return { ...draft, digits, activePlace: place };
    }
    case "toggle-mark": {
      if (!canMark(operation, edit.place)) throw new RangeError("Invalid mark place");
      const marks: [...Places<boolean>] = [...draft.marks];
      marks[edit.place] = !marks[edit.place];
      return { ...draft, marks };
    }
  }
}

export interface ColumnEvaluation {
  /** Null indicates empty or gapped digits. */
  answer: number | null;
  firstMismatch: Place | null;
  correct: boolean;
}

export function evaluateColumnAnswer(exercise: ColumnExercise, digits: Places<number | null>): ColumnEvaluation {
  const expected = columnWork(exercise).answer;
  const enteredWidth = digits.findLastIndex((digit) => digit !== null) + 1;
  const comparisonWidth = Math.max(String(expected).length, enteredWidth);
  let answer: number | null = enteredWidth ? 0 : null;
  let firstMismatch: Place | null = null;
  for (const place of places) {
    if (place >= comparisonWidth) break;
    const digit = digits[place];
    if (place < enteredWidth && answer !== null) {
      answer = digit === null ? null : answer + digit * 10 ** place;
    }
    if (firstMismatch === null && (digit === null || digit !== digitAt(expected, place))) firstMismatch = place;
  }
  return { answer, firstMismatch, correct: firstMismatch === null };
}
