import { useRef, useState } from "react";
import { useApp } from "../../app/AppContext";
import {
  columnHistoryStatuses, columnSessionStatus, readColumnHistory, readColumnSession,
} from "../../database/columnParentRead";
import { useParentRead } from "../../database/useParentRead";
import { columnWork, places, type ColumnOperation } from "../../engine/column/arithmetic";
import type { ColumnInput } from "../../engine/column/draft";
import type { ColumnSession } from "../../engine/column/session";
import { placeMessages } from "../column/columnLabels";
import { ColumnProofDetails } from "./ColumnProofDetails";
import { ParentReadStatus } from "./ParentReadStatus";
import { useColumnReportFormat } from "./useColumnReportFormat";

const statuses = {
  all: "allSessions", open: "inProgress", early: "columnEndedEarly", complete: "completed",
} as const;
type HistoryStatus = keyof typeof statuses;
const readHistoryPage = (key: string) => {
  const [operation, status, before] = key.split(":") as [ColumnOperation, HistoryStatus, string];
  return readColumnHistory(operation, status, Number(before));
};

function RecordedInput({ input, operation }: { input: ColumnInput; operation: ColumnOperation }) {
  const { t } = useApp();
  const { list, number } = useColumnReportFormat();
  const highest = input.digits.findLastIndex((digit) => digit !== null);
  const digits = places.filter((place) => place <= highest).reverse();
  const answer = highest === -1 ? t("columnNoDigits") : digits.some((place) => input.digits[place] === null)
    ? list(digits.map((place) => {
      const digit = input.digits[place];
      return t("columnRecordedPlace", { place: t(placeMessages[place]), digit: digit === null ? t("columnEmpty") : number(digit) });
    }))
    : digits.map((place) => number(input.digits[place]!)).join("");
  const marks = places.filter((place) => input.marks[place]).map((place) => t(placeMessages[place]));
  return <>
    <span>{t("columnRecordedAnswer", { answer })}</span>
    {!!marks.length && <span>{t(operation === "addition" ? "columnRecordedCarries" : "columnRecordedBorrows",
      { places: list(marks) })}</span>}
  </>;
}

function SessionDetails({ session, dates }: { session: ColumnSession; dates: Intl.DateTimeFormat }) {
  const { t } = useApp();
  const { number, seconds, day } = useColumnReportFormat();
  const query = useParentRead(readColumnSession, session.id);
  if (!query?.data) return query?.data === null ? <p>{t("notYet")}</p> : <ParentReadStatus error={query?.error} />;
  const { examples, proofs, activeMs } = query.data;
  const { operation, end } = session;
  const symbol = operation === "addition" ? "+" : "−";
  return <>
    {end && <p>{t("columnFinishedDate", { date: dates.format(end.at) })}</p>}
    <p>{t("columnActiveTime", { time: seconds(activeMs) })} · {t("columnSessionWithHelp", {
      count: number(examples.filter((example) => example.hintAt !== null).length), total: number(examples.length),
    })}</p>
    <ol className="column-history-examples">
      {examples.map(({ selection, checks, hintAt, skipped, activeMs, lastInput }, ordinal) => {
        const solved = checks.some((check) => check.correct);
        const { top, bottom } = selection.exercise;
        const lastCheck = checks.at(-1);
        const showDraft = !solved && lastInput && (lastInput.digits.some((digit, place) =>
          digit !== (lastCheck?.input.digits[place] ?? null)) ||
          lastInput.marks.some((mark, place) => mark !== (lastCheck?.input.marks[place] ?? false)));
        return <li key={ordinal}>
          <h3>{t("columnHistoryEquation", {
            exercise: `${number(top)} ${symbol} ${number(bottom)}`, answer: number(columnWork(selection.exercise).answer),
          })}</h3>
          <p>{t(solved ? "columnStatusSolved" : skipped ? "columnStatusSkipped" : "columnStatusUnfinished")}
            {" · "}{t("columnActiveTime", { time: seconds(activeMs) })}</p>
          <p>{hintAt === null ? t("columnWithoutHint") : t("columnHintDate", { date: dates.format(hintAt) })}</p>
          {selection.review && <p>{t("columnReviewOffered", {
            date: day(selection.review.issuedDay), hours: number((selection.review.issuedAt - selection.review.previousPractice.at) / 3_600_000),
          })}</p>}
          {!checks.length ? <p>{t("columnNoChecks")}</p> : <ol className="column-history-checks">
            {checks.map((check) => {
              const proof = proofs.get(check.id);
              const result = check.independent ? "columnCheckIndependent" : check.correct ? "columnCheckCorrect" : "columnCheckIncorrect";
              return <li key={check.id}>
                <strong>{t("columnCheckResult", { check: number(check.checkNumber), result: t(result) })}</strong>
                <span>{dates.format(check.at)} · {t("columnActiveAtCheck", { time: seconds(check.activeMs) })}</span>
                <RecordedInput input={check.input} operation={operation} />
                <span>{t(check.hintShown ? "columnHelpAtCheck" : "columnNoHelpAtCheck")}</span>
                {check.firstMismatch !== null && <span>{t("columnObservedMismatch", { place: t(placeMessages[check.firstMismatch]) })}</span>}
                {proof && <div className="column-history-proof">
                  <strong>{t("columnHistoricalVerification")}</strong>
                  <ColumnProofDetails proof={proof} />
                </div>}
              </li>;
            })}
          </ol>}
          {showDraft && <div className="column-history-draft">
            <strong>{t("columnLastDraft")}</strong>
            <RecordedInput input={lastInput} operation={operation} />
          </div>}
        </li>;
      })}
    </ol>
  </>;
}

