import { useApp } from "../../app/AppContext";
import { routeHref } from "../../app/router";
import { Mascot } from "../../components/mascot/Mascot";
import { Icon } from "../../components/ui/Icon";
import { useChildProgress } from "../../database/usePracticeData";
import { multiplicationFacts } from "../../engine/multiplication/facts";

const pairCount = new Set(multiplicationFacts.map((fact) => fact.canonicalId)).size;

export function ChildHome() {
  const { t, preferences } = useApp();
  const { state, error } = useChildProgress();
  const format = new Intl.NumberFormat(preferences.language);
  return (
    <div className="child-home">
      <section className="hero child-hero">
        <div className="hero-copy">
          <h1>{t("childHomeTitle")}</h1>
          <p>{t("childHomePrompt")}</p>
          <a href={routeHref("child", "training")} className="button primary">
            {t(state?.pending ? "resumeLearning" : "startLearning")}
            <Icon name="arrow" />
          </a>
        </div>
        <div className="hero-art">
          <span className="orbit orbit-one" />
          <span className="orbit orbit-two" />
          <Mascot />
        </div>
      </section>
      <div className="child-home-links">
        <section className="card child-progress">
          <h2>{t("childProgress")}</h2>
          {error ? <p role="alert">{t("storageError")}</p> : !state ? <p>{t("loading")}</p> : (
            <>
              <p><strong>{format.format(state.mastered)} / {format.format(pairCount)}</strong> {t("childMastered")}</p>
              <progress value={state.mastered} max={pairCount} aria-label={t("childMastered")} />
            </>
          )}
        </section>
        <a href={routeHref("child", "achievements")} className="card child-achievements-link">
          <span className="child-badge"><Icon name="trophy" /></span>
          <strong>{t("achievements")}</strong>
          <Icon name="arrow" />
        </a>
      </div>
    </div>
  );
}
