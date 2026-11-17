import { useEffect, useRef } from "react";
import { useApp } from "../../app/AppContext";
import { NumericKeypad } from "../../components/ui/NumericKeypad";
import { digitAt, places, type Place } from "../../engine/column/arithmetic";
import { canMark, evaluateColumnAnswer, type ColumnEdit } from "../../engine/column/draft";
import { columnPolicy } from "../../engine/column/policy";
import type { ColumnSession } from "../../engine/column/session";
import type { ColumnController } from "./ColumnController";
import { ColumnExplanation } from "./ColumnExplanation";
import { placeMessages, shortPlaceMessages } from "./columnLabels";

export function ColumnExercise({ controller, session, busy, hintOpen }: {
  controller: ColumnController; session: ColumnSession; busy: boolean; hintOpen: boolean;
}) {
  const { t } = useApp();
  const exercise = session.order.at(-1)!.exercise;
  const draft = session.draft!;
  const addition = exercise.operation === "addition";
  const maxPlace = addition ? 3 : 2;
  const columns = places.slice(0, maxPlace + 1).reverse();
  const editing = !busy && draft.phase === "answering";
  const hasDigits = draft.digits.some((digit) => digit !== null);
  const mismatch = draft.phase === "incorrect" ? evaluateColumnAnswer(exercise, draft.digits).firstMismatch : null;
  const symbol = addition ? "+" : "−";
  const form = useRef<HTMLFormElement>(null);
  const answers = useRef<(HTMLButtonElement | null)[]>([]);
  const feedbackButton = useRef<HTMLButtonElement>(null);
  const phase = draft.phase;
  const ordinal = session.order.length;

  function selectPlace(place: Place) {
    if (controller.getSnapshot().session?.draft?.activePlace !== place) {
      controller.edit({ type: "select", place });
    }
  }

  function keypadEdit(edit: ColumnEdit) {
    const focusWasOnCell = document.activeElement?.matches(".column-answer");
    controller.edit(edit);
    const next = controller.getSnapshot().session?.draft?.activePlace;
    if (focusWasOnCell && next !== undefined) answers.current[next]?.focus({ preventScroll: true });
  }

  useEffect(() => {
    if (busy || hintOpen) return;
    const focused = document.activeElement;
    if (focused && focused !== document.body && focused.id !== "main-content" && !form.current?.contains(focused)) return;
    const place = controller.getSnapshot().session?.draft?.activePlace;
    const control = phase === "answering" && place !== undefined ? answers.current[place] : feedbackButton.current;
    control?.focus({ preventScroll: true });
  }, [controller, busy, hintOpen, phase, ordinal]);

  useEffect(() => {
    if (!editing) return;
    function handleKey(event: KeyboardEvent) {
      if (event.defaultPrevented || event.ctrlKey || event.altKey || event.metaKey || event.isComposing) return;
      const target = event.target;
      if (!(target instanceof HTMLElement)) return;
      const cell = target.matches(".column-answer");
      const surface = target === document.body || target === form.current || target.id === "main-content";
      if (!cell && !surface && !target.closest(".column-board, .keypad")) return;
      if (!surface && !form.current?.contains(target)) return;
      const active = controller.getSnapshot().session?.draft?.activePlace;
      if (active === undefined) return;
      let edit: ColumnEdit;
      if (/^[0-9]$/.test(event.key)) edit = { type: "digit", digit: Number(event.key) };
      else if (event.key === "Backspace" || event.key === "Delete") edit = { type: "erase" };
      else if ((cell || surface) && (event.key === "ArrowLeft" || event.key === "ArrowRight")) {
        const offset = event.key === "ArrowLeft" ? 1 : -1;
        edit = { type: "select", place: Math.max(0, Math.min(maxPlace, active + offset)) as Place };
      } else {
        if ((cell || surface) && event.key === "Enter") {
          event.preventDefault();
          void controller.act("check");
        }
        return;
      }
      event.preventDefault();
      controller.edit(edit);
      const next = controller.getSnapshot().session?.draft?.activePlace;
      if (cell && next !== undefined) answers.current[next]?.focus({ preventScroll: true });
    }
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [controller, editing, maxPlace]);

  return (
    <form ref={form} className="column-form" onSubmit={(event) => {
      event.preventDefault();
      void controller.act("check");
    }}>
      <div className="column-problem">
        <div className="column-board" data-operation={exercise.operation} role="group"
          aria-label={t("columnProblem", { top: String(exercise.top), bottom: String(exercise.bottom), symbol })}>
          <span aria-hidden="true" />
          {columns.map((place) => <span key={place} className="column-place" aria-hidden="true">{t(shortPlaceMessages[place])}</span>)}
          <span aria-hidden="true" />
          {columns.map((place) => {
            const digit = place === 3 ? "" : digitAt(exercise.top, place);
            const contents = <><span className="column-note" aria-hidden="true">{draft.marks[place] ? (addition ? "1" : "•") : ""}</span>
              <span aria-hidden="true">{digit}</span></>;
            return canMark(exercise.operation, place) ? (
              <button key={place} type="button" className="column-upper" data-column-mark={place}
                aria-label={t(addition ? "columnCarryMark" : "columnBorrowMark", {
                  place: t(placeMessages[place]), digit: String(digit),
                })}
                aria-pressed={draft.marks[place]} disabled={!editing}
                onClick={() => controller.edit({ type: "toggle-mark", place })}>
                {contents}
              </button>
            ) : <span key={place} className="column-upper" aria-hidden="true">{contents}</span>;
          })}
          <span aria-hidden="true">{symbol}</span>
          {columns.map((place) => <span key={place} aria-hidden="true">{place === 3 ? "" : digitAt(exercise.bottom, place)}</span>)}
          <span className="column-rule" aria-hidden="true" />
          <span aria-hidden="true" />
          {columns.map((place) => (
            <button key={place} type="button" className="column-answer" data-column-place={place}
              data-mismatch={mismatch === place}
              ref={(element) => { answers.current[place] = element; }}
              disabled={!editing} aria-current={draft.activePlace === place && phase === "answering" ? "step" : undefined}
              aria-label={t("columnCell", {
                place: t(placeMessages[place]), digit: draft.digits[place]?.toString() ?? t("columnEmpty"),
              })}
              onFocus={() => selectPlace(place)}
              onClick={() => selectPlace(place)}>
              {draft.digits[place]}
            </button>
          ))}
        </div>
        <p className="column-status" role="status" data-correct={phase === "correct"} data-incorrect={mismatch !== null}>
          {phase === "correct" ? t("correct") : mismatch !== null ?
            t("columnMismatch", { place: t(placeMessages[mismatch]) }) :
            t("columnActivePlace", { place: t(placeMessages[draft.activePlace]) })}
        </p>
      </div>
      <div className="column-controls">
        {phase === "answering" ? (
          <NumericKeypad disabled={busy} canErase={hasDigits} canSubmit={hasDigits}
            onDigit={(digit) => keypadEdit({ type: "digit", digit: Number(digit) })}
            onErase={() => keypadEdit({ type: "erase" })} />
        ) : (
          <button ref={feedbackButton} type="button" className="button primary full-width" disabled={busy}
            onClick={() => void controller.act(phase === "correct" ? "advance" : "retry")}>
            {t(phase === "incorrect" ? "columnRetry" : ordinal === columnPolicy.sessionLength ? "viewSummary" : "next")}
          </button>
        )}
        {phase !== "correct" && <button type="button" className="button secondary column-hint-button" disabled={busy}
          aria-expanded={hintOpen} aria-controls={hintOpen ? "column-explanation" : undefined}
          onClick={() => controller.toggleHint()}>
          {t(hintOpen ? "columnHideHint" : draft.hintShown ? "columnExplanation" : "columnHint")}
        </button>}
      </div>
      {hintOpen && <ColumnExplanation exercise={exercise} />}
    </form>
  );
}
