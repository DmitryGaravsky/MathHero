import type { RandomSource } from "../core/Exercise";
import {
  getFact,
  multiplicationFacts,
  randomIndex,
} from "../multiplication/facts";
import type { Attempt } from "../sessions/diagnostic";
import {
  difficulty,
  learningPolicy,
  type PairProgress,
  type LearningPolicy,
} from "./progress";

export interface Repeat {
  canonicalId: string;
  due: number;
  reason: "error" | "first-success";
}
export interface SchedulerContext {
  mode: "adaptive" | "weak";
  targetPair?: string;
  history: string[]; // Answered directions; excludes the current open question.
  repeats: Repeat[];
  total: number;
  policy?: LearningPolicy;
}
const pairs = multiplicationFacts.filter((f) => f.id === f.canonicalId);
export function sessionStage(ordinal: number, total = 24) {
  return ordinal < 4 ? "warmup" : ordinal >= total - 4 ? "challenge" : "main";
}
export function priority(
  progress: PairProgress | undefined,
  baseline: readonly Attempt[],
  now: number,
  policy = learningPolicy,
) {
  const state = difficulty(progress, baseline, now, policy);
  if (state === "error") return 14;
  if (progress && progress.nextReviewAt <= now) return 10;
  return { unknown: 6, slow: 8, developing: 3, fluent: 1, mastered: 0.25 }[
    state
  ];
}
export function selectNext(
  context: SchedulerContext,
  progress: readonly PairProgress[],
  diagnostics: readonly Attempt[],
  now: number,
  random: RandomSource,
): string {
  const policy = context.policy ?? learningPolicy;
  const index = context.history.length;
  const recentPairs = context.history.map((id) => getFact(id).canonicalId);
  const underQuota = (id: string) =>
    recentPairs.filter((pair) => pair === id).length < 4;
  const byPair = new Map(progress.map((p) => [p.canonicalId, p]));
  const baseline = diagnostics.filter((a) => a.mode === "diagnostic");
  const baselineFor = (id: string) =>
    baseline.filter((a) => a.canonicalId === id);
  // Fixed error offset avoids collisions between consecutive errors: two intervening tasks.
  const repeat = context.repeats
    .filter(
      (r) =>
        underQuota(r.canonicalId) &&
        r.due <= index &&
        index - recentPairs.lastIndexOf(r.canonicalId) >=
          (r.reason === "error" ? 3 : 4),
    )
    .sort(
      (a, b) =>
        Number(b.reason === "error") - Number(a.reason === "error") ||
        a.due - b.due,
    )[0];
  let chosen: string;
  if (context.targetPair && index === 0)
    chosen = getFact(context.targetPair).canonicalId;
  else if (repeat) chosen = repeat.canonicalId;
  else {
    let candidates = pairs.filter(
      (f) => !recentPairs.slice(-3).includes(f.canonicalId),
    );
    const varied = candidates.filter((f) => underQuota(f.id));
    if (varied.length) candidates = varied;
    const lastTables = context.history
      .slice(-2)
      .map((id) => getFact(id).operands[0]);
    if (lastTables.length === 2 && lastTables[0] === lastTables[1])
      candidates = candidates.filter(
        (f) => !f.operands.includes(lastTables[0]!),
      );
    // At most two optional mastered checks per session; overdue reviews remain eligible.
    const masteredChecks = recentPairs.filter(
      (id) =>
        difficulty(byPair.get(id), baselineFor(id), now, policy) === "mastered",
    ).length;
    const limited = candidates.filter((f) => {
      const p = byPair.get(f.id);
      return (
        masteredChecks < 2 ||
        !p ||
        p.nextReviewAt <= now ||
        difficulty(p, [], now, policy) !== "mastered"
      );
    });
    if (limited.length) candidates = limited;
    const stage = sessionStage(index, context.total);
    if (
      stage === "warmup" &&
      context.mode === "adaptive" &&
      !context.targetPair
    ) {
      const familiar = candidates.filter((f) =>
        ["fluent", "mastered"].includes(
          difficulty(byPair.get(f.id), baselineFor(f.id), now, policy),
        ),
      );
      if (familiar.length) candidates = familiar;
    }
    const weights = candidates.map((f) => {
      const p = byPair.get(f.id);
      const state = difficulty(p, baselineFor(f.id), now, policy);
      let weight = priority(p, baselineFor(f.id), now, policy);
      if (context.targetPair === f.id) weight *= 20;
      if (
        (context.mode === "weak" || stage === "challenge") &&
        (state === "error" || state === "slow")
      )
        weight *= 4;
      if (
        stage === "warmup" &&
        context.mode === "adaptive" &&
        state === "fluent"
      )
        weight *= 12;
      // Old / unvisited pairs get a modest boost without defeating error priority.
      if (!recentPairs.includes(f.id)) weight *= 1.5;
      return weight;
    });
    // randomIndex validates the injected source, including for weighted draws.
    const draw = randomIndex(1_000_000, random) / 1_000_000;
    let remaining = draw * weights.reduce((a, b) => a + b, 0);
    chosen = candidates.at(-1)!.id;
    for (let i = 0; i < candidates.length; i++) {
      remaining -= weights[i]!;
      if (remaining < 0) {
        chosen = candidates[i]!.id;
        break;
      }
    }
  }
  const directions = multiplicationFacts.filter(
    (f) => f.canonicalId === chosen,
  );
  // Prefer the least exposed direction across baseline and learning; seeded random on ties.
  const counts = directions.map((f) => ({
    id: f.id,
    count:
      (byPair.get(chosen)?.directions[f.id]?.attempts ?? 0) +
      baseline.filter((a) => a.exerciseId === f.id).length,
  }));
  const min = Math.min(...counts.map((c) => c.count));
  const eligible = counts.filter((c) => c.count === min);
  return eligible[randomIndex(eligible.length, random)]!.id;
}
export function updateRepeats(
  repeats: Repeat[],
  attempt: Attempt,
  pairAttempts: number,
): Repeat[] {
  const pending = repeats.filter((r) => r.canonicalId !== attempt.canonicalId);
  if (!attempt.correct || pairAttempts === 1)
    pending.push({
      canonicalId: attempt.canonicalId,
      due: attempt.ordinal + (attempt.correct ? 5 : 3),
      reason: attempt.correct ? "first-success" : "error",
    });
  return pending;
}
export { learningPolicy };
