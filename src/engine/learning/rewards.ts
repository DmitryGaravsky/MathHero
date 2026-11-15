import { getFact } from "../multiplication/facts";
import type { Attempt } from "../sessions/diagnostic";
import { answerLearning, type LearningSession, type Session } from "./session";
import { calendarDay, masteryEvidence, type PairProgress } from "./progress";

export interface RewardState {
  id: "totals";
  correct: number;
  days: string[];
}
export interface JournalEntry {
  id: string;
  sequence: number;
}
export const achievementIds = [
  "first10",
  "master25",
  "master50",
  "master100",
  "week",
  "all",
] as const;
export type AchievementId = (typeof achievementIds)[number];
export interface Reward {
  id: string;
  kind:
    | "correct"
    | "streak"
    | "completion"
    | "mastery"
    | "retention"
    | "achievement";
  stars: number;
  at: number;
  sessionId: string;
  achievement?: AchievementId;
}

/** Replay is shared by migration, ledger writes and backup verification. Diagnosis earns no rewards. */
export function replayLearning(
  sessions: readonly Session[],
  attempts: readonly Attempt[],
  journal: readonly JournalEntry[],
) {
  const bySession = new Map(sessions.map((s) => [s.id, s]));
  const byAttempt = new Map(attempts.map((a) => [a.id, a]));
  const progress = new Map<string, PairProgress>();
  const summaries = new Map<string, LearningSession>();
  const rewards = new Map<string, Reward>();
  const streaks = new Map<string, number>();
  const days = new Set<string>();
  let correct = 0;
  const award = (reward: Reward) => {
    if (!rewards.has(reward.id)) rewards.set(reward.id, reward);
  };
  for (const entry of [...journal].sort((a, b) => a.sequence - b.sequence)) {
    const a = byAttempt.get(entry.id)!;
    const saved = bySession.get(a.sessionId)!;
    if (saved.mode === "diagnostic") continue;
    const previous = progress.get(a.canonicalId);
    const running = summaries.get(saved.id);
    const base: LearningSession = {
      ...saved,
      cursor: a.ordinal,
      phase: "question",
      completedAt: null,
      endReason: null,
      summary: running?.summary ?? {
        answered: 0,
        correct: 0,
        correctTimes: [],
        improvedPairs: [],
        masteredPairs: [],
      },
      repeats: running?.repeats ?? [],
    };
    const result = answerLearning(base, a.answer, a.responseTimeMs, previous, {
      now: () => a.createdAt,
    });
    progress.set(a.canonicalId, result.progress);
    summaries.set(saved.id, result.session);
    const streak = a.correct ? (streaks.get(saved.id) ?? 0) + 1 : 0;
    streaks.set(saved.id, streak);
    days.add(calendarDay(a.createdAt, saved.policy.timeZone));
    const event = { at: a.createdAt, sessionId: saved.id };
    if (a.correct) {
      correct++;
      award({ ...event, id: `correct:${a.id}`, kind: "correct", stars: 1 });
      if (streak % 5 === 0)
        award({ ...event, id: `streak:${a.id}`, kind: "streak", stars: 1 });
    }
    if (result.progress.masteredAt !== null) {
      award({
        ...event,
        id: `mastery:${a.canonicalId}`,
        kind: "mastery",
        stars: 3,
      });
      // Only an established, still-mastered pair successfully recalled when its review is due.
      // The previous due timestamp identifies the review cycle across reload and restore.
      if (
        previous?.masteredAt != null &&
        a.createdAt >= previous.nextReviewAt &&
        a.correct &&
        a.responseTimeMs <= saved.policy.fastMs &&
        calendarDay(previous.lastAttemptAt, saved.policy.timeZone) !==
          calendarDay(a.createdAt, saved.policy.timeZone)
      ) {
        award({
          ...event,
          id: `retention:${a.canonicalId}:${previous.nextReviewAt}`,
          kind: "retention",
          stars: 5,
        });
      }
    }
    const mastered = [...progress.values()].filter(
      (p) => masteryEvidence(p, a.createdAt, saved.policy).mastered,
    );
    const directions = mastered.reduce(
      (n, p) =>
        n +
        (getFact(p.canonicalId).operands[0] ===
        getFact(p.canonicalId).operands[1]
          ? 1
          : 2),
      0,
    );
    const unlocked: Record<AchievementId, boolean> = {
      first10: correct >= 10,
      master25: directions >= 25,
      master50: directions >= 50,
      master100: directions >= 100,
      week: days.size >= 7,
      all: directions === 144,
    };
    for (const achievement of achievementIds)
      if (unlocked[achievement]) {
        award({
          ...event,
          id: `achievement:${achievement}`,
          kind: "achievement",
          stars: 0,
          achievement,
        });
      }
  }
  for (const session of sessions)
    if (
      session.mode !== "diagnostic" &&
      session.completedAt !== null &&
      session.cursor > 0
    ) {
      award({
        id: `completion:${session.id}`,
        kind: "completion",
        stars: 2,
        at: session.completedAt,
        sessionId: session.id,
      });
    }
  return {
    progress: [...progress.values()],
    rewards: [...rewards.values()],
    summaries,
    state: { id: "totals" as const, correct, days: [...days].sort() },
  };
}
