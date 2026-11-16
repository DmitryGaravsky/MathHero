import { describe, expect, it } from "vitest";
import { columnSkills, columnWork, operandPairId, type ColumnOperation, type ColumnSkill } from "../src/engine/column/arithmetic";
import { columnInput, editColumnDraft, newColumnDraft, type ColumnInput } from "../src/engine/column/draft";
import { columnPolicy, hasRecurringColumnDifficulty, type ColumnSkillProgress } from "../src/engine/column/policy";
import { replayColumnJournal, validateColumnSessionSnapshot } from "../src/engine/column/replay";
import { addIssuedOperand, applyColumnEvent, checkpointColumnDraft, emptyColumnCursor, type ColumnAction, type ColumnJournalEntry, type ColumnSession } from "../src/engine/column/session";

const hour = 3_600_000;
const day = 24 * hour;
const base = Date.parse("2026-10-01T20:00:00Z");

class Practice {
  cursor = emptyColumnCursor;
  sessions = new Map<string, ColumnSession>();
  progress = {
    addition: new Map<ColumnSkill, ColumnSkillProgress>(),
    subtraction: new Map<ColumnSkill, ColumnSkillProgress>(),
  };
  seen = new Set<string>();
  entries: ColumnJournalEntry[] = [];

  session(id: string) { return this.sessions.get(id)!; }
  current(id: string) { return this.session(id).order.at(-1)!; }

  apply(id: string, action: ColumnAction, at = base) {
    const session = this.sessions.get(id);
    const operation = action.type === "start" ? action.operation : session!.operation;
    const entry = { ...action, sessionId: id, at, sequence: this.cursor.sequence + 1 };
    const result = applyColumnEvent({ session, cursor: this.cursor, progress: this.progress[operation], seen: this.seen }, entry);
    this.entries.push(entry);
    this.cursor = result.cursor;
    this.sessions.set(id, result.session);
    if (result.issued) addIssuedOperand(this.seen, result.issued);
    for (const row of result.changedProgress) this.progress[operation].set(row.skill, row);
    return result.attempt;
  }

  start(id: string, operation: ColumnOperation, at = base, seed = 42, timeZone = "Europe/Paris") {
    this.apply(id, { type: "start", operation, policyVersion: 1, seed, timeZone }, at);
  }

  capture(id: string, type: "hint" | "skip" | "finish", at = base) {
    const { draft, activeMs } = this.session(id);
    this.apply(id, { type, input: columnInput(draft!), activeMs }, at);
  }

  until(id: string, skill: ColumnSkill, at = base) {
    while (!this.session(id).end && this.current(id).skill !== skill) this.capture(id, "skip", at);
    if (this.session(id).end) throw new Error("Session did not visit the expected skill");
  }

  check(id: string, at = base, options: { wrong?: boolean; marks?: boolean; elapsed?: number } = {}) {
    const { exercise } = this.current(id);
    const correct = columnWork(exercise).answer;
    // Build the edited on-screen input independently from the draft's sticky journal fields.
    const n = options.wrong ? (correct || 1) - Number(correct > 0) : correct;
    let draft = newColumnDraft();
    for (const digit of String(n).split("").reverse()) draft = editColumnDraft(exercise.operation, draft, { type: "digit", digit: Number(digit) });
    if (options.marks) draft = editColumnDraft(exercise.operation, draft, { type: "toggle-mark", place: 1 });
    return this.apply(id, { type: "check", input: columnInput(draft), activeMs: options.elapsed ?? this.session(id).activeMs + 970 }, at)!;
  }
}

