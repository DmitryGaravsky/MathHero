import { useEffect, useRef } from "react";
import { useApp } from "./AppContext";
import { useScreen } from "./router";
import { Navigation } from "../components/layout/Navigation";
import { LanguageSwitcher } from "../components/layout/LanguageSwitcher";
import { Icon } from "../components/ui/Icon";
import { Dashboard } from "../features/dashboard/Dashboard";
import { Training } from "../features/training/Training";
import { Statistics } from "../features/statistics/Statistics";
import { MultiplicationMap } from "../features/multiplication/MultiplicationMap";
import { Settings } from "../features/settings/Settings";

const pages = {
  home: Dashboard,
  results: Statistics,
  map: MultiplicationMap,
  settings: Settings,
};
export function App() {
  const { preferences, t } = useApp();
  const { screen, targetPair } = useScreen();
  const isTraining =
    screen === "training" || screen === "weak" || screen === "diagnostic";
  const Page = isTraining ? null : pages[screen];
  const main = useRef<HTMLElement>(null);
  useEffect(() => {
    main.current?.focus({ preventScroll: true });
    window.scrollTo(0, 0);
  }, [screen]);
  return (
    <div
      className="app-shell"
      data-animations={preferences.animationsEnabled}
      data-screen={screen}
    >
      <a
        className="skip-link"
        href="#main-content"
        onClick={(event) => {
          event.preventDefault();
          main.current?.focus();
        }}
      >
        {t("skip")}
      </a>
      <header className="app-header">
        <a href="#home" className="brand">
          <span className="brand-icon">
            <Icon name="spark" />
          </span>
          {t("appName")}
        </a>
        <LanguageSwitcher />
      </header>
      <Navigation screen={screen} />
      <main id="main-content" tabIndex={-1} ref={main}>
        {Page ? (
          <Page />
        ) : (
          <Training
            key={`${screen}:${targetPair ?? ""}`}
            mode={
              screen === "diagnostic"
                ? "diagnostic"
                : screen === "weak"
                  ? "weak"
                  : "adaptive"
            }
            targetPair={targetPair}
          />
        )}
      </main>
      <footer className="app-footer">{t("tagline")}</footer>
    </div>
  );
}
