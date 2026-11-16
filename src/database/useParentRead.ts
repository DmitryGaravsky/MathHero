import { useEffect, useState } from "react";
import { liveQuery } from "dexie";

export function useParentRead<T>(read: (key: string) => Promise<T>, key = "") {
  const [state, setState] = useState<{ key: string; data?: T; error: boolean }>();
  useEffect(() => {
    const subscription = liveQuery(() => read(key)).subscribe({
      next: (data) => setState({ key, data, error: false }),
      error: () => setState({ key, error: true }),
    });
    return () => subscription.unsubscribe();
  }, [read, key]);
  return state?.key === key ? state : undefined;
}
