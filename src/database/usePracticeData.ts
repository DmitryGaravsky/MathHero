import { useEffect, useState } from "react";
import { liveQuery } from "dexie";
import { masteryEvidence } from "../engine/learning/progress";
import type { Reward } from "../engine/learning/rewards";
import { db } from "./db";

export function observeSession(id: string) {
  return liveQuery(() => db.sessions.get(id));
}

export function useChildProgress() {
  const [state, setState] = useState<{ mastered: number; pending: boolean }>();
  const [error, setError] = useState(false);
  useEffect(() => {
    const subscription = liveQuery(() => db.transaction("r", db.progress, db.sessions, async () => {
      const now = Date.now();
      const mastered = await db.progress.filter((p) => masteryEvidence(p, now).mastered).count();
      const pending = await db.sessions.where("mode").equals("adaptive")
        .and((session) => session.phase !== "completed").first();
      return { mastered, pending: pending !== undefined };
    })).subscribe({ next: setState, error: () => setError(true) });
    return () => subscription.unsubscribe();
  }, []);
  return { state, error };
}

export function useUnlockedAchievements() {
  const [state, setState] = useState<Reward[]>();
  const [error, setError] = useState(false);
  useEffect(() => {
    const subscription = liveQuery(() => db.rewards.where("kind").equals("achievement").toArray())
      .subscribe({ next: setState, error: () => setError(true) });
    return () => subscription.unsubscribe();
  }, []);
  return { state, error };
}

export function useSessionRewards(id: string) {
  const [state, setState] = useState<{ id: string; rewards: Reward[]; error: boolean }>();
  useEffect(() => {
    const subscription = liveQuery(() => db.rewards.where("sessionId").equals(id).toArray())
      .subscribe({
        next: (rewards) => setState({ id, rewards, error: false }),
        error: () => setState({ id, rewards: [], error: true }),
      });
    return () => subscription.unsubscribe();
  }, [id]);
  return state?.id === id ? state : undefined;
}
