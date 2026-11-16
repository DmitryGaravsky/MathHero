import { useState } from "react";
import { useApp } from "../../app/AppContext";
import { routeHref } from "../../app/router";
import { PageHeading } from "../../components/ui/PageHeading";
import { readHistory, readSessionAttempts } from "../../database/parentReadModel";
import { useParentRead } from "../../database/useParentRead";
import type { Session } from "../../engine/learning/session";
import { History } from "../statistics/History";
import { ParentReadStatus } from "./ParentReadStatus";

const modes = { adaptive: "training", weak: "weakSpots", diagnostic: "diagnosticLink" } as const;

function SessionAttempts({ id }: { id: string }) {
  const query = useParentRead(readSessionAttempts, id);
  return query?.data ? <History attempts={query.data} /> : <ParentReadStatus error={query?.error} />;
}

function HistorySession({ session }: { session: Session }) {
  const { t, preferences } = useApp();
  const [expanded, setExpanded] = useState(false);
  const pending = session.completedAt === null;
  const date = new Intl.DateTimeFormat(preferences.language, { dateStyle: "medium", timeStyle: "short" });
  const number = new Intl.NumberFormat(preferences.language);
  return <details className="session-history" onToggle={(event) => setExpanded(event.currentTarget.open)}>
    <summary>
      <strong>{t(modes[session.mode])}</strong> · {date.format(session.startedAt)} · {number.format(session.cursor)} · {t(pending ? "inProgress" : "completed")}
    </summary>
    {expanded && <>
      {pending && <a className="text-link" href={session.mode === "diagnostic" ? routeHref("parent", "diagnostic")
        : routeHref("parent", session.mode === "adaptive" ? "training" : "weak", session.targetPair)}>
        {t(session.mode === "diagnostic" ? "resume" : "resumeLearning")}
      </a>}
      {session.mode !== "diagnostic" && <p>{t("improvedCount", { count: number.format(session.summary.improvedPairs.length) })}</p>}
      <SessionAttempts id={session.id} />
    </>}
  </details>;
}

export function ParentHistory() {
  const { t } = useApp();
  const [mode, setMode] = useState("");
  const [limit, setLimit] = useState(20);
  const query = useParentRead(readHistory, mode);
  return <>
    <PageHeading title={t("sessionHistory")} />
    <section className="card">
      <label className="history-filter">{t("sessionType")}
        <select value={mode} onChange={(event) => {
          setMode(event.target.value);
          setLimit(20);
        }}>
          <option value="">{t("allSessions")}</option>
          {Object.entries(modes).map(([key, message]) => <option value={key} key={key}>{t(message)}</option>)}
        </select>
      </label>
      {!query?.data ? <ParentReadStatus error={query?.error} /> :
        !query.data.length ? <p>{t("notYet")}</p> : <>
          {query.data.slice(0, limit).map((session) => <HistorySession session={session} key={session.id} />)}
          {query.data.length > limit && <button type="button" className="button secondary" onClick={() => setLimit((value) => value + 20)}>{t("showMore")}</button>}
        </>}
    </section>
  </>;
}
