import { BackupControls } from "./BackupControls";
import { OfflineSettings } from "./OfflineSettings";
import { useApp } from "../../app/AppContext";
import { LanguageSwitcher } from "../../components/layout/LanguageSwitcher";
import { PageHeading } from "../../components/ui/PageHeading";
import { dailyGoals, themePreferences } from "../../settings/preferences";
import { ParentPinSettings } from "./ParentPinSettings";

export function Settings() {
  const { preferences, savePreferences, t } = useApp();
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
          <h2 id="theme-label">{t("theme")}</h2>
          <select aria-labelledby="theme-label" value={preferences.theme} onChange={(event) => {
            const theme = themePreferences.find((choice) => choice === event.target.value);
            if (theme) savePreferences({ theme });
          }}>
            {themePreferences.map((theme) => (
              <option value={theme} key={theme}>{t(`theme_${theme}`)}</option>
            ))}
          </select>
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
            onClick={() => savePreferences({ animationsEnabled: !preferences.animationsEnabled })}
          >
            <span aria-hidden="true" />
          </button>
        </div>
        <div className="setting-row">
          <div>
            <h2 id="goal-label">{t("goal")}</h2>
            <p>{t("goalHint")}</p>
          </div>
          <select
            aria-labelledby="goal-label"
            value={preferences.dailyGoalMinutes}
            onChange={(event) => {
              const dailyGoalMinutes = dailyGoals.find((minutes) => String(minutes) === event.target.value);
              if (dailyGoalMinutes) savePreferences({ dailyGoalMinutes });
            }}
          >
            {dailyGoals.map((n) => (
              <option value={n} key={n}>
                {t("minutes", { count: String(n) })}
              </option>
            ))}
          </select>
        </div>
      </section>
      <ParentPinSettings />
      <BackupControls />
      <OfflineSettings />
      <section className="privacy">
        <h2>{t("privacyTitle")}</h2>
        <p>{t("privacy")}</p>
        <p>{t("settingsMemory")}</p>
      </section>
    </>
  );
}
