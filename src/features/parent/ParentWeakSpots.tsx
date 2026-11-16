import { useApp } from "../../app/AppContext";
import { pairTrainingLink, routeHref } from "../../app/router";
import { PageHeading } from "../../components/ui/PageHeading";
import { useMetricFormat } from "../../app/useMetricFormat";
import { ParentReadStatus } from "./ParentReadStatus";
import { useProgressView } from "./useProgressView";

export function ParentWeakSpots() {
  const { t } = useApp();
  const { view, error } = useProgressView();
  const { percent, seconds } = useMetricFormat();
  return <>
    <PageHeading title={t("weakSpots")} description={t("weakHint")} />
    <section className="card">
      <a className="button primary" href={routeHref("parent", "weak")}>{t("trainWeak")}</a>
      {!view ? <ParentReadStatus error={error} /> : view.difficult.length ? (
        <ul className="difficult-list">
          {view.difficult.slice(0, 12).map((fact) => (
            <li key={fact.id}>
              <a className="text-link" href={pairTrainingLink(fact.id)} aria-label={t("trainNamedPair", { pair: fact.operands.join(" × ") })}>
                {fact.operands.join(" × ")}
              </a>
              <span>{t(fact.status)} · {percent(fact.accuracy)} · {seconds(fact.medianCorrectMs)}</span>
            </li>
          ))}
        </ul>
      ) : <p className="parent-section">{t("noDifficult")}</p>}
    </section>
  </>;
}
