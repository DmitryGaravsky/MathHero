import { useApp } from "../../app/AppContext";
import { PageHeading } from "../../components/ui/PageHeading";

const factors = Array.from({ length: 12 }, (_, index) => index + 1);
export function MultiplicationMap() {
  const { t } = useApp();
  return (
    <>
      <PageHeading title={t("mapTitle")} description={t("mapDescription")} />
      <section className="card map-card">
        <div className="table-map" role="img" aria-label={t("mapLabel")}>
          <div className="map-row" aria-hidden="true">
            <span>×</span>
            {factors.map((n) => (
              <span key={n}>{n}</span>
            ))}
          </div>
          {factors.map((a) => (
            <div key={a} className="map-row" aria-hidden="true">
              <span>{a}</span>
              {factors.map((b) => (
                <span key={b} className="map-cell">
                  ·
                </span>
              ))}
            </div>
          ))}
        </div>
        <ul className="legend">
          {(
            ["unknown", "difficult", "developing", "fluent", "stable"] as const
          ).map((status) => (
            <li key={status}>
              <span className={`legend-dot ${status}`} />
              {t(status)}
            </li>
          ))}
        </ul>
        <p className="map-hint">{t("mapHint")}</p>
      </section>
    </>
  );
}
