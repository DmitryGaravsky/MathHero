import { useApp } from "./AppContext";

export function useMetricFormat() {
  const { t, preferences } = useApp();
  const numbers = new Intl.NumberFormat(preferences.language, { maximumFractionDigits: 1 });
  const percentages = new Intl.NumberFormat(preferences.language, { style: "percent", maximumFractionDigits: 1 });
  return {
    number: (value: number) => numbers.format(value),
    percent: (value: number | null) => value === null ? "—" : percentages.format(value),
    seconds: (value: number | null) => value === null ? "—" : t("seconds", { value: numbers.format(value / 1000) }),
  };
}
