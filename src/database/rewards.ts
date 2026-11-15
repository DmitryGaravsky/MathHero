import type { MathHeroDB } from "./db";
import type { Attempt } from "../engine/sessions/diagnostic";
import type { LearningSession } from "../engine/learning/session";
import {
  calendarDay,
  masteryEvidence,
  type PairProgress,
} from "../engine/learning/progress";
import {
  achievementIds,
  type Reward,
  type AchievementId,
} from "../engine/learning/rewards";
import { getFact } from "../engine/multiplication/facts";

async function award(database: MathHeroDB, reward: Reward) {
  if (!(await database.rewards.get(reward.id)))
    await database.rewards.add(reward);
}
export async function recordCompletion(
  database: MathHeroDB,
  session: LearningSession,
) {
  if (session.completedAt !== null && session.cursor > 0)
    await award(database, {
      id: `completion:${session.id}`,
      kind: "completion",
      stars: 2,
      at: session.completedAt,
      sessionId: session.id,
    });
}
/** Incremental writes inside the answer transaction; work is bounded by 78 progress records. */
export async function recordRewards(
  database: MathHeroDB,
  attempt: Attempt,
  session: LearningSession,
  previous: PairProgress | undefined,
  progress: PairProgress,
) {
  const last = await database.journal.orderBy("sequence").last();
  await database.journal.add({
    id: attempt.id,
    sequence: (last?.sequence ?? 0) + 1,
  });
  const state = (await database.rewardState.get("totals")) ?? {
    id: "totals" as const,
    correct: 0,
    days: [],
  };
  state.correct += Number(attempt.correct);
  state.days = [
    ...new Set([
      ...state.days,
      calendarDay(attempt.createdAt, session.policy.timeZone),
    ]),
  ].sort();
  await database.rewardState.put(state);
  const event = { at: attempt.createdAt, sessionId: session.id };
  if (attempt.correct) {
    await award(database, {
      ...event,
      id: `correct:${attempt.id}`,
      kind: "correct",
      stars: 1,
    });
    // Session order bounds this scan to at most 24 answers, independent of lifetime history.
    const own = await database.attempts
      .where("sessionId")
      .equals(session.id)
      .sortBy("ordinal");
    let streak = 0;
    for (const a of own.reverse()) {
      if (!a.correct) break;
      streak++;
    }
    if (streak % 5 === 0)
      await award(database, {
        ...event,
        id: `streak:${attempt.id}`,
        kind: "streak",
        stars: 1,
      });
  }
  if (progress.masteredAt !== null) {
    await award(database, {
      ...event,
      id: `mastery:${attempt.canonicalId}`,
      kind: "mastery",
      stars: 3,
    });
    if (
      previous?.masteredAt != null &&
      attempt.createdAt >= previous.nextReviewAt &&
      attempt.correct &&
      attempt.responseTimeMs <= session.policy.fastMs &&
      calendarDay(previous.lastAttemptAt, session.policy.timeZone) !==
        calendarDay(attempt.createdAt, session.policy.timeZone)
    ) {
      await award(database, {
        ...event,
        id: `retention:${attempt.canonicalId}:${previous.nextReviewAt}`,
        kind: "retention",
        stars: 5,
      });
    }
  }
  const mastered = (await database.progress.toArray()).filter(
    (p) => masteryEvidence(p, attempt.createdAt, session.policy).mastered,
  );
  const directions = mastered.reduce(
    (n, p) =>
      n +
      (getFact(p.canonicalId).operands[0] === getFact(p.canonicalId).operands[1]
        ? 1
        : 2),
    0,
  );
  const unlocked: Record<AchievementId, boolean> = {
    first10: state.correct >= 10,
    master25: directions >= 25,
    master50: directions >= 50,
    master100: directions >= 100,
    week: state.days.length >= 7,
    all: directions === 144,
  };
  for (const achievement of achievementIds)
    if (unlocked[achievement])
      await award(database, {
        ...event,
        id: `achievement:${achievement}`,
        kind: "achievement",
        stars: 0,
        achievement,
      });
  await recordCompletion(database, session);
}
