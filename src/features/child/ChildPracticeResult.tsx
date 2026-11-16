import type { Ref } from "react";
import { useApp } from "../../app/AppContext";
import { routeHref } from "../../app/router";
import { Icon } from "../../components/ui/Icon";
import { useSessionRewards } from "../../database/usePracticeData";
import type { LearningSession } from "../../engine/learning/session";
import { ChildAchievementName } from "./ChildAchievements";

export function ChildPracticeResult({ session, headingRef, busy, onContinue }: {
  session: LearningSession;
  headingRef: Ref<HTMLHeadingElement>;
  busy: boolean;
  onContinue: () => void;
}) {
  const { t, preferences } = useApp();
  const { answered, correct, improvedPairs } = session.summary;
  const rewardData = useSessionRewards(session.id);
  const rewards = rewardData?.rewards ?? [];
  const stars = rewards.reduce((sum, reward) => sum + reward.stars, 0);
  const format = new Intl.NumberFormat(preferences.language);
  const plural = new Intl.PluralRules(preferences.language).select(improvedPairs.length);
  const improved = plural === "one" ? "childImprovedOne" : plural === "few" ? "childImprovedFew" : "childImprovedOther";
  return (
    <section className="card child-result">
      <h1 ref={headingRef} tabIndex={-1}>
        {t(session.endReason === "early" ? "sessionEnded" : "sessionComplete")}
      </h1>
      <div className="child-result-score">
        <span className="child-badge"><Icon name={correct ? "check" : "training"} /></span>
        <div>
          <strong>{answered ? t("learningScore", { count: format.format(answered), correct: format.format(correct) }) : t("childNoAnswers")}</strong>
          {correct > 0 && <p>{t("childCorrectPraise")}</p>}
        </div>
      </div>
      {answered > 0 && <p>{t(improvedPairs.length ? improved : "childKeepPracticing", {
        count: format.format(improvedPairs.length),
      })}</p>}
      {rewardData?.error && <p role="alert">{t("storageError")}</p>}
      {stars > 0 && (
        <ul className="child-reward-list">
          <li><Icon name="star" />{t("earnedStars", { count: format.format(stars) })}</li>
          {rewards.map((reward) => reward.achievement && (
            <li key={reward.id}><Icon name="trophy" /><ChildAchievementName id={reward.achievement} /></li>
          ))}
        </ul>
      )}
      <p>{t("childResultNext")}</p>
      <div className="child-result-actions">
        <button className="button primary" disabled={busy} onClick={onContinue}>
          {t("newSession")} <Icon name="arrow" />
        </button>
        <a className="button secondary" href={routeHref("child", "home")}>{t("finish")}</a>
      </div>
    </section>
  );
}
