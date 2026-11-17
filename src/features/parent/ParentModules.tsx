import { useApp } from "../../app/AppContext";
import { columnReportRoutes, routeHref } from "../../app/router";
import type { ColumnOperation } from "../../engine/column/arithmetic";

export function ParentModules({ operation, settings }: { operation?: ColumnOperation; settings: boolean }) {
  const { t } = useApp();
  return <div role="navigation" className="report-links parent-module-links" aria-label={t("parentModules")}>
    <a className="button secondary" href={routeHref("parent", "home")} tabIndex={0}
      aria-current={!operation && !settings ? "true" : undefined}>{t("childTables")}</a>
    <a className="button secondary" href={routeHref("parent", columnReportRoutes[operation ?? "addition"])} tabIndex={0}
      aria-current={operation ? "true" : undefined}>{t("columnTitle")}</a>
  </div>;
}