function HistorySession({ session }: { session: ColumnSession }) {
  const { t, preferences } = useApp();
  const { number } = useColumnReportFormat();
  const [open, setOpen] = useState(false);
  const dates = new Intl.DateTimeFormat(preferences.language, {
    dateStyle: "medium", timeStyle: "short", timeZone: session.timeZone,
  });
  return <details className="column-history-session" onToggle={(event) => setOpen(event.currentTarget.open)}>
    <summary>
      <time dateTime={new Date(session.startedAt).toISOString()}>{dates.format(session.startedAt)}</time>
      <span className="column-report-note"> · {t(statuses[columnSessionStatus(session)])}
        {" · "}{t("columnSessionSolved", { count: number(session.summary.solved), total: number(session.order.length) })}</span>
    </summary>
    {open && <SessionDetails session={session} dates={dates} />}
  </details>;
}

export function ParentColumnHistory({ operation }: { operation: ColumnOperation }) {
  const { t } = useApp();
  const [status, setStatus] = useState<HistoryStatus>("all");
  const [pages, setPages] = useState([Infinity]);
  const heading = useRef<HTMLHeadingElement>(null);
  const query = useParentRead(readHistoryPage, `${operation}:${status}:${pages.at(-1)}`);
  const data = query?.data;
  function changePage(cursors: number[]) {
    heading.current?.focus();
    setPages(cursors);
  }
  return <section className="card parent-section" aria-labelledby="column-history">
    <h2 id="column-history" ref={heading} tabIndex={-1}>{t("sessionHistory")}</h2>
    <label className="history-filter">
      {t("columnSessionStatus")}
      <select value={status} onChange={(event) => {
        setStatus(event.target.value as HistoryStatus);
        setPages([Infinity]);
      }}>
        {(["all", ...columnHistoryStatuses] as const).map((value) =>
          <option key={value} value={value}>{t(statuses[value])}</option>)}
      </select>
    </label>
    {!data ? <ParentReadStatus error={query?.error} /> :
      !data.sessions.length ? <p>{t("columnNoSessions")}</p> :
        <div className="column-report-disclosures">
          {data.sessions.map((session) => <HistorySession key={session.id} session={session} />)}
        </div>}
    {(pages.length > 1 || data?.older) && <div className="report-links column-history-pages">
      {pages.length > 1 && <button type="button" className="button secondary"
        onClick={() => changePage(pages.slice(0, -1))}>{t("columnNewerSessions")}</button>}
      {!!data?.older && <button type="button" className="button secondary"
        onClick={() => changePage([...pages, data.older!])}>{t("columnOlderSessions")}</button>}
    </div>}
  </section>;
}
