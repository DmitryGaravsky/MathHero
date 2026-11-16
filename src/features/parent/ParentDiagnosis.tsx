import { useApp } from "../../app/AppContext";
import { routeHref } from "../../app/router";
import { PageHeading } from "../../components/ui/PageHeading";
import { readDiagnosis } from "../../database/parentReadModel";
import { useParentRead } from "../../database/useParentRead";
import { ParentMetrics } from "./ParentMetrics";
import { useMetricFormat } from "../../app/useMetricFormat";
import { ParentReadStatus } from "./ParentReadStatus";

export function ParentDiagnosis() {
  const { t } = useApp();
  const query = useParentRead(readDiagnosis);
  const { number } = useMetricFormat();
  const data = query?.data;
  return <>
    <PageHeading title={t("diagnosticLink")} description={t("diagnosticPlan")} />
    {!data ? <ParentReadStatus error={query?.error} /> : <section className="card">
      <h2>{t(!data.session ? "diagnosticIntro" : data.session.completedAt === null ? "diagnosticPartial" : "diagnosticComplete")}</h2>
      {data.stats.answered ? <>
        <p>{t("diagnosticScore", { correct: number(data.stats.correct), count: number(data.stats.answered) })}</p>
        <ParentMetrics stats={data.stats} />
        <p>{t("speedHint")}</p>
      </> : <p>{t("emptyResults")}</p>}
      <p>{t("noMastery")}</p>
      {data.session?.completedAt == null && <a className="button primary" href={routeHref("parent", "diagnostic")}>
        {t(data.session ? "resume" : "start")}
      </a>}
    </section>}
  </>;
}
