import { useState, type KeyboardEvent } from "react";
import { useApp } from "../../app/AppContext";
import { childNavigation, parentNavigation, routeHref, type AppMode, type Route } from "../../app/router";
import { Icon, type IconName } from "../ui/Icon";
import type { MessageKey } from "../../app/i18n";

const destinations = {
  home: ["overview", "home"],
  map: ["progressMap", "map"],
  results: ["analytics", "results"],
  "weak-spots": ["weakSpots", "spark"],
  diagnosis: ["diagnosticLink", "check"],
  history: ["historyLabel", "calendar"],
  training: ["training", "training"],
  settings: ["settingsData", "settings"],
} satisfies Record<(typeof parentNavigation)[number], [MessageKey, IconName]>;
const childDestinations = {
  home: ["home", "home"],
  training: ["training", "training"],
  achievements: ["achievements", "star"],
} satisfies Record<(typeof childNavigation)[number], [MessageKey, IconName]>;

export function Navigation({ mode, screen }: { mode: AppMode; screen: Route }) {
  const { t } = useApp();
  const parent = mode === "parent";
  const [open, setOpen] = useState(false);
  const current = screen === "diagnostic" ? "diagnosis" : screen === "weak" ? "weak-spots" : screen;
  function closeOnEscape(event: KeyboardEvent<HTMLElement>) {
    if (event.key !== "Escape" || !open) return;
    const toggle = event.currentTarget.querySelector("button");
    if (!toggle?.getClientRects().length) return;
    setOpen(false);
    toggle.focus();
  }
  const links = parent ? parentNavigation.map((item) => [item, ...destinations[item]] as const)
    : childNavigation.map((item) => [item, ...childDestinations[item]] as const);

  return (
    <nav className={parent ? "parent-navigation" : "navigation"} aria-label={t("navigation")} onKeyDown={closeOnEscape}>
      {parent && <button type="button" className="button secondary parent-menu"
        aria-expanded={open} aria-controls="parent-destinations"
        onClick={() => setOpen((visible) => !visible)}>
        {t("parentMenu")} <span aria-hidden="true">{open ? "−" : "+"}</span>
      </button>}
      <div id={parent ? "parent-destinations" : undefined} className="nav-links" data-open={open}>
        {links.map(([item, label, icon]) => (
          <a key={item} href={routeHref(mode, item)}
            tabIndex={parent ? 0 : undefined}
            aria-current={(parent ? current : screen) === item ? "page" : undefined}
            onClick={(event) => {
              setOpen(false);
              if (event.currentTarget.hash === window.location.hash) {
                document.getElementById("main-content")?.focus();
              }
            }}>
            <Icon name={icon} />
            <span>{t(label)}</span>
          </a>
        ))}
      </div>
    </nav>
  );
}
