import { db } from "./db";
import { diagnosticRepository } from "./diagnosticRepository";
import { practiceAnalytics } from "../engine/learning/analytics";
import { diagnosticStatistics } from "../engine/sessions/statistics";
import type { Attempt } from "../engine/sessions/diagnostic";
import type { LearningSession } from "../engine/learning/session";

export function readOverview() {
  return db.transaction("r", db.sessions, db.progress, db.rewards, async () => {
    const sessions = await db.sessions.where("mode").anyOf("adaptive", "weak").toArray() as LearningSession[];
    const pending = sessions.filter((s) => s.completedAt === null).sort((a, b) => b.startedAt - a.startedAt);
    const latest = sessions.filter((s) => s.completedAt !== null)
      .sort((a, b) => b.completedAt! - a.completedAt! || b.sequence - a.sequence)[0];
    const progress = await db.progress.toArray();
    let stars = 0;
    await db.rewards.each((reward) => { stars += reward.stars; });
    return { pending, latest, progress, stars, diagnosis: await diagnosticRepository.get() };
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

export function readPairAttempts(pair: string) {
  return db.transaction("r", db.attempts, db.journal, async () => {
    const attempts = await db.attempts.where("canonicalId").equals(pair).toArray();
    const journal = await db.journal.bulkGet(attempts.map((a) => a.id));
    const position = new Map(journal.map((entry) => [entry?.id, entry?.sequence ?? 0]));
    return attempts.sort((a, b) => (position.get(a.id) ?? 0) - (position.get(b.id) ?? 0));
  });
}

export function readSessionAttempts(id: string) {
  return db.attempts.where("sessionId").equals(id).sortBy("ordinal");
}

export function readHistory(mode: string) {
  return db.sessions.orderBy("startedAt").reverse().filter((s) => !mode || s.mode === mode).toArray();
}

