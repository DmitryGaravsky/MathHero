import { useEffect, useState } from "react";
import { liveQuery } from "dexie";
import { db } from "./db";
import type { Attempt } from "../engine/sessions/diagnostic";
import type { Session } from "../engine/learning/session";
import type { PairProgress } from "../engine/learning/progress";
import type { Reward } from "../engine/learning/rewards";
import { analytics } from "../engine/learning/analytics";

export function useProgressData() {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 60000);
    return () => clearInterval(timer);
  }, []);
  const [data, setData] = useState<{
    attempts: Attempt[];
    sessions: Session[];
    progress: PairProgress[];
    rewards: Reward[];
    loading: boolean;
    error: boolean;
  }>({
    attempts: [],
    sessions: [],
    progress: [],
    rewards: [],
    loading: true,
    error: false,
  });
  useEffect(() => {
    const subscription = liveQuery(() =>
      db.transaction("r", db.tables, async () => {
        const attempts = await db.attempts.toArray();
        const byId = new Map(attempts.map((a) => [a.id, a]));
        const journal = await db.journal.orderBy("sequence").toArray();
        return {
          attempts: journal.map((e) => byId.get(e.id)!),
          sessions: await db.sessions.toArray(),
          progress: await db.progress.toArray(),
          rewards: await db.rewards.toArray(),
          loading: false,
          error: false,
        };
      }),
    ).subscribe({
      next: setData,
      error: () => setData((d) => ({ ...d, loading: false, error: true })),
    });
    return () => subscription.unsubscribe();
  }, []);
  return {
    ...data,
    now,
    stats: analytics(data.attempts, data.sessions, data.progress, now),
    stars: data.rewards.reduce((n, r) => n + r.stars, 0),
  };
}
