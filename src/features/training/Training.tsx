import { useEffect, useRef, useState, type KeyboardEvent } from "react";
import { flushSync } from "react-dom";
import { useApp } from "../../app/AppContext";
import { Mascot } from "../../components/mascot/Mascot";
import { NumericKeypad } from "../../components/ui/NumericKeypad";
import { PageHeading } from "../../components/ui/PageHeading";
import { normalizeAnswer } from "./answerInput";

// This input playground deliberately has no scoring, timing, session, or mastery logic.
export function Training() {
  const { t } = useApp();
  const [answer, setAnswer] = useState("");
  const [submitted, setSubmitted] = useState<string | null>(null);
  const [systemKeyboard, setSystemKeyboard] = useState(false);
  const input = useRef<HTMLInputElement>(null);
  const retry = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    if (submitted !== null) retry.current?.focus();
  }, [submitted]);

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
      if (answer) setSubmitted(answer);
    }
    // On keypad buttons Enter confirms; on mode controls native activation is retained.
  }

  return (
    <>
      <PageHeading
        title={t("practiceTitle")}
        description={t("practiceDescription")}
      />
      <div className="training-layout">
        <section className="card exercise-card">
          <p className="eyebrow">{t("sample")}</p>
          <div className="equation" aria-label="7 × 8">
            7 <span>×</span> 8 <span>=</span> ?
          </div>
          <form
            onKeyDown={handleKeyDown}
            onSubmit={(event) => {
              event.preventDefault();
              if (answer && submitted === null) setSubmitted(answer);
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
              value={answer}
              disabled={submitted !== null}
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
                    canSubmit={answer.length > 0}
                  />
                )}
                {systemKeyboard && (
                  <button
                    className="button primary full-width"
                    type="submit"
                    disabled={!answer}
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
                <p role="status">{t("received", { answer: submitted })}</p>
                <button
                  ref={retry}
                  type="button"
                  className="button primary full-width"
                  onClick={() => {
                    setSubmitted(null);
                    setAnswer("");
                    requestAnimationFrame(() => input.current?.focus());
                  }}
                >
                  {t("tryAgain")}
                </button>
              </div>
            )}
          </form>
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
