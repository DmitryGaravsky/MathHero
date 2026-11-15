import { createContext, useContext } from "react";
import type { Language, MessageKey } from "./i18n";

export interface Preferences {
  language: Language;
  soundEnabled: boolean;
  animationsEnabled: boolean;
  dailyGoalMinutes: number;
}
export const defaultPreferences: Preferences = {
  language: "es",
  soundEnabled: false,
  animationsEnabled: true,
  dailyGoalMinutes: 10,
};
export interface AppContextValue {
  preferences: Preferences;
  setLanguage: (language: Language) => void;
  setDailyGoal: (minutes: number) => void;
  setAnimations: (enabled: boolean) => void;
  t: (key: MessageKey, values?: Record<string, string>) => string;
}
export const AppContext = createContext<AppContextValue | null>(null);
export function useApp() {
  const value = useContext(AppContext);
  if (!value) throw new Error("AppProvider is required");
  return value;
}
