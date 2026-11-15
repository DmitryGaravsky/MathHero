import { useEffect, useState } from "react";
import { liveQuery } from "dexie";
import { diagnosticRepository } from "./diagnosticRepository";
import type { Attempt, DiagnosticSession } from "../engine/sessions/diagnostic";

export function useDiagnosticData() {
  const [data, setData] = useState<{
    session?: DiagnosticSession;
    attempts: Attempt[];
    loading: boolean;
    error: boolean;
  }>({ attempts: [], loading: true, error: false });
  useEffect(() => {
    const subscription = liveQuery(async () => ({
      session: await diagnosticRepository.get(),
      attempts: await diagnosticRepository.attempts(),
    })).subscribe({
      next: (value) => setData({ ...value, loading: false, error: false }),
      error: () => setData({ attempts: [], loading: false, error: true }),
    });
    return () => subscription.unsubscribe();
  }, []);
  return data;
}
