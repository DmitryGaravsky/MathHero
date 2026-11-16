import { useApp } from "../../app/AppContext";

export function LanguageSwitcher() {
  const { preferences, savePreferences, t } = useApp();
  return (
    <div className="language-switch" role="group" aria-label={t("language")}>
      <button
        lang="es"
        aria-label={t("spanish")}
        aria-pressed={preferences.language === "es"}
        onClick={() => savePreferences({ language: "es" })}
      >
        ES
      </button>
      <button
        lang="ru"
        aria-label={t("russian")}
        aria-pressed={preferences.language === "ru"}
        onClick={() => savePreferences({ language: "ru" })}
      >
        RU
      </button>
    </div>
  );
}
