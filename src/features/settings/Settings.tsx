import { useApp } from "../../app/AppContext";
import { LanguageSwitcher } from "../../components/layout/LanguageSwitcher";
import { PageHeading } from "../../components/ui/PageHeading";

export function Settings() {
  const { preferences, setAnimations, t } = useApp();
  return (
    <>
      <PageHeading
        title={t("settingsTitle")}
        description={t("settingsDescription")}
      />
      <section className="card settings-card">
        <div className="setting-row">
          <div>
            <h2>{t("language")}</h2>
            <p>{t("languageHint")}</p>
          </div>
          <LanguageSwitcher />
        </div>
        <div className="setting-row">
          <div>
            <h2>{t("sound")}</h2>
            <p>{t("soundHint")}</p>
          </div>
          <span className="badge">{t("off")}</span>
        </div>
        <div className="setting-row">
          <div>
            <h2 id="animations-label">{t("animations")}</h2>
            <p id="animations-help">{t("animationsHint")}</p>
          </div>
          <button
            type="button"
            className="toggle"
            role="switch"
            aria-labelledby="animations-label"
            aria-describedby="animations-help"
            aria-checked={preferences.animationsEnabled}
            onClick={() => setAnimations(!preferences.animationsEnabled)}
          >
            <span aria-hidden="true" />
          </button>
        </div>
        <div className="setting-row">
          <div>
            <h2>{t("goal")}</h2>
            <p>{t("goalHint")}</p>
          </div>
        </div>
      </section>
      <section className="privacy">
        <h2>{t("privacyTitle")}</h2>
        <p>{t("privacy")}</p>
        <p>{t("settingsMemory")}</p>
      </section>
    </>
  );
}
