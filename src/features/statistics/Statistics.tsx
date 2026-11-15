import { useApp } from "../../app/AppContext";
import { Mascot } from "../../components/mascot/Mascot";
import { PageHeading } from "../../components/ui/PageHeading";
import { useDiagnosticData } from "../../database/useDiagnosticData";
import { diagnosticStatistics } from "../../engine/sessions/statistics";

export function Statistics() {
  const { t, preferences } = useApp();
  const { session, attempts, loading, error } = useDiagnosticData();
  const stats = diagnosticStatistics(attempts);
  const format = new Intl.NumberFormat(preferences.language, {
    maximumFractionDigits: 1,
  });
  const seconds = (ms: number | null) =>
    ms === null ? "—" : t("seconds", { value: format.format(ms / 1000) });
  return (
    <>
      <PageHeading
        title={t("resultsTitle")}
        description={t("resultsDescription")}
      />
      {loading ? (
        <p role="status">{t("loading")}</p>
      ) : error ? (
        <p role="alert">{t("storageError")}</p>
      ) : (
        <>
          <section className="card empty-state">
            <Mascot small />
            <h2>
              {t(
                stats.answered
                  ? session?.completedAt
                    ? "diagnosticComplete"
                    : "diagnosticPartial"
                  : "emptyResultsTitle",
              )}
            </h2>
            <p>
              {stats.answered
                ? t("diagnosticScore", {
                    correct: String(stats.correct),
                    count: String(stats.answered),
                  })
                : t("emptyResults")}
            </p>
            <p>{t("noMastery")}</p>
            {!session?.completedAt && (
              <a href="#training" className="button primary">
                {t(session ? "resume" : "start")}
              </a>
            )}
          </section>
          <h2 className="section-title">{t("parent")}</h2>
          <div className="analytics-grid">
            <section className="card">
              <h3>{t("accuracy")}</h3>
              <strong className="result-value">
                {stats.accuracy === null
                  ? "—"
                  : `${format.format(stats.accuracy * 100)}%`}
              </strong>
              <p>{t("accuracyHint")}</p>
            </section>
            <section className="card">
              <h3>{t("medianSpeed")}</h3>
              <strong className="result-value">
                {seconds(stats.medianCorrectMs)}
              </strong>
              <p>{t("speedHint")}</p>
            </section>
            <section className="card">
              <h3>{t("meanSpeed")}</h3>
              <strong className="result-value">
                {seconds(stats.meanCorrectMs)}
              </strong>
              <p>{t("speedHint")}</p>
            </section>
          </div>
        </>
      )}
    </>
  );
}
