import { useApp } from "../../app/AppContext";
import type { ColumnProof } from "../../database/columnParentRead";
import { useColumnReportFormat } from "./useColumnReportFormat";

export function ColumnProofDetails({ proof }: { proof: ColumnProof }) {
  const { t } = useApp();
  const { dates, day, number } = useColumnReportFormat();
  return <>
    <p>{t("columnSupportDates", { dates: dates(proof.supportDays) })}</p>
    <p>{t("columnReviewDates", {
      review: day(proof.reviewedDay), previous: day(proof.lastPracticeDay), hours: number(proof.gapMs / 3_600_000),
    })}</p>
  </>;
}
