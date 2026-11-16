import { useEffect, useMemo, useState } from "react";
import { useParentRead } from "../../database/useParentRead";
import { readDirections } from "../../database/parentReadModel";
import { progressMap } from "../../engine/learning/analytics";

export function useParentClock() {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 60_000);
    return () => window.clearInterval(timer);
  }, []);
  return now;
}

export function useProgressView() {
  const query = useParentRead(readDirections);
  const now = useParentClock();
  const view = useMemo(() => query?.data && progressMap(query.data.attempts, query.data.progress, now), [query, now]);
  return { view, error: query?.error };
}
