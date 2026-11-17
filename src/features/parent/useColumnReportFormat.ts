import { useApp } from "../../app/AppContext";
import { useMetricFormat } from "../../app/useMetricFormat";

export function useColumnReportFormat() {
  const { preferences: { language } } = useApp();
  const dayFormat = new Intl.DateTimeFormat(language, { dateStyle: "medium", timeZone: "UTC" });
  const listFormat = new Intl.ListFormat(language);
  const day = (value: string) => dayFormat.format(new Date(value));
  return {
    ...useMetricFormat(),
    day,
    dates: (days: string[]) => listFormat.format(days.map(day)),
    list: (values: string[]) => listFormat.format(values),
  };
}
