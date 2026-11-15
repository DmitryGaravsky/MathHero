import { useApp } from "../../app/AppContext";
import { achievementIds, type Reward } from "../../engine/learning/rewards";

export function Achievements({ rewards, pageHeading = false }: { rewards: Reward[]; pageHeading?: boolean }) {
  const { t } = useApp();
  const Heading = pageHeading ? "h1" : "h2";
  return (
    <section className="card achievements">
      <Heading>{t("achievements")}</Heading>
      <p>{t("achievementHint")}</p>
      <ul>
        {achievementIds.map((id) => (
          <li key={id}>
            <span aria-hidden="true">
              {rewards.some((r) => r.achievement === id) ? "★" : "☆"}
            </span>{" "}
            {t(id)}{" "}
            <span className="small-text">
              {t(
                rewards.some((r) => r.achievement === id)
                  ? "unlocked"
                  : "locked",
              )}
            </span>
          </li>
        ))}
      </ul>
    </section>
  );
}
