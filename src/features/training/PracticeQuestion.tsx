import { useEffect, useLayoutEffect, useRef, useState, type KeyboardEvent } from "react";
import { flushSync } from "react-dom";
import { useApp } from "../../app/AppContext";
import { routeHref, type AppMode } from "../../app/router";
import { Mascot } from "../../components/mascot/Mascot";
import { Icon } from "../../components/ui/Icon";
import { NumericKeypad } from "../../components/ui/NumericKeypad";
import { type Session } from "../../engine/learning/session";
import { sessionStage } from "../../engine/learning/scheduler";
import { getFact } from "../../engine/multiplication/facts";
import { PART_SIZE } from "../../engine/sessions/diagnostic";
import type { DiagnosticController } from "./DiagnosticController";
import { normalizeAnswer } from "./answerInput";

type Correction = { attemptId: string; draft: string; state: "edit" | "retry" | "done" };

export function PracticeQuestion({ appMode, controller, session, active, busy, draft, systemKeyboard, onToggleKeyboard }: {
  appMode: AppMode;
  controller: DiagnosticController<Session>;
  session: Session;
  active: boolean;
  busy: boolean;
  draft: string;
  systemKeyboard: boolean;
  onToggleKeyboard: () => void;
}) {
  const { t } = useApp();
  const child = appMode === "child";
  const learning = session.mode !== "diagnostic";
  const submitted = session.phase === "feedback" ? session.lastAttempt : null;
  const number = submitted ? session.cursor : session.cursor + 1;
  const total = learning ? session.total : session.order.length;
  const fact = getFact(submitted?.exerciseId ?? session.order[session.cursor]!);
  const [correction, setCorrection] = useState<Correction>();
  const currentCorrection = correction?.attemptId === submitted?.id ? correction : undefined;
  const correcting = currentCorrection !== undefined && currentCorrection.state !== "done";
  const editing = !submitted || correcting;
  const answer = correcting ? currentCorrection.draft : draft;
  const card = useRef<HTMLElement>(null);
  const input = useRef<HTMLInputElement>(null);
  const next = useRef<HTMLButtonElement>(null);

  useLayoutEffect(() => {
    if (child && active && session.phase === "question" && !systemKeyboard) window.scrollTo(0, 0);
  }, [child, active, session.id, session.phase, session.cursor, systemKeyboard]);

  useEffect(() => {
    const focused = document.activeElement;
    if (!active || busy || (focused && focused !== document.body &&
      focused.id !== "main-content" && !card.current?.contains(focused))) return;
    (editing ? input : next).current?.focus({ preventScroll: true });
  }, [active, busy, editing, session.phase, session.cursor]);

  function setAnswer(value: string) {
    if (!active || busy) return;
    if (correcting) setCorrection({ ...currentCorrection, draft: value, state: "edit" });
    else controller.setDraft(value);
  }

  function submit() {
    if (!active || busy || !answer || !editing) return;
    if (correcting) {
      setCorrection({ ...currentCorrection, state: Number(answer) === fact.expectedAnswer ? "done" : "retry" });
    } else {
      void controller.submit();
    }
  }

  function handleKeyDown(event: KeyboardEvent<HTMLFormElement>) {
    if (!editing || event.ctrlKey || event.metaKey || event.altKey || event.nativeEvent.isComposing) return;
    // Native editable input owns its events. The form handles physical keys elsewhere.
    if (event.target === input.current) return;
    if (/^[0-9]$/.test(event.key)) {
      event.preventDefault();
      setAnswer(normalizeAnswer(answer + event.key));
    } else if (event.key === "Backspace" || event.key === "Delete") {
      event.preventDefault();
      setAnswer(event.key === "Delete" ? "" : answer.slice(0, -1));
    } else if (event.key === "Enter" && (event.target as HTMLElement).closest(".keypad")) {
      event.preventDefault();
      submit();
    }
  }

  return (
    <div className={child ? "child-practice" : "training-layout"}>
      <section className="card exercise-card" ref={card}>
        <div className="question-progress">
          <p className="eyebrow">
            {child ? t("childQuestionProgress", { question: String(number), total: String(total) }) :
              learning ? t("learningProgress", {
                question: String(number), total: String(total), stage: t(sessionStage(number - 1, total)),
              }) : t("diagnosticProgress", {
                part: String(Math.ceil(number / PART_SIZE)),
                question: String(((number - 1) % PART_SIZE) + 1),
              })}
          </p>
          {child && <progress max={total} value={submitted ? number : number - 1} aria-label={t("childProgress")} />}
        </div>
        <form onKeyDown={handleKeyDown} onSubmit={(event) => { event.preventDefault(); submit(); }}>
          <div className="question-problem">
            <div className="equation" aria-label={`${fact.operands[0]} × ${fact.operands[1]}`}>
              {fact.operands[0]} <span>×</span> {fact.operands[1]} <span>=</span>{" "}
              {child && submitted ? fact.expectedAnswer : "?"}
            </div>
            <label className="answer-label" htmlFor="answer">
              {t(correcting ? "childCopyAnswer" : "answer")}
            </label>
            <input
              ref={input}
              id="answer"
              className="answer-input"
              type="text"
              inputMode={systemKeyboard ? "numeric" : "none"}
              pattern="[0-9]*"
              autoComplete="off"
              autoCorrect="off"
              spellCheck={false}
              enterKeyHint="done"
              value={editing ? answer : String(currentCorrection ? fact.expectedAnswer : submitted?.answer)}
              disabled={!editing || busy || !active}
              aria-describedby="answer-hint"
              onChange={(event) => setAnswer(normalizeAnswer(event.target.value))}
            />
            <p id="answer-hint" className="input-hint">{t("answerHint")}</p>
          </div>
          <div className="question-controls">
            {editing ? (
              <>
                {currentCorrection?.state === "retry" && <p role="status">{t("childCopyRetry")}</p>}
                {!systemKeyboard ? (
                  <NumericKeypad
                    onDigit={(digit) => setAnswer(normalizeAnswer(answer + digit))}
                    onErase={() => setAnswer(answer.slice(0, -1))}
                    canSubmit={answer.length > 0 && !busy && active}
                  />
                ) : (
                  <button className="button primary full-width" type="submit" disabled={!answer || busy || !active}>
                    {t("confirm")}
                  </button>
                )}
                <button type="button" className="keyboard-mode" onClick={() => {
                  flushSync(onToggleKeyboard);
                  input.current?.focus();
                }}>
                  {t(systemKeyboard ? "customKeyboard" : "systemKeyboard")}
                </button>
              </>
            ) : (
              <div className="input-feedback" data-correct={submitted?.correct}>
                <p role="status">
                  {submitted?.correct && <Icon name="check" />}
                  {t(submitted?.correct ? "correct" : currentCorrection ? "childCorrectionDone" : "incorrect", {
                    answer: String(fact.expectedAnswer),
                  })}
                </p>
                <button ref={next} type="button" className="button primary full-width" disabled={busy || !active}
                  onClick={() => void controller.next()}>
                  {t(number === total ? "viewSummary" : "next")}
                </button>
                {child && !submitted?.correct && !currentCorrection && (
                  <button type="button" className="keyboard-mode" disabled={busy || !active}
                    onClick={() => setCorrection({ attemptId: submitted!.id, draft: "", state: "edit" })}>
                    {t("childTryCorrection")}
                  </button>
                )}
              </div>
            )}
          </div>
        </form>
        <div className="practice-actions">
          {!submitted && (
            <button type="button" className="keyboard-mode" disabled={busy || !active} onClick={() => void controller.pause()}>
              {t("pause")}
            </button>
          )}
          {correcting && (
            <button type="button" className="keyboard-mode" disabled={busy || !active} onClick={() => void controller.next()}>
              {t(number === total ? "viewSummary" : "next")}
            </button>
          )}
          {learning && (
            <button type="button" className="keyboard-mode" disabled={busy || !active} onClick={() => void controller.finish()}>
              {t("endSession")}
            </button>
          )}
          <a className="finish-link" href={routeHref(appMode, "home")}>
            {t(child ? "childSaveAndExit" : "finish")}
          </a>
        </div>
      </section>
      {!child && (
        <aside className="practice-aside">
          <Mascot small state={submitted ? (submitted.correct ? "happy" : "support") : "thinking"} />
          <h2>{t("practiceAsideTitle")}</h2>
          <p>{t("practiceAside")}</p>
        </aside>
      )}
    </div>
  );
}
