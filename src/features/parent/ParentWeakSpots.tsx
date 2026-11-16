import { useState } from "react";
import { useApp } from "../../app/AppContext";
import { pairTrainingLink, routeHref } from "../../app/router";
import { PageHeading } from "../../components/ui/PageHeading";
import { useMetricFormat } from "../../app/useMetricFormat";
import { ParentReadStatus } from "./ParentReadStatus";
import { readWeakSpots } from "../../database/parentReadModel";
import { useParentRead } from "../../database/useParentRead";
import { WeakPairEvidence } from "./PairEvidence";

export function ParentWeakSpots() {
  const { t } = useApp();
  const query = useParentRead(readWeakSpots);
  const pairs = query?.data;
  return <>
    <PageHeading title={t("weakSpots")} description={t("weakHint")} />
    <section className="card">
      <a className="button primary" href={routeHref("parent", "weak")}>{t("trainWeak")}</a>
      {!pairs ? <ParentReadStatus error={query?.error} /> : pairs.length ? (
        <ul className="difficult-list">
          {pairs.slice(0, 12).map((fact) => <WeakPair key={fact.id} fact={fact} />)}
        </ul>
      ) : <p className="parent-section">{t("noDifficult")}</p>}
    </section>
  </>;
}

function WeakPair({ fact }: { fact: Awaited<ReturnType<typeof readWeakSpots>>[number] }) {
  const { t } = useApp();
  const { number } = useMetricFormat();
  const [open, setOpen] = useState(false);
  const pair = fact.operands.map(number).join(" × ");
  return (
    <li>
      <div className="weak-pair-heading">
        <a className="text-link" href={pairTrainingLink(fact.id)} aria-label={t("trainNamedPair", { pair })}>
          {pair}
        </a>
        {fact.diagnosticOnly && <span>{t("diagnosticLink")}</span>}
      </div>
      <p className="weak-pair-observations">
        {t("wrongObservations", { count: number(fact.wrong) })} · {t("slowObservations", { count: number(fact.slow) })}
        {fact.recurring && <> · {t("recurringErrors")}</>}
      </p>
      <details onToggle={(event) => setOpen(event.currentTarget.open)}>
        <summary>{t("pairEvidenceDetails", { pair })}</summary>
        {open && <WeakPairEvidence pair={fact.id} />}
      </details>
    </li>
  );
}
