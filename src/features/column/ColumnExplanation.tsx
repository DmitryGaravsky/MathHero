import { useEffect, useRef } from "react";
import { useApp } from "../../app/AppContext";
import { columnWork, type ColumnExercise } from "../../engine/column/arithmetic";
import { placeMessages } from "./columnLabels";

export function ColumnExplanation({ exercise }: { exercise: ColumnExercise }) {
  const { t } = useApp();
  const heading = useRef<HTMLHeadingElement>(null);
  useEffect(() => { heading.current?.focus(); }, []);
  const work = columnWork(exercise);
  const crossesZero = work.operation === "subtraction" &&
    work.steps.some(({ topDigit, lentToLower, borrowFromHigher }) => topDigit === 0 && lentToLower && borrowFromHigher);

  return (
    <section id="column-explanation" className="column-explanation" aria-labelledby="column-hint-title">
      <h2 id="column-hint-title" ref={heading} tabIndex={-1}>{t("columnExplanation")}</h2>
      {crossesZero && <p>{t("columnBorrowZero")}</p>}
      <ol>
        {work.operation === "addition" ? work.steps.map(({ place, topDigit, bottomDigit, carryIn, carryOut, sum, resultDigit }) => (
          <li key={place}>
            <strong>{t(placeMessages[place])}</strong>
            <div>{topDigit} + {bottomDigit}{carryIn ? " + 1" : ""} = {sum}</div>
            <p>{carryIn ? t("columnCarryIn") + " " : ""}
              {carryOut ? t("columnCarryOut", { digit: String(resultDigit) }) : t("columnWriteDigit", { digit: String(resultDigit) })}
            </p>
          </li>
        )) : work.steps.map(({ place, adjustedTop, bottomDigit, resultDigit, borrowFromHigher, lentToLower }) => (
          <li key={place}>
            <strong>{t(placeMessages[place])}</strong>
            <div>{adjustedTop} − {bottomDigit} = {resultDigit}</div>
            {!crossesZero && !!(borrowFromHigher || lentToLower) && <p>{t(
              borrowFromHigher && lentToLower ? "columnBorrowBoth" : borrowFromHigher ? "columnBorrowIn" : "columnLent",
            )}</p>}
          </li>
        ))}
        {work.operation === "addition" && work.thousandsDigit === 1 && <li>
          <strong>{t(placeMessages[3])}</strong>
          <p>{t("columnCarryThousands")}</p>
        </li>}
      </ol>
    </section>
  );
}
