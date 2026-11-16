import { useEffect, useRef, useState, type ReactNode } from "react";
import { useApp } from "../../app/AppContext";
import { routeHref, type AppMode } from "../../app/router";
import { Mascot } from "../../components/mascot/Mascot";
import { PageHeading } from "../../components/ui/PageHeading";
import { PART_SIZE, type SessionMode } from "../../engine/sessions/diagnostic";
import { ChildPracticeResult } from "../child/ChildPracticeResult";
import { LearningSummary } from "./LearningSummary";
import { PracticeQuestion } from "./PracticeQuestion";
import { useDiagnostic } from "./useDiagnostic";

export function Training({ mode = "diagnostic", targetPair, covered = false, appMode = "child" }: {
  mode?: SessionMode;
  targetPair?: string;
  covered?: boolean;
  appMode?: AppMode;
}) {
  const { t } = useApp();
  const { controller, active, session, paused, busy, loading, error, draft } = useDiagnostic(mode, targetPair, covered);
  const child = appMode === "child";
  const learning = session?.mode !== "diagnostic" ? session : null;
  const isLearning = mode !== "diagnostic";
  const home = routeHref(appMode, "home");
  const [systemKeyboard, setSystemKeyboard] = useState(false);
  const headingRef = useRef<HTMLHeadingElement>(null);
  const pausedQuestion = paused && session?.phase === "question";
  useEffect(() => {
    if (active && !loading && (pausedQuestion || session?.phase === "completed" || session?.phase === "break")) {
      headingRef.current?.focus({ preventScroll: true });
    }
  }, [active, loading, pausedQuestion, session?.id, session?.phase]);

  const title = t(child ? "childTables" : mode === "weak" ? "weak" : isLearning ? "dailyTitle" : "practiceTitle");
  const heading = child ? <h1 className="child-practice-title">{title}</h1> : (
    <PageHeading title={title} description={t(isLearning ? "dailyPlan" : "practiceDescription")} />
  );
  const panel = (content: ReactNode) => (
    <>
      {heading}
      <section className={`card empty-state${child ? " child-practice-panel" : ""}`}>{content}</section>
    </>
  );

  if (loading) return <>{heading}<p role="status">{t("loading")}</p></>;
  if (error) return panel(<>
    <p role="alert">{t("storageError")}</p>
    <button className="button primary" onClick={() => void controller.load()}>{t("retryLoad")}</button>
  </>);
  if (!session) return panel(<>
    <Mascot small state={child ? "greeting" : "thinking"} />
    <h2>{t(child ? "childReady" : isLearning ? "dailyTitle" : "diagnosticIntro")}</h2>
    {!child && <p>{t(isLearning ? "dailyPlan" : "diagnosticPlan")}</p>}
    <button className="button primary" disabled={busy || !active} onClick={() => void controller.start()}>
      {t(isLearning ? "startLearning" : "start")}
    </button>
  </>);
  if (learning?.phase === "completed") {
    if (child) return (
      <ChildPracticeResult session={learning} headingRef={headingRef} busy={busy || !active}
        onContinue={() => void controller.start()} />
    );
    return (
      <>
        {heading}
        <LearningSummary session={learning} headingRef={headingRef} />
        <button className="button primary" disabled={busy || !active} onClick={() => void controller.start()}>
          {t("newSession")}
        </button>
        <a className="finish-link" href={home}>{t("finish")}</a>
      </>
    );
  }
  if (session.phase === "completed") return panel(<>
    <h2 ref={headingRef} tabIndex={-1}>{t("diagnosticComplete")}</h2>
    <p>{t("noMastery")}</p>
    <a href={routeHref(appMode, child ? "achievements" : "diagnosis")} className="button primary">
      {t("viewResults")}
    </a>
  </>);
  if (session.phase === "break") return panel(<>
    <Mascot small state="thinking" />
    <h2 ref={headingRef} tabIndex={-1}>{t("partComplete", { part: String(session.cursor / PART_SIZE) })}</h2>
    <p>{t("breakHint")}</p>
    <button className="button primary" disabled={busy || !active} onClick={() => void controller.next()}>
      {t("nextPart")}
    </button>
    <a className="finish-link" href={home}>{t("finish")}</a>
  </>);
  if (pausedQuestion) return panel(<>
    <h2 ref={headingRef} tabIndex={-1}>{t("paused")}</h2>
    <p>{t(isLearning ? "learningSaved" : "savedProgress", { count: String(session.cursor) })}</p>
    <button className="button primary" disabled={busy || !active} onClick={() => void controller.resume()}>
      {t(isLearning ? "resumeLearning" : "resume")}
    </button>
    {learning && (
      <button className="keyboard-mode full-width" disabled={busy || !active} onClick={() => void controller.finish()}>
        {t("endSession")}
      </button>
    )}
    <a className="finish-link" href={home}>{t("finish")}</a>
  </>);
  return (
    <>
      {heading}
      <PracticeQuestion appMode={appMode} controller={controller} session={session} active={active} busy={busy} draft={draft}
        systemKeyboard={systemKeyboard} onToggleKeyboard={() => setSystemKeyboard((value) => !value)} />
    </>
  );
}
