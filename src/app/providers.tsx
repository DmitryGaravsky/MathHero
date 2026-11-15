import { useEffect, useState, type ReactNode } from "react";
import { AppContext, defaultPreferences } from "./AppContext";
import { translate } from "./i18n";
import { db } from "../database/db";

export function AppProvider({ children }: { children: ReactNode }) {
  const [preferences, setPreferences] = useState(defaultPreferences);
  const [ready, setReady] = useState(false);
  const [storageError, setStorageError] = useState(false);
  useEffect(() => {
    let live = true;
    void db.settings
      .get("preferences")
      .then((row) => {
        if (live && row) setPreferences(row.value);
      })
      .catch(() => {
        if (live) setStorageError(true);
      })
      .finally(() => {
        if (live) setReady(true);
      });
    return () => {
      live = false;
    };
  }, []);
  useEffect(() => {
    if (ready)
      void db.settings
        .put({ id: "preferences", value: preferences })
        .catch(() => setStorageError(true));
  }, [preferences, ready]);
  useEffect(() => {
    document.documentElement.lang = preferences.language;
  }, [preferences.language]);
  return (
    <AppContext.Provider
      value={{
        preferences,
        setLanguage: (language) => setPreferences((p) => ({ ...p, language })),
        setAnimations: (animationsEnabled) =>
          setPreferences((p) => ({ ...p, animationsEnabled })),
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
