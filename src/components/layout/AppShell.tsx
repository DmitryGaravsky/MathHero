import { useLayoutEffect, useRef, type ReactNode } from "react";
import { useApp } from "../../app/AppContext";
import { reportOperation, routeHref, type AppMode, type Route } from "../../app/router";
import { Icon } from "../ui/Icon";
import { LanguageSwitcher } from "./LanguageSwitcher";
import { Navigation } from "./Navigation";

export function AppShell({ mode, screen, targetPair, onSwitchMode, children }: {
  mode: AppMode;
  screen: Route;
  targetPair?: string;
  onSwitchMode: () => void;
  children: ReactNode;
}) {
  const { preferences, t } = useApp();
  const main = useRef<HTMLElement>(null);
  useLayoutEffect(() => {
    main.current?.focus({ preventScroll: true });
    window.scrollTo(0, 0);
  }, [screen, targetPair]);

  return (
    <div className="app-shell" data-animations={preferences.animationsEnabled}
      data-theme={preferences.theme} data-mode={mode} data-screen={screen}>
      <a className="skip-link" href="#main-content" onClick={(event) => {
        event.preventDefault();
        main.current?.focus();
      }}>{t("skip")}</a>
      <header className="app-header">
        <a href={routeHref(mode, "home")} className="brand">
          <span className="brand-icon"><Icon name="spark" /></span>
          {t("appName")}
        </a>
        <LanguageSwitcher />
        <button type="button" className="button secondary mode-switch" onClick={(event) => {
          if (mode === "child") event.currentTarget.focus({ preventScroll: true });
          onSwitchMode();
        }}>
          {t(mode === "child" ? "parentMode" : "childMode")}
        </button>
      </header>
      {!reportOperation(screen) && <Navigation mode={mode} screen={screen} />}
      <main id="main-content" tabIndex={-1} ref={main}>{children}</main>
      <footer className="app-footer">{t("tagline")}</footer>
    </div>
  );
}
