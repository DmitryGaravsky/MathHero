import { useSessionRewards } from "../../database/usePracticeData";
import { useApp } from "../../app/AppContext";
import type { LearningSession } from "../../engine/learning/session";
import { median } from "../../engine/learning/progress";
import type { Ref } from "react";

export function LearningSummary({ session, headingRef }: { session: LearningSession; headingRef?: Ref<HTMLHeadingElement> }) {
  const rewardData = useSessionRewards(session.id);
  const rewards = rewardData?.rewards ?? [];
  const { t, preferences } = useApp();
  const { answered, correct, correctTimes, improvedPairs, masteredPairs } =
    session.summary;
  const format = new Intl.NumberFormat(preferences.language, {
    maximumFractionDigits: 1,
  });
  const speed = median(correctTimes);
  return (
    <section className="card empty-state">
      <h2 ref={headingRef} tabIndex={headingRef ? -1 : undefined}>
        {t(session.endReason === "early" ? "sessionEnded" : "sessionComplete")}
      </h2>
      <p>
        {t("learningScore", {
          count: String(answered),
          correct: String(correct),
        })}
      </p>
      {rewardData?.error && <p role="alert">{t("storageError")}</p>}
      {rewardData && !rewardData.error && <p>
        {t("earnedStars", {
          count: String(rewards.reduce((n, r) => n + r.stars, 0)),
        })}
      </p>}
      {rewards
        .filter((r) => r.achievement)
        .map((r) => (
          <p key={r.id}>★ {t(r.achievement!)}</p>
        ))}
      <dl className="session-metrics">
        <div>
          <dt>{t("accuracy")}</dt>
          <dd>
            {answered ? `${format.format((correct / answered) * 100)}%` : "—"}
          </dd>
        </div>
        <div>
          <dt>{t("medianSpeed")}</dt>
          <dd>
            {speed === null
              ? "—"
              : t("seconds", { value: format.format(speed / 1000) })}
          </dd>
        </div>
        <div>
          <dt>{t("meanSpeed")}</dt>
          <dd>
            {correctTimes.length
              ? t("seconds", {
                  value: format.format(
                    correctTimes.reduce((a, b) => a + b, 0) /
                      correctTimes.length /
                      1000,
                  ),
                })
              : "—"}
          </dd>
        </div>
      </dl>
      <p>{t("improvedCount", { count: String(improvedPairs.length) })}</p>
      <p>{t("newMasteryCount", { count: String(masteredPairs.length) })}</p>
      <p className="small-text">{t("learningEvidenceHint")}</p>
    </section>
  );
}
