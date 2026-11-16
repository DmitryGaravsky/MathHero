import { useApp } from "../../app/AppContext";
import { achievementIds, type Reward } from "../../engine/learning/rewards";

export function Achievements({ rewards }: { rewards: Reward[] }) {
  const { t } = useApp();
  return (
    <section className="card achievements">
      <h1>{t("achievements")}</h1>
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
