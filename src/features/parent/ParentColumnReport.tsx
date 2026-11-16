import { useState } from "react";
import { useApp } from "../../app/AppContext";
import { useMetricFormat } from "../../app/useMetricFormat";
import { columnReportRoutes, routeHref } from "../../app/router";
import { PageHeading } from "../../components/ui/PageHeading";
import { columnTimingLimit, readColumnOverview, readColumnTiming } from "../../database/columnParentRead";
import { useParentRead } from "../../database/useParentRead";
import type { ColumnOperation, ColumnSkill } from "../../engine/column/arithmetic";
import { operationMessages, placeMessages } from "../column/columnLabels";
import { ColumnProofDetails } from "./ColumnProofDetails";
import { useColumnReportFormat } from "./useColumnReportFormat";
import { ParentColumnHistory } from "./ParentColumnHistory";
import { ParentReadStatus } from "./ParentReadStatus";

const skillMessages = {
  "no-carry": "columnSkillNoCarry",
  "single-carry": "columnSkillOneCarry",
  "multiple-carries": "columnSkillSeveralCarries",
  "carry-to-thousands": "columnSkillThousands",
  "no-borrow": "columnSkillNoBorrow",
  "single-borrow": "columnSkillOneBorrow",
  "multiple-borrows": "columnSkillSeveralBorrows",
  "borrow-through-zero": "columnSkillBorrowZero",
  "zero-result": "columnSkillZeroResult",
} as const satisfies Record<ColumnSkill, string>;

type Overview = Awaited<ReturnType<typeof readColumnOverview>>;

function ColumnTotals({ results }: { results: Overview["results"] }) {
  const { t } = useApp();
  const { number, percent } = useMetricFormat();
  const { presented, firstChecks, firstCorrect, firstAccuracy, independent, corrected, helped, skipped, unchecked, unfinished } = results;
  const ratio = (count: number, base: number) => base ? t("columnOutOf", { count: number(count), total: number(base) }) : "—";
  return <section className="card parent-section" aria-labelledby="column-results">
    <h2 id="column-results">{t("practiceTotals")}</h2>
    {!firstChecks && <p>{t("columnNoChecks")}</p>}
    {!!presented && <>
      <dl className="knowledge-counts column-report-counts">
        <div><dt>{t("columnFirstAccuracy")}</dt><dd>
          {firstAccuracy === null ? "—" : <>{percent(firstAccuracy)} <small>({ratio(firstCorrect, firstChecks)})</small></>}
        </dd></div>
        <div><dt>{t("columnIndependent")}</dt><dd>{ratio(independent, firstChecks)}</dd></div>
        <div><dt>{t("columnCorrected")}</dt><dd>{number(corrected)}</dd></div>
        <div><dt>{t("columnWithHelp")}</dt><dd>{ratio(helped, presented)}</dd></div>
      </dl>
      <p>{t("columnExampleCounts", {
        issued: number(presented), checked: number(firstChecks), unchecked: number(unchecked),
        skipped: number(skipped), unfinished: number(unfinished),
      })}</p>
      <details>
        <summary>{t("columnCountingTitle")}</summary>
        <p>{t("columnCountingChecks")}</p>
        <p>{t("columnCountingOther")}</p>
      </details>
    </>}
  </section>;
}

function ColumnSkills({ skills }: { skills: Overview["skills"] }) {
  const { t } = useApp();
  const { number, dates } = useColumnReportFormat();
  return <section className="card parent-section" aria-labelledby="column-skills">
    <h2 id="column-skills">{t("columnSkills")}</h2>
    <p>{t("columnDifficultyRule")}</p>
    <div className="column-report-disclosures">
      {skills.map(({ skill, checked, recent, misses, recurring, supportDays, proof }) => <details key={skill}>
        <summary>
          {t(skillMessages[skill])}
          <span className="column-report-note"> · {t(recurring ? "columnRecurring" : proof ? "columnVerified" :
            supportDays.length ? "columnBuildingEvidence" : "columnNoProof")}</span>
          {recurring && proof && <span className="column-report-note"> · {t("columnVerified")}</span>}
        </summary>
        {!checked ? <p>{t("columnNoChecks")}</p> : <>
          <p>{recent ? t("columnRecentMisses", { count: number(misses), total: number(recent) }) : t("columnNoFreshChecks")}</p>
          {proof ? <ColumnProofDetails proof={proof} /> : !!supportDays.length && <p>{t("columnSupportDates", { dates: dates(supportDays) })}</p>}
          {!proof && <p>{t("columnNoProof")}</p>}
        </>}
      </details>)}
    </div>
    <details>
      <summary>{t("columnReviewRuleTitle")}</summary>
      <p>{t("columnReviewRule")}</p>
    </details>
  </section>;
}

function TimingGroups({ operation }: { operation: ColumnOperation }) {
  const { t } = useApp();
  const { number, seconds, list } = useColumnReportFormat();
  const query = useParentRead(readColumnTiming, operation);
  const groups = query?.data;
  return <>
    <p>{t("columnTimingRule", { limit: number(columnTimingLimit) })}</p>
    {!groups ? <ParentReadStatus error={query?.error} /> :
      !groups.length ? <p>{t("columnNoTiming")}</p> : <dl className="column-timing-groups">
        {groups.map((group) => {
          const location = list(group.places.map((place) => t(placeMessages[place])));
          const pattern = group.zeroResult ? t("columnSkillZeroResult") :
            group.places.length ? t(operation === "addition" ? "columnPatternCarry" : "columnPatternBorrow", { places: location }) :
              t(operation === "addition" ? "columnSkillNoCarry" : "columnSkillNoBorrow");
          return <div key={group.key}>
            <dt>{pattern}{group.throughZero && ` · ${t("columnSkillBorrowZero")}`}</dt>
            <dd>{t("columnTimingSample", { time: seconds(group.medianMs), count: number(group.count),
              digits: number(group.resultDigits) })}</dd>
          </div>;
        })}
      </dl>}
  </>;
}

export function ParentColumnReport({ operation }: { operation: ColumnOperation }) {
  const { t } = useApp();
  const [showTiming, setShowTiming] = useState(false);
  const query = useParentRead(readColumnOverview, operation);
  return <>
    <PageHeading title={t("columnReportHeading", { operation: t(operationMessages[operation]) })} />
    <nav className="report-links" aria-label={t("columnChooseOperation")}>
      {(["addition", "subtraction"] as const).map((choice) =>
        <a className="button secondary" key={choice} href={routeHref("parent", columnReportRoutes[choice])} tabIndex={0}
          aria-current={operation === choice ? "page" : undefined}>{t(operationMessages[choice])}</a>)}
    </nav>
    {query?.data ? <>
      <ColumnTotals results={query.data.results} />
      <ColumnSkills skills={query.data.skills} />
    </> : <ParentReadStatus error={query?.error} />}
    <details className="card parent-section column-timing" onToggle={(event) => setShowTiming(event.currentTarget.open)}>
      <summary>{t("columnTiming")}</summary>
      {showTiming && <TimingGroups operation={operation} />}
    </details>
    <ParentColumnHistory operation={operation} />
  </>;
}
