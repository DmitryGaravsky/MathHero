import { useApp } from "../../app/AppContext";
import { useMetricFormat } from "../../app/useMetricFormat";
import type { statistics } from "../../engine/learning/analytics";

export function ParentMetrics({ stats }: { stats: ReturnType<typeof statistics> }) {
  const { t } = useApp();
  const { seconds, percent } = useMetricFormat();
  return <dl className="session-metrics">
    <div><dt>{t("accuracy")}</dt><dd>{percent(stats.accuracy)}</dd></div>
    <div><dt>{t("medianSpeed")}</dt><dd>{seconds(stats.medianCorrectMs)}</dd></div>
    <div><dt>{t("meanSpeed")}</dt><dd>{seconds(stats.meanCorrectMs)}</dd></div>
  </dl>;
}
