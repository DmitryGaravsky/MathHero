import { useEffect, useRef, useState, type KeyboardEvent } from "react";
import { flushSync } from "react-dom";
import { useApp } from "../../app/AppContext";
import { Mascot } from "../../components/mascot/Mascot";
import { NumericKeypad } from "../../components/ui/NumericKeypad";
import { PageHeading } from "../../components/ui/PageHeading";
import { useDiagnostic } from "./useDiagnostic";
import { getFact } from "../../engine/multiplication/facts";
import { normalizeAnswer } from "./answerInput";

export function Training() {
  const { t } = useApp();
  const {
    controller,
    session,
    paused,
    busy,
    loading,
    error,
    draft: answer,
  } = useDiagnostic();
  const submitted = session?.phase === "feedback" ? session.lastAttempt : null;
  const setAnswer = (value: string | ((previous: string) => string)) =>
    controller.setDraft(typeof value === "function" ? value(answer) : value);
  const [systemKeyboard, setSystemKeyboard] = useState(false);
  const input = useRef<HTMLInputElement>(null);
  const retry = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    if (submitted !== null) retry.current?.focus();
  }, [submitted]);
  useEffect(() => {
    if (session?.phase === "question" && !paused && !busy) {
      input.current?.focus({ preventScroll: true });
    }
  }, [session?.phase, session?.cursor, paused, busy]);

  function handleKeyDown(event: KeyboardEvent<HTMLFormElement>) {
    if (
      submitted !== null ||
      event.ctrlKey ||
      event.metaKey ||
      event.altKey ||
      event.nativeEvent.isComposing
    )
      return;
    // Native editable input owns its events. The form handles physical keys elsewhere.
    if (event.target === input.current) return;
    if (/^[0-9]$/.test(event.key)) {
      event.preventDefault();
      setAnswer((value) => normalizeAnswer(value + event.key));
    } else if (event.key === "Backspace" || event.key === "Delete") {
      event.preventDefault();
      setAnswer((value) => (event.key === "Delete" ? "" : value.slice(0, -1)));
    } else if (
      event.key === "Enter" &&
      (event.target as HTMLElement).closest(".keypad")
    ) {
      event.preventDefault();
      if (answer) void controller.submit();
    }
    // On keypad buttons Enter confirms; on mode controls native activation is retained.
  }

  const heading = (
    <PageHeading
      title={t("practiceTitle")}
      description={t("practiceDescription")}
    />
  );
  if (loading)
    return (
      <>
        {heading}
        <p role="status">{t("loading")}</p>
      </>
    );
  if (error)
    return (
      <>
        {heading}
        <section className="card empty-state">
          <p role="alert">{t("storageError")}</p>
          <button
            className="button primary"
            onClick={() => void controller.load()}
          >
            {t("retryLoad")}
          </button>
        </section>
      </>
    );
  if (!session)
    return (
      <>
        {heading}
        <section className="card empty-state">
          <Mascot small />
          <h2>{t("diagnosticIntro")}</h2>
          <p>{t("diagnosticPlan")}</p>
          <button
            className="button primary"
            disabled={busy}
            onClick={() => void controller.start()}
          >
            {t("start")}
          </button>
        </section>
      </>
    );
  if (session.phase === "completed")
    return (
      <>
        {heading}
        <section className="card empty-state">
          <h2>{t("diagnosticComplete")}</h2>
          <p>{t("noMastery")}</p>
          <a href="#results" className="button primary">
            {t("viewResults")}
          </a>
        </section>
      </>
    );
  if (session.phase === "break")
    return (
      <>
        {heading}
        <section className="card empty-state">
          <Mascot small />
          <h2>{t("partComplete", { part: String(session.cursor / 24) })}</h2>
          <p>{t("breakHint")}</p>
          <button
            className="button primary"
            disabled={busy}
            onClick={() => void controller.next()}
          >
            {t("nextPart")}
          </button>
          <a className="finish-link" href="#home">
            {t("finish")}
          </a>
        </section>
      </>
    );
  if (paused && !submitted)
    return (
      <>
        {heading}
        <section className="card empty-state">
          <h2>{t("paused")}</h2>
          <p>{t("savedProgress", { count: String(session.cursor) })}</p>
          <button
            className="button primary"
            disabled={busy}
            onClick={() => void controller.resume()}
          >
            {t("resume")}
          </button>
          <a className="finish-link" href="#home">
            {t("finish")}
          </a>
        </section>
      </>
    );
  const fact = getFact(submitted?.exerciseId ?? session.order[session.cursor]!);
  const questionNumber = submitted ? session.cursor : session.cursor + 1;
  return (
    <>
      <PageHeading
        title={t("practiceTitle")}
        description={t("practiceDescription")}
      />
      <div className="training-layout">
        <section className="card exercise-card">
          <p className="eyebrow">
            {t("diagnosticProgress", {
              part: String(Math.ceil(questionNumber / 24)),
              question: String(((questionNumber - 1) % 24) + 1),
            })}
          </p>
          <div
            className="equation"
            aria-label={`${fact.operands[0]} × ${fact.operands[1]}`}
          >
            {fact.operands[0]} <span>×</span> {fact.operands[1]} <span>=</span>{" "}
            ?
          </div>
          <form
            onKeyDown={handleKeyDown}
            onSubmit={(event) => {
              event.preventDefault();
              if (answer && submitted === null) void controller.submit();
            }}
          >
            <label className="answer-label" htmlFor="answer">
              {t("answer")}
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
              value={submitted ? String(submitted.answer) : answer}
              disabled={submitted !== null || busy}
              aria-describedby="answer-hint"
              onChange={(event) =>
                setAnswer(normalizeAnswer(event.target.value))
              }
            />
            <p id="answer-hint" className="input-hint">
              {t("answerHint")}
            </p>
            {submitted === null ? (
              <>
                {!systemKeyboard && (
                  <NumericKeypad
                    onDigit={(digit) =>
                      setAnswer((value) => normalizeAnswer(value + digit))
                    }
                    onErase={() => setAnswer((value) => value.slice(0, -1))}
                    canSubmit={answer.length > 0 && !busy}
                  />
                )}
                {systemKeyboard && (
                  <button
                    className="button primary full-width"
                    type="submit"
                    disabled={!answer || busy}
                  >
                    {t("confirm")}
                  </button>
                )}
                <button
                  type="button"
                  className="keyboard-mode"
                  onClick={() => {
                    flushSync(() => setSystemKeyboard((value) => !value));
                    input.current?.focus();
                  }}
                >
                  {t(systemKeyboard ? "customKeyboard" : "systemKeyboard")}
                </button>
              </>
            ) : (
              <div className="input-feedback">
                <p role="status">
                  {submitted.correct
                    ? t("correct")
                    : t("incorrect", {
                        answer: String(submitted.expectedAnswer),
                      })}
                </p>
                <button
                  ref={retry}
                  type="button"
                  className="button primary full-width"
                  disabled={busy}
                  onClick={() => {
                    void controller.next();
                  }}
                >
                  {t(session.cursor === 144 ? "viewSummary" : "next")}
                </button>
              </div>
            )}
          </form>
          {!submitted && (
            <button
              type="button"
              className="keyboard-mode full-width"
              disabled={busy}
              onClick={() => void controller.pause()}
            >
              {t("pause")}
            </button>
          )}
          <a className="finish-link" href="#home">
            {t("finish")}
          </a>
        </section>
        <aside className="practice-aside">
          <Mascot small />
          <h2>{t("practiceAsideTitle")}</h2>
          <p>{t("practiceAside")}</p>
        </aside>
      </div>
    </>
  );
}
