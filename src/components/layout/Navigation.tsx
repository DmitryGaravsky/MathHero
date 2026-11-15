import { useApp } from "../../app/AppContext";
import { childNavigation, parentNavigation, routeHref, type AppMode, type Route } from "../../app/router";
import { Icon } from "../ui/Icon";

export function Navigation({ mode, screen }: { mode: AppMode; screen: Route }) {
  const { t } = useApp();
  return (
    <nav className="navigation" aria-label={t("navigation")}>
      {(mode === "parent" ? parentNavigation : childNavigation).map((item) => (
        <a
          key={item}
          href={routeHref(mode, item)}
          aria-current={screen === item ? "page" : undefined}
        >
          <Icon name={item === "achievements" ? "star" : item} />
          <span>{t(item)}</span>
        </a>
      ))}
    </nav>
  );
}
