export type Language = "es" | "ru";
export const themePreferences = ["system", "light", "dark"] as const;
export type ThemePreference = (typeof themePreferences)[number];
export const dailyGoals = [5, 10, 15] as const;
type DailyGoal = (typeof dailyGoals)[number];

export interface Preferences {
  language: Language;
  soundEnabled: false;
  animationsEnabled: boolean;
  dailyGoalMinutes: DailyGoal;
  theme: ThemePreference;
}

export type StoredPreferences = Omit<Preferences, "theme"> &
  Partial<Pick<Preferences, "theme">>;

export const defaultPreferences: Readonly<Preferences> = {
  language: "es",
  soundEnabled: false,
  animationsEnabled: true,
  dailyGoalMinutes: 10,
  theme: "system",
};

function isChoice<T>(choices: readonly T[], value: unknown): value is T {
  return choices.some((choice) => choice === value);
}

const validators = {
  language: (value: unknown) => value === "es" || value === "ru",
  soundEnabled: (value: unknown) => value === false,
  animationsEnabled: (value: unknown) => typeof value === "boolean",
  dailyGoalMinutes: (value: unknown) => isChoice(dailyGoals, value),
  theme: (value: unknown) => isChoice(themePreferences, value),
} satisfies Record<keyof Preferences, (value: unknown) => boolean>;

function validFields(value: unknown, keys: string[]): value is Partial<Preferences> {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;
  const fields = Object.entries(value);
  return fields.length === keys.length && fields.every(([key, field]) =>
    keys.includes(key) && Object.hasOwn(validators, key) &&
    validators[key as keyof Preferences](field),
  );
}

export function validatePreferences(value: unknown, legacy: boolean): StoredPreferences {
  const keys = Object.keys(validators).filter((key) => !legacy || key !== "theme");
  if (!validFields(value, keys)) throw new Error("Invalid preferences");
  return value as StoredPreferences;
}

export function readPreferences(value?: StoredPreferences): Preferences {
  if (!value) return { ...defaultPreferences };
  return { ...defaultPreferences, ...validatePreferences(value, !Object.hasOwn(value, "theme")) };
}

export function patchPreferences(current: Preferences, patch: Partial<Preferences>): Preferences {
  if (!validFields(patch, Object.keys(patch))) throw new Error("Invalid preferences patch");
  return { ...current, ...patch };
}
