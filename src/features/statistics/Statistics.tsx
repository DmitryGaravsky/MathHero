import { useApp } from "../../app/AppContext";
import { Mascot } from "../../components/mascot/Mascot";
import { PageHeading } from "../../components/ui/PageHeading";

export function Statistics() {
  const { t } = useApp();
  return (
    <>
      <PageHeading
        title={t("resultsTitle")}
        description={t("resultsDescription")}
      />
      <section className="card empty-state">
        <Mascot small />
        <h2>{t("emptyResultsTitle")}</h2>
        <p>{t("emptyResults")}</p>
        <a href="#training" className="button primary">
          {t("start")}
        </a>
      </section>
      <h2 className="section-title">{t("parent")}</h2>
      <div className="analytics-grid">
        {(["accuracy", "speed", "stability"] as const).map((key) => (
          <section key={key} className="card">
            <h3>{t(key)}</h3>
            <strong className="empty-value">—</strong>
            <p>{t(`${key}Hint`)}</p>
          </section>
        ))}
      </div>
    </>
  );
}
