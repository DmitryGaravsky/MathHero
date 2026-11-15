import { useEffect, useState, type ReactNode } from "react";
import { AppContext, defaultPreferences } from "./AppContext";
import { translate } from "./i18n";

export function AppProvider({ children }: { children: ReactNode }) {
  const [preferences, setPreferences] = useState(defaultPreferences);
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
      {children}
    </AppContext.Provider>
  );
}
