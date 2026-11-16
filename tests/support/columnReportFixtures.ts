import type { FullBackup } from "../../src/database/backup";
import { columnWork, type ColumnOperation, type ColumnSkill } from "../../src/engine/column/arithmetic";
import { columnInput, type ColumnInput } from "../../src/engine/column/draft";
import { replayColumnJournal } from "../../src/engine/column/replay";
import { checkpointColumnDraft, type ColumnAction, type ColumnJournalEntry } from "../../src/engine/column/session";
import { legacyLearningPolicy } from "../../src/engine/learning/progress";
import { replayLearning } from "../../src/engine/learning/rewards";
import { answerLearning, createLearning } from "../../src/engine/learning/session";
import { getFact } from "../../src/engine/multiplication/facts";

export const reportDate = Date.UTC(2026, 9, 1, 12);
export const reportHour = 3_600_000;
const day = 24 * reportHour;

class ReportPractice {
  private journal: ColumnJournalEntry[] = [];
  private replay = replayColumnJournal([]);
  at = reportDate;

  session(id: string) { return this.replay.sessions.get(id)!; }

  event(id: string, action: ColumnAction) {
    this.journal.push({ ...action, sessionId: id, sequence: this.journal.length + 1, at: this.at });
    this.replay = replayColumnJournal(this.journal);
  }

  start(id: string, operation: ColumnOperation, seed = 42) {
    this.event(id, { type: "start", operation, policyVersion: 1, timeZone: "Europe/Paris", seed });
  }

  capture(id: string, type: "finish" | "hint" | "skip", elapsed?: number) {
    const { activeMs, draft } = this.session(id);
    this.event(id, { type, input: columnInput(draft!), activeMs: elapsed ?? activeMs });
  }

  check(id: string, activeMs: number, wrong = false, mark = false) {
    const expected = columnWork(this.session(id).order.at(-1)!.exercise).answer;
    const digits = [...String(wrong ? (expected + 1) % 1000 : expected)].reverse().map(Number);
    this.event(id, { type: "check", activeMs, input: {
      digits: [digits[0]!, digits[1] ?? null, digits[2] ?? null, digits[3] ?? null],
      marks: [false, mark, false, false], activePlace: 2,
    } });
  }

  seek(id: string, skill: ColumnSkill) {
    while (!this.session(id).end && this.session(id).order.at(-1)?.skill !== skill) this.capture(id, "skip");
    if (this.session(id).end) throw new Error("Missing proof-fixture skill");
  }

  checkpoint(id: string, input: ColumnInput, activeMs: number) {
    this.replay.sessions.set(id, checkpointColumnDraft(this.session(id), input, activeMs));
  }

  backup() {
    const clock = { now: () => reportDate - day };
    const legacy = createLearning("learning:published-multiplication", "adaptive", [], [], clock,
      { next: () => 0.42 }, undefined, legacyLearningPolicy);
    const correct = getFact(legacy.order[0]!).expectedAnswer;
    const { attempt, session } = answerLearning({ ...legacy, sequence: 1 }, correct, 3200, undefined, clock);
    const sessions = [{ ...session, phase: "completed", endReason: "early", completedAt: clock.now() }] as const;
    const journal = [{ id: attempt.id, sequence: 1 }];
    const learning = replayLearning([...sessions], [attempt], journal);
    const table: FullBackup = {
      format: "math-hero-backup", version: 3, databaseVersion: 5, exportedAt: reportDate + 14 * day,
      tables: {
        sessions: [...sessions], attempts: [attempt], settings: [], journal,
        progress: learning.progress, rewards: learning.rewards, rewardState: [learning.state],
        columnJournal: this.journal, columnSessions: [...this.replay.sessions.values()],
        columnAttempts: this.replay.attempts,
        columnProgress: [...this.replay.progress.addition.values(), ...this.replay.progress.subtraction.values()],
      },
    };
    return table;
  }
}

export function mixedColumnReportBackup() {
  const practice = new ReportPractice();
  const id = "addition-mixed";
  practice.start(id, "addition");
  practice.check(id, 900, true);
  practice.capture(id, "hint");
  practice.event(id, { type: "retry" });
  practice.check(id, 2300);
  practice.event(id, { type: "advance" });
  practice.capture(id, "hint", 420);
  practice.check(id, 1300);
  practice.event(id, { type: "advance" });
  practice.check(id, 700, true);
  practice.capture(id, "hint");
  practice.capture(id, "hint");
  practice.capture(id, "skip");
  practice.capture(id, "skip", 550);
  practice.check(id, 1800, false, true);
  practice.event(id, { type: "advance" });
  practice.check(id, 800, true);
  practice.capture(id, "hint");
  practice.capture(id, "finish");

  practice.start("subtraction-early", "subtraction");
  practice.check("subtraction-early", 3250, false, true);
  practice.event("subtraction-early", { type: "advance" });
  practice.check("subtraction-early", 1250);
  practice.capture("subtraction-early", "finish");
  practice.at -= reportHour;
  practice.start("subtraction-open", "subtraction");
  practice.checkpoint("subtraction-open", {
    digits: [7, 1, null, null], marks: [false, true, true, false], activePlace: 2,
  }, 1600);
  return practice.backup();
}

export function columnProofBackup({ regress = true } = {}) {
  const practice = new ReportPractice();
  const skill = "no-carry";
  const solve = (id: string, hours: number, outcome: "independent" | "helped" | "miss" = "independent") => {
    practice.at = reportDate + hours * reportHour;
    practice.start(id, "addition");
    practice.seek(id, skill);
    if (outcome !== "independent") practice.capture(id, "hint", 200);
    practice.check(id, 1700, outcome === "miss");
    practice.capture(id, "finish");
  };
  solve("support-one", 0);
  solve("same-day", 1);
  solve("support-two", 14);
  solve("too-soon", 30);
  solve("helped-review", 54, "helped");
  solve("verified", 79);
  if (regress) {
    solve("too-soon-after-verification", 150);
    solve("regression", 222, "miss");
    solve("repeated-miss", 222, "miss");
  }
  return practice.backup();
}

export function paginatedColumnBackup() {
  const practice = new ReportPractice();
  for (let i = 0; i < 10; i++) {
    practice.at = reportDate - i * reportHour;
    practice.start(`addition-${i}`, "addition");
    practice.capture(`addition-${i}`, "finish");
  }
  practice.start("subtraction", "subtraction");
  return practice.backup();
}
