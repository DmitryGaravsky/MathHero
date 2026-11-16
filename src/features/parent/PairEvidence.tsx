import { useMemo } from "react";
import { useApp } from "../../app/AppContext";
import { useMetricFormat } from "../../app/useMetricFormat";
import { readPairDetail } from "../../database/parentReadModel";
import { useParentRead } from "../../database/useParentRead";
import { knowledgeState, pairObservations } from "../../engine/learning/knowledge";
import { ParentReadStatus } from "./ParentReadStatus";
import { useParentClock } from "./useProgressView";

export function PairEvidence({ data }: { data: Awaited<ReturnType<typeof readPairDetail>> }) {
  const { t, preferences } = useApp();
  const { number, percent, seconds } = useMetricFormat();
  const now = useParentClock();
  const evidence = useMemo(() => pairObservations(data.attempts, data.policies), [data]);
  const state = knowledgeState(data.progress, data.policies, now, evidence.check);
  return (
    <div className="pair-evidence">
      <h3>{t("knowledgeTitle")}</h3>
      <p><strong>{t(`knowledge.${state}`)}</strong> · {t(`knowledgeHint.${state}`)}</p>
      {state === "retained" && evidence.check && <p>{t("retentionProof", {
        date: new Intl.DateTimeFormat(preferences.language, {
          dateStyle: "medium", timeZone: evidence.check.timeZone,
        }).format(evidence.check.at),
        interval: new Intl.NumberFormat(preferences.language, { style: "unit", unit: "day", unitDisplay: "long" }).format(evidence.check.intervalDays),
      })}</p>}
      {evidence.answered > 0 && <>
        <p>{t(evidence.diagnosticOnly ? "diagnosticObservations" : "recentPairObservations", {
          count: number(evidence.answered),
        })}</p>
        <ul className="evidence-list">
          <li>{t("wrongObservations", { count: number(evidence.wrong) })}</li>
          <li>{t("slowObservations", { count: number(evidence.slow) })}</li>
          <li>{t("pairMetrics", { accuracy: percent(evidence.accuracy), speed: seconds(evidence.medianCorrectMs) })}</li>
          {evidence.recurring && <li>{t("recurringErrors")}</li>}
          {evidence.unstable && <li>{t("unstableAfterMastery")}</li>}
          {evidence.possibleSlip && <li>{t("possibleInputSlip")}</li>}
          {!evidence.recurring && !evidence.unstable && !evidence.possibleSlip && (evidence.wrong > 0 || evidence.slow > 0) &&
            <li>{t("limitedErrorEvidence")}</li>}
        </ul>
      </>}
    </div>
  );
}

export function WeakPairEvidence({ pair }: { pair: string }) {
  const result = useParentRead(readPairDetail, pair);
  return result?.data ? <PairEvidence data={result.data} /> : <ParentReadStatus error={result?.error} />;
}
