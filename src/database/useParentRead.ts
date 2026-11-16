import { useEffect, useState } from "react";
import { liveQuery } from "dexie";

type ReadResult<T> = { key: string; data?: T; error: boolean } | undefined;

export function useParentRead<T>(read: () => Promise<T>): ReadResult<T>;
export function useParentRead<T, Key extends string>(read: (key: Key) => Promise<T>, key: Key): ReadResult<T>;
export function useParentRead<T, Key extends string>(read: (key: Key) => Promise<T>, key = "" as Key) {
  const [state, setState] = useState<ReadResult<T>>();
  useEffect(() => {
    const subscription = liveQuery(() => read(key)).subscribe({
      next: (data) => setState({ key, data, error: false }),
      error: () => setState({ key, error: true }),
    });
    return () => subscription.unsubscribe();
  }, [read, key]);
  return state?.key === key ? state : undefined;
}
