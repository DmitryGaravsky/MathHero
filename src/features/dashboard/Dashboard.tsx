import { useApp } from "../../app/AppContext";
import { Mascot } from "../../components/mascot/Mascot";
import { Icon } from "../../components/ui/Icon";

export function Dashboard() {
  const { t } = useApp();
  return (
    <>
      <section className="hero">
        <div className="hero-copy">
          <p className="eyebrow">{t("hello")}</p>
          <h1>{t("heroTitle")}</h1>
          <p>{t("heroDescription")}</p>
          <a href="#training" className="button primary">
            {t("start")}
            <Icon name="arrow" />
          </a>
        </div>
        <div className="hero-art">
          <span className="orbit orbit-one" />
          <span className="orbit orbit-two" />
          <span className="little-star star-one">✦</span>
          <span className="little-star star-two">✦</span>
          <Mascot />
        </div>
      </section>
      <div className="dashboard-grid">
        <section className="card mission-card">
          <p className="eyebrow">{t("mission")}</p>
          <div className="mission-icon">
            <Icon name="training" />
          </div>
          <h2>{t("missionTitle")}</h2>
          <p>{t("missionDescription")}</p>
          <p className="small-text">{t("duration")}</p>
        </section>
        <section className="card journey-card">
          <h2>{t("journey")}</h2>
          <div className="metrics">
            <div>
              <Icon name="star" />
              <strong>0</strong>
              <span>{t("stars")}</span>
            </div>
            <div>
              <Icon name="spark" />
              <strong>—</strong>
              <span>{t("mastered")}</span>
            </div>
          </div>
          <p>{t("progressHint")}</p>
          <a className="text-link" href="#results">
            {t("viewResults")}
            <Icon name="arrow" />
          </a>
        </section>
      </div>
      <div className="weak-link">
        <Icon name="map" />
        <div>
          <strong>{t("weak")}</strong>
          <p>{t("previewOnly")}</p>
        </div>
        <span aria-hidden="true">—</span>
      </div>
    </>
  );
}
