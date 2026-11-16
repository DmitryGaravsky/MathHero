import { useLayoutEffect, useRef } from "react";
import { useApp } from "../../app/AppContext";
import { routeHref } from "../../app/router";
import type { ColumnRepository } from "../../database/columnRepository";
import type { ColumnOperation } from "../../engine/column/arithmetic";
import { columnPolicy } from "../../engine/column/policy";
import type { ColumnController } from "./ColumnController";
import { ColumnExercise } from "./ColumnExercise";
import { operationMessages } from "./columnLabels";
import { useColumnPractice } from "./useColumnPractice";

export function ColumnPractice({ controller, repository, operation, covered, takeEntry }: {
  controller: ColumnController;
  repository: ColumnRepository;
  operation: ColumnOperation;
  covered: boolean;
  takeEntry: (operation: ColumnOperation) => boolean;
}) {
  const { t } = useApp();
  const { status, session, busy, hintOpen, canActOnPausedDraft } = useColumnPractice(controller, repository, operation, covered, takeEntry);
  const disabled = busy || covered;
  const chooser = routeHref("child", "columns");
  const departure = useRef(0);
  useLayoutEffect(() => () => { departure.current++; }, [covered]);

  async function saveAndExit() {
    const visit = departure.current;
    const hash = window.location.hash;
    if (await controller.pause() && departure.current === visit && window.location.hash === hash) {
      window.location.hash = chooser;
    }
  }

  return (
    <section className="column-practice">
      <h1 className="column-practice-title">{t(operationMessages[operation])}</h1>
      {status === "active" && session?.draft ? (
        <div className="card column-card">
          <p className="column-progress">{t("columnProgress", {
            question: String(session.order.length), total: String(columnPolicy.sessionLength),
          })}</p>
          <ColumnExercise controller={controller} session={session} busy={disabled} hintOpen={hintOpen} />
          <div className="column-actions">
            <button type="button" className="keyboard-mode" disabled={disabled} onClick={() => void controller.pause()}>{t("pause")}</button>
            <button type="button" className="keyboard-mode" disabled={disabled} onClick={() => void saveAndExit()}>{t("childSaveAndExit")}</button>
          </div>
        </div>
      ) : (
        <div className="card column-landing">
          {status === "loading" ? <p role="status">{t("loading")}</p> :
            status === "stale" || status === "error" ? <>
              <p role="alert">{t(status === "stale" ? "columnStale" : "storageError")}</p>
              <button type="button" className="button primary" disabled={disabled} onClick={() => void controller.load()}>{t("retryLoad")}</button>
            </> : <>
              <h2>{t(status === "complete" ? "columnComplete" : status === "paused" ? "paused" : "childReady")}</h2>
              {status === "complete" && session && (
                <p>{t("columnSolved", { solved: String(session.summary.solved) })}</p>
              )}
              {status === "paused" && <p>{t("columnSaved")}</p>}
              <button type="button" className="button primary" disabled={disabled} onClick={() => void controller.enter()}>
                {t(status === "paused" ? "resumeLearning" : status === "complete" ? "newSession" : "startLearning")}
              </button>
            </>}
          <a className="button secondary" href={chooser}>{t("columnChooseOperation")}</a>
          {canActOnPausedDraft && <div className="column-actions">
            {session?.draft?.phase !== "correct" && <button type="button" className="keyboard-mode" disabled={disabled}
              onClick={() => void controller.actOnPausedDraft("skip")}>{t("columnSkip")}</button>}
            <button type="button" className="keyboard-mode" disabled={disabled}
              onClick={() => void controller.actOnPausedDraft("finish")}>{t("endSession")}</button>
          </div>}
        </div>
      )}
    </section>
  );
}
