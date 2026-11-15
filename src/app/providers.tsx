import { useEffect, useState, type ReactNode } from "react";
import { AppContext, defaultPreferences } from "./AppContext";
import { translate } from "./i18n";
import { liveQuery } from "dexie";
import type { Preferences } from "./AppContext";
import { db } from "../database/db";

export function AppProvider({ children }: { children: ReactNode }) {
  const [preferences, setPreferences] = useState(defaultPreferences);
  const [ready, setReady] = useState(false);
  const [storageError, setStorageError] = useState(false);
  useEffect(() => {
    const subscription = liveQuery(() =>
      db.settings.get("preferences"),
    ).subscribe({
      next: (row) => {
        setPreferences(row?.value ?? defaultPreferences);
        setReady(true);
      },
      error: () => {
        setStorageError(true);
        setReady(true);
      },
    });
    return () => subscription.unsubscribe();
  }, []);
  const save = (patch: Partial<Preferences>) => {
    setPreferences((p) => ({ ...p, ...patch }));
    void db
      .transaction("rw", db.settings, async () => {
        const current = await db.settings.get("preferences");
        await db.settings.put({
          id: "preferences",
          value: { ...(current?.value ?? defaultPreferences), ...patch },
        });
      })
      .catch(() => setStorageError(true));
  };
  useEffect(() => {
    document.documentElement.lang = preferences.language;
  }, [preferences.language]);
  return (
    <AppContext.Provider
      value={{
        preferences,
        setLanguage: (language) => save({ language }),
        setAnimations: (animationsEnabled) => save({ animationsEnabled }),
        setDailyGoal: (dailyGoalMinutes) => save({ dailyGoalMinutes }),
        t: (key, values) => translate(preferences.language, key, values),
      }}
    >
      {storageError && (
        <p role="alert">{translate(preferences.language, "storageError")}</p>
      )}
      {ready ? (
        children
      ) : (
        <p role="status">{translate(preferences.language, "loading")}</p>
      )}
    </AppContext.Provider>
  );
}
