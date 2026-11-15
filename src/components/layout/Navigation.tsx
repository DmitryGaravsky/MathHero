import { useApp } from "../../app/AppContext";
import { screens, type Screen } from "../../app/router";
import { Icon } from "../ui/Icon";

export function Navigation({ screen }: { screen: Screen }) {
  const { t } = useApp();
  return (
    <nav className="navigation" aria-label={t("navigation")}>
      {screens.map((item) => (
        <a
          key={item}
          href={`#${item}`}
          aria-current={screen === item ? "page" : undefined}
        >
          <Icon name={item} />
          <span>{t(item)}</span>
        </a>
      ))}
    </nav>
  );
}
