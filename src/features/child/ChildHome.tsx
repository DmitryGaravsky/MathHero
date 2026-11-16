import { useApp } from "../../app/AppContext";
import { routeHref } from "../../app/router";
import { Icon } from "../../components/ui/Icon";
import { useChildProgress } from "../../database/usePracticeData";
import { multiplicationFacts } from "../../engine/multiplication/facts";
import { ModuleArt } from "./ModuleArt";

const pairCount = new Set(multiplicationFacts.map((fact) => fact.canonicalId)).size;

export function ChildHome() {
  const { t, preferences } = useApp();
  const { state, error } = useChildProgress();
  const format = new Intl.NumberFormat(preferences.language);
  return (
    <div className="child-home">
      <section className="child-welcome">
        <div className="hero-copy">
          <h1>{t("childHomeTitle")}</h1>
          <p>{t("childHomePrompt")}</p>
        </div>
      </section>
      <div className="child-modules">
        <a href={routeHref("child", "training")} className="module-card">
          <ModuleArt module="multiplication" />
          <span><strong>{t("childTables")}</strong>
            {state?.pending && <small>{t("resumeLearning")}</small>}
          </span>
          <Icon name="arrow" />
        </a>
        <a href={routeHref("child", "columns")} className="module-card">
          <ModuleArt module="columns" />
          <span><strong>{t("columnTitle")}</strong><small>{t("columnOperations")}</small></span>
          <Icon name="arrow" />
        </a>
      </div>
      <div className="child-home-links">
        <section className="card child-progress">
          <h2>{t("childTablesProgress")}</h2>
          {error ? <p role="alert">{t("storageError")}</p> : !state ? <p>{t("loading")}</p> : (
            <>
              <p><strong>{format.format(state.mastered)} / {format.format(pairCount)}</strong> {t("childMastered")}</p>
              <progress value={state.mastered} max={pairCount} aria-label={t("childMastered")} />
            </>
          )}
        </section>
        <a href={routeHref("child", "achievements")} className="card child-achievements-link">
          <span className="child-badge"><Icon name="trophy" /></span>
          <strong>{t("childTablesRewards")}</strong>
          <Icon name="arrow" />
        </a>
      </div>
    </div>
  );
}
