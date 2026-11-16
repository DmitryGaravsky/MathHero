import { useApp } from "../../app/AppContext";
import type { MessageKey } from "../../app/i18n";
import { Icon, type IconName } from "../../components/ui/Icon";
import { useUnlockedAchievements } from "../../database/usePracticeData";
import { achievementIds, type AchievementId } from "../../engine/learning/rewards";

const badges = {
  first10: ["first10", "star"],
  master25: ["childMaster25", "spark"],
  master50: ["childMaster50", "spark"],
  master100: ["childMaster100", "spark"],
  week: ["childWeek", "calendar"],
  all: ["childAll", "trophy"],
} satisfies Record<AchievementId, [MessageKey, IconName]>;

export function ChildAchievements() {
  const { t, preferences } = useApp();
  const { state, error } = useUnlockedAchievements();
  const unlocked = new Set(state?.map((reward) => reward.achievement));
  const format = new Intl.NumberFormat(preferences.language);
  return (
    <section className="child-achievements">
      <h1>{t("achievements")}</h1>
      {error ? <p role="alert">{t("storageError")}</p> : !state ? <p role="status">{t("loading")}</p> : (
        <>
          <p>{t("childBadgesEarned", {
            count: format.format(unlocked.size), total: format.format(achievementIds.length),
          })}</p>
          <p>{t("childBadgeOrder")}</p>
          <ul className="child-badges">
            {achievementIds.map((id) => {
              const [label, icon] = badges[id];
              const earned = unlocked.has(id);
              return (
                <li key={id} className="card" data-earned={earned}>
                  <span className="child-badge"><Icon name={icon} /></span>
                  <strong>{t(label)}</strong>
                  <span>{t(earned ? "unlocked" : "locked")}</span>
                </li>
              );
            })}
          </ul>
        </>
      )}
    </section>
  );
}

export function ChildAchievementName({ id }: { id: AchievementId }) {
  const { t } = useApp();
  return t(badges[id][0]);
}
