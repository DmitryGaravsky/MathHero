import { useEffect, useState, type ReactNode } from "react";
import { AppContext } from "./AppContext";
import { translate } from "./i18n";
import { defaultPreferences, type Preferences } from "../settings/preferences";
import { settingsRepository } from "../database/settingsRepository";

export function AppProvider({ children }: { children: ReactNode }) {
  const [preferences, setPreferences] = useState(defaultPreferences);
  const [ready, setReady] = useState(false);
  const [storageError, setStorageError] = useState(false);
  useEffect(() => {
    return settingsRepository.subscribe(
      (value) => {
        setPreferences(value);
        setReady(true);
      },
      () => {
        setStorageError(true);
        setReady(true);
      },
    );
  }, []);
  const save = (patch: Partial<Preferences>) => {
    void settingsRepository.patch(patch).then(
      () => setStorageError(false),
      () => setStorageError(true),
    );
  };
  useEffect(() => {
    document.documentElement.lang = preferences.language;
  }, [preferences.language]);
  return (
    <AppContext.Provider
      value={{
        preferences,
        savePreferences: save,
        t: (key, values) => translate(preferences.language, key, values),
      }}
    >
      {storageError && (
        <p role="alert">{translate(preferences.language, "settingsStorageError")}</p>
      )}
      {ready ? (
        children
      ) : (
        <p role="status">{translate(preferences.language, "loading")}</p>
      )}
    </AppContext.Provider>
  );
}
