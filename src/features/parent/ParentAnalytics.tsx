import { useApp } from "../../app/AppContext";
import { PageHeading } from "../../components/ui/PageHeading";
import { readPracticeAnalytics } from "../../database/parentReadModel";
import { useParentRead } from "../../database/useParentRead";
import { calendarDay, learningPolicy } from "../../engine/learning/progress";
import { ParentMetrics } from "./ParentMetrics";
import { useMetricFormat } from "../../app/useMetricFormat";
import { ParentReadStatus } from "./ParentReadStatus";
import { useParentClock } from "./useProgressView";

export function ParentAnalytics() {
  const { t, preferences } = useApp();
  const query = useParentRead(readPracticeAnalytics);
  const today = calendarDay(useParentClock(), learningPolicy.timeZone);
  const { number, percent, seconds } = useMetricFormat();
  const date = new Intl.DateTimeFormat(preferences.language, { dateStyle: "medium", timeZone: "UTC" });
  const stats = query?.data;
  const max = stats?.daily.reduce((highest, day) => Math.max(highest, day.medianCorrectMs ?? 0), 10_000) ?? 10_000;

  return <>
    <PageHeading title={t("analytics")} description={t("practiceOnly")} />
    {!stats ? <ParentReadStatus error={query?.error} /> : <>
      <section className="card parent-section">
        <h2>{t("practiceTotals")}</h2>
        <ParentMetrics stats={stats} />
        <p>{t("speedHint")}</p>
      </section>
      <section className="card parent-section">
        <h2>{t("dailyTrend")}</h2>
        <p>{t("dailyGoalProgress", {
          minutes: number(Math.floor((stats.daily.find((day) => day.day === today)?.activeMs ?? 0) / 60_000)),
          goal: number(preferences.dailyGoalMinutes),
        })}</p>
        {!stats.daily.length ? <p>{t("notYet")}</p> : <>
          <p>{t("trendHint")}</p>
          <ol className="daily-trend">
            {stats.daily.slice().reverse().map((day) => {
              const label = date.format(new Date(day.day));
              return <li key={day.day}>
                <time dateTime={day.day}>{label}</time>
                <span>{t("learningScore", { correct: number(day.correct), count: number(day.answered) })} · {percent(day.accuracy)}</span>
                <span>{t("meanSpeed")} · {seconds(day.meanCorrectMs)} / {t("medianSpeed")} · {seconds(day.medianCorrectMs)}</span>
                {day.medianCorrectMs !== null && <meter min={0} max={max} value={day.medianCorrectMs}
                  aria-label={`${label} · ${t("medianSpeed")}`} aria-valuetext={seconds(day.medianCorrectMs)} />}
              </li>;
            })}
          </ol>
        </>}
      </section>
    </>}
  </>;
}
