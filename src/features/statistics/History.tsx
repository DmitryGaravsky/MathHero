import { useState } from "react";
import { useApp } from "../../app/AppContext";
import { getFact } from "../../engine/multiplication/facts";
import type { Attempt } from "../../engine/sessions/diagnostic";

export function History({ attempts }: { attempts: Attempt[] }) {
  const { t, preferences } = useApp();
  const [limit, setLimit] = useState(20);
  return (
    <>
      <ol className="history-list">
        {[...attempts]
          .reverse()
          .slice(0, limit)
          .map((a) => (
            <li key={a.id}>
              <strong>
                {getFact(a.exerciseId).operands.join(" × ")} = {a.answer}
              </strong>
              <span>
                {t(a.correct ? "correct" : "incorrect", {
                  answer: String(a.expectedAnswer),
                })}
              </span>
              <span>
                {new Date(a.createdAt).toLocaleString(preferences.language)} ·{" "}
                {t(a.mode === "diagnostic" ? "diagnosticLink" : "training")} ·{" "}
                {t("seconds", {
                  value: (a.responseTimeMs / 1000).toLocaleString(
                    preferences.language,
                    { maximumFractionDigits: 1 },
                  ),
                })}
              </span>
            </li>
          ))}
      </ol>
      {!attempts.length && <p>{t("notYet")}</p>}
      {limit < attempts.length && (
        <button
          className="button secondary"
          onClick={() => setLimit((n) => n + 20)}
        >
          {t("showMore")}
        </button>
      )}
    </>
  );
}
