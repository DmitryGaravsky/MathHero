import { useEffect, useLayoutEffect, useState, type ReactNode } from "react";
import { AppContext } from "./AppContext";
import { translate } from "./i18n";
import { defaultPreferences, type Preferences } from "../settings/preferences";
import { settingsRepository } from "../database/settingsRepository";

function useTheme(theme: Preferences["theme"]) {
  useLayoutEffect(() => {
    const system = window.matchMedia("(prefers-color-scheme: dark)");
    const root = document.documentElement;
    const meta = document.querySelector('meta[name="theme-color"]');
    function apply() {
      root.dataset.color = theme === "system" ? (system.matches ? "dark" : "light") : theme;
      meta?.setAttribute("content", getComputedStyle(root).getPropertyValue("--canvas").trim());
    }
    apply();
    if (theme !== "system") return;
    system.addEventListener("change", apply);
    return () => system.removeEventListener("change", apply);
  }, [theme]);
}

export function AppProvider({ children }: { children: ReactNode }) {
  const [preferences, setPreferences] = useState(defaultPreferences);
  const [ready, setReady] = useState(false);
  const [storageError, setStorageError] = useState(false);
  useTheme(preferences.theme);
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