describe("column session and evidence", () => {
  it("starts independently and guarantees mixed, bounded six-example sessions with initial feature coverage", () => {
    for (const operation of ["addition", "subtraction"] as const) {
      for (let seed = 0; seed < 18; seed++) {
        const practice = new Practice();
        practice.start("test", operation, base, seed);
        expect(practice.session("test").draft).toEqual(newColumnDraft());
        const marked = practice.check("test", base, { marks: true, elapsed: 32_156 });
        expect(marked).toMatchObject({ correct: true, independent: true, hintShown: false, activeMs: 32_156 });
        practice.apply("test", { type: "advance" });
        while (!practice.session("test").end) practice.capture("test", "skip");
        const session = practice.session("test");
        const skills = session.order.map(({ skill }) => skill);
        expect(skills).toHaveLength(columnPolicy.sessionLength);
        expect(new Set(skills)).toEqual(new Set(columnSkills[operation]));
        expect(skills.slice(1).every((skill, i) => skill !== skills[i])).toBe(true);
        expect(new Set(session.order.map(({ exercise }) => operandPairId(exercise))).size).toBe(6);
        expect(session.summary).toEqual({ checked: 1, firstCorrect: 1, independent: 1, solved: 1, skipped: 5 });
        expect(session.end?.reason).toBe("complete");
        if (operation === "addition") {
          const forSkill = (skill: ColumnSkill) => columnWork(session.order.find((item) => item.skill === skill)!.exercise);
          expect(String(forSkill("multiple-carries").answer)).toContain("0");
          const thousands = forSkill("carry-to-thousands");
          expect(thousands.operation === "addition" && thousands.steps.some(({ carryIn, carryOut }) => carryIn && carryOut)).toBe(true);
        } else {
          const short = columnWork(session.order.find((item) => item.skill === "borrow-through-zero")!.exercise);
          expect(short.answer).toBeGreaterThan(0);
          expect(short.answer).toBeLessThan(100);
        }
      }
    }
  });

  it("preserves failed drafts, makes help sticky, and counts only one first check", () => {
    const practice = new Practice();
    practice.start("s", "subtraction");
    const empty = columnInput(practice.session("s").draft!);
    expect(() => practice.apply("s", { type: "check", input: empty, activeMs: 0 })).toThrow();
    const wrong = practice.check("s", base, { wrong: true, elapsed: 1700 });
    const feedback = practice.session("s");
    expect(feedback.draft).toMatchObject({ ...wrong.input, phase: "incorrect", hintShown: false });
    expect(() => practice.apply("s", { type: "advance" })).toThrow();
    expect(() => practice.apply("s", { type: "hint", input: wrong.input, activeMs: 2700 })).toThrow();
    practice.capture("s", "hint");
    practice.capture("s", "hint");
    const helped = replayColumnJournal(practice.entries).sessions.get("s")!;
    expect(helped).toEqual(practice.session("s"));
    expect(helped.draft?.hintShown).toBe(true);
    practice.apply("s", { type: "retry" });
    const retry = practice.session("s");
    expect(retry.draft).toMatchObject({ phase: "answering", hintShown: true, activePlace: wrong.firstMismatch });
    const correct = practice.check("s", base, { elapsed: 1910 });
    expect(correct).toMatchObject({ correct: true, checkNumber: 2, independent: false, hintShown: true, activeMs: 1910 });
    expect(() => practice.check("s")).toThrow();
    expect(practice.session("s").draft?.phase).toBe("correct");
    expect(practice.session("s").summary).toEqual({ checked: 1, firstCorrect: 0, independent: 0, solved: 1, skipped: 0 });
    const row = practice.progress.subtraction.get(correct.skill)!;
    expect(row).toMatchObject({ firstChecks: 1, firstCorrect: 0, independent: 0, solved: 1, helped: 1 });
    expect(row.recent).toEqual([{ attemptId: wrong.id, firstMismatch: wrong.firstMismatch, hintShown: false }]);
    expect(() => validateColumnSessionSnapshot(practice.session("s"), { ...practice.session("s"), activeMs: 1920 })).toThrow();

    practice.apply("s", { type: "advance" });
    practice.capture("s", "hint");
    expect(practice.check("s")).toMatchObject({ correct: true, independent: false, checkNumber: 1, hintShown: true });
    practice.capture("s", "finish");
    expect(practice.session("s").summary).toEqual({ checked: 2, firstCorrect: 1, independent: 0, solved: 2, skipped: 0 });
    expect(practice.session("s").end?.reason).toBe("early");
  });

  it("validates a mutable checkpoint tail without allowing edits to phase, help or the generated order", () => {
    const practice = new Practice();
    practice.start("a", "addition");
    practice.capture("a", "hint");
    const replayed = replayColumnJournal(practice.entries).sessions.get("a")!;
    const input: ColumnInput = { digits: [3, 3, 2, null], marks: [false, true, true, true], activePlace: 3 };
    const checkpoint = checkpointColumnDraft(replayed, input, 3225.7);
    const serialized: unknown = JSON.parse(JSON.stringify(checkpoint));
    expect(validateColumnSessionSnapshot(replayed, serialized)).toEqual(checkpoint);
    expect(() => validateColumnSessionSnapshot(replayed, { ...checkpoint, draft: { ...checkpoint.draft, hintShown: false } })).toThrow();
    expect(() => validateColumnSessionSnapshot(replayed, { ...checkpoint, draft: { ...checkpoint.draft, phase: "correct" } })).toThrow();
    expect(() => validateColumnSessionSnapshot(replayed, { ...checkpoint, order: [] })).toThrow();
    expect(() => validateColumnSessionSnapshot(replayed, { ...checkpoint, activeMs: -1 })).toThrow();
    expect(() => checkpointColumnDraft(checkpoint, input, 3210)).toThrow();
    expect(() => checkpointColumnDraft(checkpoint, { ...input, marks: [true, true, true, true] }, 3226)).toThrow();

    practice.start("s", "subtraction");
    const subtraction = replayColumnJournal(practice.entries).sessions.get("s")!;
    const subInput: ColumnInput = { digits: [7, 1, null, null], marks: [false, true, true, false], activePlace: 2 };
    const subCheckpoint = checkpointColumnDraft(subtraction, subInput, 2800);
    expect(validateColumnSessionSnapshot(subtraction, subCheckpoint).draft).toEqual({ ...subInput, phase: "answering", hintShown: false });
  });

  it("keeps unaided correction separate from independence and replays final feedback before completion", () => {
    const practice = new Practice();
    practice.start("a", "addition");
    practice.check("a", base, { wrong: true });
    practice.apply("a", { type: "retry" });
    expect(practice.check("a")).toMatchObject({ correct: true, hintShown: false, independent: false, checkNumber: 2 });
    practice.apply("a", { type: "advance" });
    while (practice.session("a").order.length < columnPolicy.sessionLength) practice.capture("a", "skip");
    practice.check("a");
    const finalFeedback = replayColumnJournal(practice.entries).sessions.get("a")!;
    expect(finalFeedback.draft?.phase).toBe("correct");
    expect(finalFeedback.end).toBeNull();
    practice.apply("a", { type: "advance" });
    expect(practice.session("a")).toMatchObject({ draft: null, end: { reason: "complete" }, summary: { checked: 2, firstCorrect: 1, independent: 1, solved: 2, skipped: 4 } });
  });

  it("uses different recorded local days, distinct sessions and a full elapsed gap for retained evidence", () => {
    const practice = new Practice();
    const skill = "no-carry";
    const solve = (id: string, at: number) => {
      practice.start(id, "addition", at);
      practice.until(id, skill, at);
      const selection = practice.current(id);
      practice.check(id, at, { marks: true });
      practice.capture(id, "finish", at);
      return selection;
    };
    const a = solve("a", base);
    const b = solve("b", base + 3 * hour); // Same UTC date, different Paris dates.
    expect(b.review).toBeNull();
    expect(practice.progress.addition.get(skill)?.supporting.map(({ day }) => day)).toEqual(["2026-10-01", "2026-10-02"]);
    const c = solve("c", base + 6 * hour); // Different UTC date, same Paris date as b.
    expect(practice.progress.addition.get(skill)?.supporting.map(({ sessionId }) => sessionId)).toEqual(["a", "b"]);
    expect(practice.progress.addition.get(skill)?.retained).toBeNull();
    const d = solve("d", base + 6 * hour + day);
    expect(d.reason).toBe("review");
    expect(d.review).toMatchObject({ previousPractice: { sessionId: "c", at: base + 6 * hour }, issuedAt: base + 6 * hour + day });
    expect(new Set([a, b, c, d].map(({ exercise }) => operandPairId(exercise))).size).toBe(4);
    const proof = practice.progress.addition.get(skill)?.retained;
    expect(proof?.supportingAttemptIds.map((id) => id[0])).toEqual(["a", "b"]);
    expect(replayColumnJournal(practice.entries).progress.addition.get(skill)?.retained).toEqual(proof);

    const later = base + 6 * hour + 4 * day;
    practice.start("e", "addition", later);
    practice.until("e", skill, later);
    practice.capture("e", "hint", later);
    const miss = practice.check("e", later, { wrong: true });
    const regressed = practice.progress.addition.get(skill)!;
    expect(regressed.retained).toBeNull();
    expect(regressed.supporting).toEqual([]);
    expect(regressed.recent.at(-1)).toEqual({ attemptId: miss.id, firstMismatch: miss.firstMismatch, hintShown: true });
    expect(replayColumnJournal(practice.entries).attempts.some((attempt) => attempt.id === proof?.attemptId && attempt.independent)).toBe(true);
  });

  it("anchors review to the last real check or later unfinished practice, regardless of initial issue time", () => {
    const practice = new Practice();
    const skill = "borrow-through-zero";
    const begin = (id: string, at: number) => {
      practice.start(id, "subtraction", at);
      practice.until(id, skill, at);
      return practice.current(id);
    };
    begin("a", base);
    practice.check("a", base + 23 * hour);
    practice.capture("a", "finish", base + 23 * hour);
    expect(begin("b", base + day).review).toBeNull();
    practice.capture("b", "hint", base + day + hour);
    practice.capture("b", "finish", base + day + 2 * hour);
    expect(begin("c", base + 2 * day + 2 * hour - 1).review).toBeNull();
    practice.capture("c", "finish", base + 2 * day + 2 * hour - 1);
    expect(begin("d", base + 3 * day + 2 * hour - 1).review?.previousPractice).toMatchObject({ sessionId: "c" });
    const row = practice.progress.subtraction.get(skill)!;
    practice.progress.subtraction.set(skill, { ...row, lastPractice: { ...row.lastPractice, sessionId: "intervening" } });
    expect(() => practice.check("d", base + 3 * day + 2 * hour - 1)).toThrow("Missing current column exposure");
  });

  it("revisits recurring misses with fresh pairs without pretending a specific error cause", () => {
    const practice = new Practice();
    const skill = "single-carry";
    const operands = new Set<string>();
    for (const id of ["first", "second"]) {
      practice.start(id, "addition");
      practice.until(id, skill);
      operands.add(operandPairId(practice.current(id).exercise));
      practice.check(id, base, { wrong: true });
      practice.capture(id, "finish");
    }
    expect(hasRecurringColumnDifficulty(practice.progress.addition.get(skill)!)).toBe(true);
    practice.start("third", "addition");
    expect(practice.current("third")).toMatchObject({ skill, reason: "difficulty", fresh: true });
    expect(operands.has(operandPairId(practice.current("third").exercise))).toBe(false);
  });

  it("replays interleaved operations by commit sequence under equal or backward clocks and rejects impossible history", () => {
    const practice = new Practice();
    practice.start("a", "addition");
    practice.start("s", "subtraction", base - 2 * day);
    const one = practice.check("a");
    const two = practice.check("s", base - day);
    const replay = replayColumnJournal(practice.entries.toReversed());
    expect(replay.attempts).toEqual([one, two]);
    expect(two.effectiveAt).toBe(one.at);
    expect(replay.progress.subtraction.get(two.skill)?.supporting).toEqual([]);
    expect(replay.sessions).toEqual(practice.sessions);
    expect(replay.progress).toEqual(practice.progress);
    expect(replay.seen).toEqual(practice.seen);
    expect(() => replayColumnJournal([practice.entries[0], { ...practice.entries[0], sequence: 2, sessionId: "another" }])).toThrow();
    expect(() => replayColumnJournal([practice.entries[0], ...practice.entries.slice(2)])).toThrow();
    expect(() => replayColumnJournal([...practice.entries, practice.entries[0]])).toThrow();
    expect(() => replayColumnJournal([{ ...practice.entries[0], policyVersion: 2 }])).toThrow();
    expect(() => replayColumnJournal([{ ...practice.entries[0], timeZone: "Not/AZone" }])).toThrow();
  });
});
