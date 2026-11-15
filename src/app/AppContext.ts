import { createContext, useContext } from "react";
import type { MessageKey } from "./i18n";
import type { Preferences } from "../settings/preferences";

export interface AppContextValue {
  preferences: Preferences;
  savePreferences: (patch: Partial<Preferences>) => void;
  t: (key: MessageKey, values?: Record<string, string>) => string;
}
export const AppContext = createContext<AppContextValue | null>(null);
export function useApp() {
  const value = useContext(AppContext);
  if (!value) throw new Error("AppProvider is required");
  return value;
}
