import { useProgressData } from "../../database/useProgressData";
import { Achievements } from "../statistics/Achievements";
import { calendarDay, learningPolicy } from "../../engine/learning/progress";
import { useApp } from "../../app/AppContext";
import { Mascot } from "../../components/mascot/Mascot";
import { Icon } from "../../components/ui/Icon";
import { useDiagnosticData } from "../../database/useDiagnosticData";
import { useLearningData } from "../../database/useLearningData";
import { routeHref, type AppMode } from "../../app/router";

export function Dashboard({ mode }: { mode: AppMode }) {
  const { t, preferences } = useApp();
  const progress = useProgressData();
  const today = progress.stats.daily.find(
    (d) => d.day === calendarDay(progress.now, learningPolicy.timeZone),
  );
  const { session, loading, error } = useDiagnosticData();
  const learning = useLearningData();
  return (
    <>
      <section className="hero">
        <div className="hero-copy">
          <p className="eyebrow">{t("hello")}</p>
          <h1>{t("heroTitle")}</h1>
          <p>{t("heroDescription")}</p>
          <a href={routeHref(mode, "training")} className="button primary">
            {t(learning.pending ? "resumeLearning" : "startLearning")}
            <Icon name="arrow" />
          </a>
          {mode === "parent" && <a
            href={
              session?.completedAt !== null && session
                ? routeHref(mode, "results")
                : routeHref(mode, "diagnostic")
            }
            className="text-link diagnostic-link"
          >
            {t(
              session?.completedAt !== null && session
                ? "viewResults"
                : session
                  ? "resume"
                  : "start",
            )}
            <Icon name="arrow" />
          </a>}
          {mode === "parent" && session?.completedAt != null && (
            <a href={routeHref(mode, "diagnostic")} className="text-link diagnostic-link">
              {t("diagnosticLink")}
            </a>
          )}
          {loading && <p role="status">{t("loading")}</p>}
          {(error || learning.error) && <p role="alert">{t("storageError")}</p>}
          {mode === "parent" && session && (
            <p>{t("savedProgress", { count: String(session.cursor) })}</p>
          )}
        </div>
        <div className="hero-art">
          <span className="orbit orbit-one" />
          <span className="orbit orbit-two" />
          <span className="little-star star-one">✦</span>
          <span className="little-star star-two">✦</span>
          <Mascot />
        </div>
      </section>
      <div className="dashboard-grid">
        <section className="card mission-card">
          <p className="eyebrow">{t("mission")}</p>
          <div className="mission-icon">
            <Icon name="training" />
          </div>
          <h2>{t("missionTitle")}</h2>
          <p>{t("missionDescription")}</p>
          <p className="small-text">{t("duration")}</p>
          <p>
            {t("dailyGoalProgress", {
              minutes: String(Math.floor((today?.activeMs ?? 0) / 60000)),
              goal: String(preferences.dailyGoalMinutes),
            })}
          </p>
        </section>
        <section className="card journey-card">
          <h2>{t("journey")}</h2>
          <div className="metrics">
            <div>
              <Icon name="star" />
              <strong>{progress.stars}</strong>
              <span>{t("stars")}</span>
            </div>
            <div>
              <Icon name="spark" />
              <strong>{learning.mastered} / 78</strong>
              <span>{t("masteredPairs")}</span>
            </div>
          </div>
          <p>
            {t("directionsCount", {
              count: String(progress.stats.masteredDirections),
            })}{" "}
            · {Math.round((progress.stats.masteredDirections / 144) * 100)}%
          </p>
          <progress
            max={144}
            value={progress.stats.masteredDirections}
            aria-label={t("masteredDirections")}
          />
          <p>{t("progressHint")}</p>
          <a className="text-link" href={routeHref(mode, mode === "parent" ? "results" : "achievements")}>
            {t(mode === "parent" ? "viewResults" : "achievements")}
            <Icon name="arrow" />
          </a>
        </section>
      </div>
      <Achievements rewards={progress.rewards} />
      <a href={routeHref(mode, "weak")} className="weak-link">
        <Icon name="map" />
        <div>
          <strong>{t("weak")}</strong>
          <p>{t("weakHint")}</p>
        </div>
        <Icon name="arrow" />
      </a>
    </>
  );
}
