import { useEffect, useState } from "react";
import { liveQuery } from "dexie";
import { db } from "./db";
import { masteryEvidence } from "../engine/learning/progress";
import type { LearningSession } from "../engine/learning/session";

export function useLearningData() {
  const [data, setData] = useState<{
    mastered: number;
    pending: boolean;
    error: boolean;
    latest?: LearningSession;
  }>({
    mastered: 0,
    pending: false,
    error: false,
  });
  useEffect(() => {
    const subscription = liveQuery(async () => {
      const progress = await db.progress.toArray();
      const sessions = (await db.sessions.toArray()).filter(
        (s): s is LearningSession => s.mode !== "diagnostic",
      );
      return {
        mastered: progress.filter(
          (p) => masteryEvidence(p, Date.now()).mastered,
        ).length,
        pending: sessions.some(
          (s) => s.mode === "adaptive" && s.phase !== "completed",
        ),
        latest: sessions
          .filter((s) => s.completedAt !== null)
          .sort(
            (a, b) =>
              b.completedAt! - a.completedAt! || b.sequence - a.sequence,
          )[0],
        error: false,
      };
    }).subscribe({
      next: setData,
      error: () => setData((d) => ({ ...d, error: true })),
    });
    return () => subscription.unsubscribe();
  }, []);
  return data;
}
