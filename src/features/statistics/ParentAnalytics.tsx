import { useApp } from "../../app/AppContext";
import { useProgressData } from "../../database/useProgressData";
import { pairTrainingLink } from "../../app/router";
import { History } from "./History";

export function ParentAnalytics() {
  const { t, preferences } = useApp();
  const { stats, sessions, attempts, error } = useProgressData();
  const format = new Intl.NumberFormat(preferences.language, {
    maximumFractionDigits: 1,
  });
  const seconds = (ms: number | null) =>
    ms === null ? "—" : t("seconds", { value: format.format(ms / 1000) });
  return (
    <details className="card parent-analytics">
      <summary>{t("parentDetails")}</summary>
      {error && <p role="alert">{t("storageError")}</p>}
      <p>{t("practiceOnly")}</p>
      <dl className="session-metrics">
        <div>
          <dt>{t("accuracy")}</dt>
          <dd>
            {stats.accuracy === null
              ? "—"
              : `${format.format(stats.accuracy * 100)}%`}
          </dd>
        </div>
        <div>
          <dt>{t("meanSpeed")}</dt>
          <dd>{seconds(stats.meanCorrectMs)}</dd>
        </div>
        <div>
          <dt>{t("medianSpeed")}</dt>
          <dd>{seconds(stats.medianCorrectMs)}</dd>
        </div>
      </dl>
      <p>{t("speedHint")}</p>
      <p>
        {t("directionsCount", { count: String(stats.masteredDirections) })} ·{" "}
        {t("pairsCount", { count: String(stats.masteredPairs) })}
      </p>
      <h3>{t("dailyTrend")}</h3>
      <p>{t("trendHint")}</p>
      {!stats.daily.length && <p>{t("notYet")}</p>}
      <ol className="daily-trend">
        {stats.daily.map((day) => (
          <li key={day.day}>
            <strong>{day.day}</strong>
            <span>
              {t("learningScore", {
                correct: String(day.correct),
                count: String(day.answered),
              })}{" "}
              · {format.format((day.accuracy ?? 0) * 100)}%
            </span>
            <span>
              {t("meanSpeed")}: {seconds(day.meanCorrectMs)} ·{" "}
              {t("medianSpeed")}: {seconds(day.medianCorrectMs)}
            </span>
            <meter
              min={0}
              max={Math.max(
                10000,
                ...stats.daily.map((d) => d.medianCorrectMs ?? 0),
              )}
              value={day.medianCorrectMs ?? 0}
              aria-label={`${day.day}: ${t("medianSpeed")}`}
            />
          </li>
        ))}
      </ol>
      <h3>{t("weak")}</h3>
      <ul className="difficult-list">
        {stats.difficult.slice(0, 12).map((f) => (
          <li key={f.id}>
            <a href={pairTrainingLink(f.id)}>{f.operands.join(" × ")}</a>
            <span>
              {t(f.status)} ·{" "}
              {f.accuracy === null
                ? "—"
                : `${format.format(f.accuracy * 100)}%`}{" "}
              · {seconds(f.medianCorrectMs)}
            </span>
          </li>
        ))}
      </ul>
      {!stats.difficult.length && <p>{t("noDifficult")}</p>}
      <h3>{t("sessionHistory")}</h3>
      {[...sessions]
        .sort((a, b) => b.startedAt - a.startedAt)
        .map((s) => (
          <details key={s.id} className="session-history">
            <summary>
              {new Date(s.startedAt).toLocaleString(preferences.language)} ·{" "}
              {t(
                s.mode === "diagnostic"
                  ? "diagnosticLink"
                  : s.mode === "weak"
                    ? "weak"
                    : "training",
              )}{" "}
              · {s.cursor} ·{" "}
              {t(s.completedAt === null ? "inProgress" : "sessionEnded")}
            </summary>
            {s.mode !== "diagnostic" && (
              <p>
                {t("improvedCount", {
                  count: String(s.summary.improvedPairs.length),
                })}
              </p>
            )}
            <History attempts={attempts.filter((a) => a.sessionId === s.id)} />
          </details>
        ))}
    </details>
  );
}
