import { db } from "./db";
import { diagnosticRepository } from "./diagnosticRepository";
import { practiceAnalytics } from "../engine/learning/analytics";
import { diagnosticStatistics } from "../engine/sessions/statistics";
import type { Attempt } from "../engine/sessions/diagnostic";
import type { LearningSession } from "../engine/learning/session";
import {
  observedAttempt, observationWindow, recentObservations, replayPairEvidence,
} from "../engine/learning/knowledge";
import type { PairProgress } from "../engine/learning/progress";
import { getFact } from "../engine/multiplication/facts";

async function readPolicies(sessionIds: string[]) {
  const sessions = await db.sessions.bulkGet([...new Set(sessionIds)]);
  return new Map(sessions.flatMap((s) => s && s.mode !== "diagnostic"
    ? [[s.id, s.policy] as const] : []));
}

async function orderedPairAttempts(pair: string) {
  const attempts = await db.attempts.where("canonicalId").equals(pair).toArray();
  const journal = await db.journal.bulkGet(attempts.map((a) => a.id));
  const position = new Map(journal.map((entry) => [entry!.id, entry!.sequence]));
  return attempts.sort((a, b) => position.get(a.id)! - position.get(b.id)!);
}

export function readOverview() {
  return db.transaction("r", db.sessions, db.progress, db.rewards, db.attempts, db.journal, async () => {
    const sessions = await db.sessions.where("mode").anyOf("adaptive", "weak").toArray() as LearningSession[];
    const pending = sessions.filter((s) => s.completedAt === null).sort((a, b) => b.startedAt - a.startedAt);
    const latest = sessions.filter((s) => s.completedAt !== null)
      .sort((a, b) => b.completedAt! - a.completedAt! || b.sequence - a.sequence)[0];
    const progress = await db.progress.toArray();
    let stars = 0;
    const rewardedRetention = new Set<string>();
    await db.rewards.each((reward) => {
      stars += reward.stars;
      if (reward.kind === "retention") rewardedRetention.add(reward.id.split(":").slice(1, -1).join(":"));
    });
    const policies = new Map(sessions.map((s) => [s.id, s.policy]));
    // Only unresolved legacy proofs need raw history. New checks and regressions record a bounded projection.
    const evidence = await Promise.all(progress.map(async (p): Promise<PairProgress> => {
      if (p.retentionCheck !== undefined || p.masteredAt === null || p.intervalIndex < 1 ||
          !rewardedRetention.has(p.canonicalId)) return p;
      const attempts = await orderedPairAttempts(p.canonicalId);
      return { ...p, retentionCheck: replayPairEvidence(attempts, policies).check };
    }));
    return { pending, latest, progress: evidence, policies, stars, diagnosis: await diagnosticRepository.get() };
  });
}

export function readPracticeAnalytics() {
  return db.transaction("r", db.attempts, db.sessions, async () => {
    const modes = ["adaptive", "weak"];
    const attempts = await db.attempts.where("mode").anyOf(modes).toArray();
    const sessions = await db.sessions.where("mode").anyOf(modes).toArray();
    return practiceAnalytics(attempts, sessions);
  });
}

export function readDirections() {
  return db.transaction("r", db.attempts, db.journal, db.progress, async () => {
    const entries = await db.journal.orderBy("sequence").primaryKeys();
    const attempts = await db.attempts.bulkGet(entries);
    return {
      attempts: attempts.filter((a): a is Attempt => a !== undefined),
      progress: await db.progress.toArray(),
    };
  });
}

export function readDiagnosis() {
  return db.transaction("r", db.sessions, db.attempts, async () => ({
    session: await diagnosticRepository.get(),
    stats: diagnosticStatistics(await diagnosticRepository.attempts()),
  }));
}

export function readPairDetail(pair: string) {
  return db.transaction("r", db.attempts, db.journal, db.progress, db.sessions, async () => {
    const attempts = await orderedPairAttempts(pair);
    const policies = await readPolicies(attempts.map((a) => a.sessionId));
    return { attempts, policies, progress: await db.progress.get(pair) };
  });
}

export function readWeakSpots() {
  return db.transaction("r", db.attempts, db.progress, db.sessions, async () => {
    const progress = await db.progress.toArray();
    const baseline = await diagnosticRepository.attempts();
    const policies = await readPolicies(progress.flatMap((p) => p.recent.map((row) => row.sessionId)));
    const trained = new Set(progress.map((p) => p.canonicalId));
    const baselineGroups = new Map<string, Attempt[]>();
    for (const attempt of baseline) {
      if (trained.has(attempt.canonicalId)) continue;
      const group = baselineGroups.get(attempt.canonicalId);
      if (group) group.push(attempt);
      else baselineGroups.set(attempt.canonicalId, [attempt]);
    }
    return [
      ...progress.map((p) => ({
        ...getFact(p.canonicalId),
        ...recentObservations(p.recent.slice(-observationWindow).map((row) => ({
          ...row, fastMs: policies.get(row.sessionId)!.fastMs,
        }))),
        diagnosticOnly: false,
      })),
      ...[...baselineGroups].map(([id, attempts]) => ({
        ...getFact(id),
        ...recentObservations(attempts.map((row) => observedAttempt(row, policies))),
        diagnosticOnly: true,
      })),
    ].filter((pair) => pair.wrong || pair.slow)
      .sort((a, b) => Number(b.recurring) - Number(a.recurring) ||
        b.wrong - a.wrong || b.slow - a.slow ||
        (b.medianCorrectMs ?? 0) - (a.medianCorrectMs ?? 0));
  });
}

export function readSessionAttempts(id: string) {
  return db.attempts.where("sessionId").equals(id).sortBy("ordinal");
}

export function readHistory(mode: string) {
  return db.sessions.orderBy("startedAt").reverse().filter((s) => !mode || s.mode === mode).toArray();
}

