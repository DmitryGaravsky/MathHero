import { useApp } from "../../app/AppContext";
import { useParentRead } from "../../database/useParentRead";
import { readOverview } from "../../database/parentReadModel";
import { routeHref } from "../../app/router";
import { Icon } from "../../components/ui/Icon";
import { PageHeading } from "../../components/ui/PageHeading";
import { LearningSummary } from "../training/LearningSummary";
import { ParentReadStatus } from "./ParentReadStatus";
import { getFact } from "../../engine/multiplication/facts";
import { useState } from "react";
import { masteryEvidence } from "../../engine/learning/progress";
import { useParentClock } from "./useProgressView";

export function ParentSummary() {
  const { t, preferences } = useApp();
  const query = useParentRead(readOverview);
  const now = useParentClock();
  const format = new Intl.NumberFormat(preferences.language);
  const [showLatest, setShowLatest] = useState(false);
  const data = query?.data;
  const mastered = data?.progress.filter((pair) => masteryEvidence(pair, now).mastered).length ?? 0;
  const pendingDaily = data?.pending.some((session) => session.mode === "adaptive");

  return (
    <>
      <PageHeading title={t("overview")} />
      {!data ? <ParentReadStatus error={query?.error} /> : <>
        <section className="card overview-progress">
          <div>
            <h2>{t("masteredPairs")}</h2>
            <strong className="result-value">{format.format(mastered)} / 78</strong>
            <progress max={78} value={mastered} aria-label={t("masteredPairs")} />
            <a className="text-link" href={routeHref("parent", "map")}>{t("viewMap")} <Icon name="arrow" /></a>
          </div>
          <div>
            <h2>{t("stars")}</h2>
            <strong className="result-value">{format.format(data.stars)}</strong>
            <a className="text-link" href={routeHref("parent", "achievements")}>{t("achievements")} <Icon name="arrow" /></a>
          </div>
        </section>
        <section className="card parent-section">
          <h2>{t("training")}</h2>
          <div className="action-row">
            <a className="button primary" href={routeHref("parent", "training")}>
              {t(pendingDaily ? "resumeLearning" : "startLearning")}
            </a>
            <a className="button secondary" href={routeHref("parent", data.diagnosis?.completedAt != null ? "diagnosis" : "diagnostic")}>
              {t(!data.diagnosis ? "start" : data.diagnosis.completedAt === null ? "resume" : "diagnosticComplete")}
            </a>
          </div>
          {data.pending.some((session) => session.mode === "weak") && (
            <ul className="pending-sessions">
              {data.pending.map((session) => session.mode === "weak" && (
                <li key={session.id}>
                  <a className="text-link" href={routeHref("parent", "weak", session.targetPair)}>
                    {session.targetPair
                      ? t("resumePair", { pair: getFact(session.targetPair).operands.join(" × ") })
                      : t("resumeWeak")}
                  </a>
                </li>
              ))}
            </ul>
          )}
        </section>
        {data.latest && <details className="card parent-section latest-practice" onToggle={(event) => setShowLatest(event.currentTarget.open)}>
          <summary>{t("latestPractice")}</summary>
          {showLatest && <LearningSummary session={data.latest} />}
        </details>}
      </>}
    </>
  );
}
