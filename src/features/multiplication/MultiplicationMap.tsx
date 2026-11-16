import { useRef, useState } from "react";
import { useApp } from "../../app/AppContext";
import { PageHeading } from "../../components/ui/PageHeading";
import { readPairAttempts } from "../../database/parentReadModel";
import { useParentRead } from "../../database/useParentRead";
import { getFact } from "../../engine/multiplication/facts";
import { mapStatuses } from "../../engine/learning/analytics";
import { pairTrainingLink } from "../../app/router";
import { History } from "../statistics/History";
import { ParentReadStatus } from "../parent/ParentReadStatus";
import { useMetricFormat } from "../../app/useMetricFormat";
import { useProgressView } from "../parent/useProgressView";

const factors = Array.from({ length: 12 }, (_, index) => index + 1);
const symbols = {
  unknown: "·",
  difficult: "!",
  developing: "◔",
  fluent: "●",
  stable: "★",
};
export function MultiplicationMap() {
  const { t } = useApp();
  const { view: stats, error } = useProgressView();
  const { number } = useMetricFormat();
  const [a, setA] = useState(1);
  const [b, setB] = useState(1);
  const buttons = useRef(new Map<string, HTMLButtonElement>());
  const id = `mul:${a}:${b}`;
  const fact = getFact(id);
  const attempts = useParentRead(readPairAttempts, fact.canonicalId);
  const cells = new Map(stats?.cells.map((cell) => [cell.id, cell]));
  const status = cells.get(id)?.status ?? "unknown";
  return (
    <>
      <PageHeading title={t("progressMap")} description={t("mapDescription")} />
      {!stats ? <ParentReadStatus error={error} /> : <>
      <section className="card map-card">
        <p>{t("directionsCount", { count: number(stats.masteredDirections) })} · {t("pairsCount", { count: number(stats.masteredPairs) })}</p>
        <div className="factor-picker">
          <label>
            {t("firstFactor")}
            <select value={a} onChange={(e) => setA(Number(e.target.value))}>
              {factors.map((n) => (
                <option key={n}>{n}</option>
              ))}
            </select>
          </label>
          <span aria-hidden="true">×</span>
          <label>
            {t("secondFactor")}
            <select value={b} onChange={(e) => setB(Number(e.target.value))}>
              {factors.map((n) => (
                <option key={n}>{n}</option>
              ))}
            </select>
          </label>
        </div>
        <a
          className="button primary map-training-link"
          tabIndex={0}
          href={pairTrainingLink(id)}
        >
          {t("trainPair")} · {a} × {b}
        </a>
        <div className="table-map" role="group" aria-label={t("mapLabel")}>
          <div className="map-row" aria-hidden="true">
            <span>×</span>
            {factors.map((n) => (
              <span key={n}>{n}</span>
            ))}
          </div>
          {factors.map((x) => (
            <div key={x} className="map-row">
              <span aria-hidden="true">{x}</span>
              {factors.map((y) => {
                const cell = cells.get(`mul:${x}:${y}`)!;
                return (
                  <button
                    key={y}
                    className={`map-cell ${cell.status}`}
                    aria-label={`${x} × ${y}: ${t(cell.status)}`}
                    aria-pressed={a === x && b === y}
                    tabIndex={a === x && b === y ? 0 : -1}
                    ref={(element) => {
                      if (element) buttons.current.set(cell.id, element);
                      else buttons.current.delete(cell.id);
                    }}
                    onKeyDown={(event) => {
                      let row = x;
                      let column = y;
                      if (event.key === "ArrowRight")
                        column = Math.min(12, y + 1);
                      else if (event.key === "ArrowLeft")
                        column = Math.max(1, y - 1);
                      else if (event.key === "ArrowDown")
                        row = Math.min(12, x + 1);
                      else if (event.key === "ArrowUp")
                        row = Math.max(1, x - 1);
                      else if (event.key === "Home") column = 1;
                      else if (event.key === "End") column = 12;
                      else return;
                      event.preventDefault();
                      setA(row);
                      setB(column);
                      buttons.current.get(`mul:${row}:${column}`)?.focus();
                    }}
                    onClick={() => {
                      setA(x);
                      setB(y);
                    }}
                  >
                    {symbols[cell.status]}
                  </button>
                );
              })}
            </div>
          ))}
        </div>
        <ul className="legend">
          {mapStatuses.map((s) => (
            <li key={s}>
              <span className={`legend-symbol ${s}`} aria-hidden="true">{symbols[s]}</span>
              {t(s)}
            </li>
          ))}
        </ul>
        <p className="map-hint">{t("mapHint")}</p>
      </section>
      <section className="card fact-detail">
        <div aria-live="polite">
          <h2>{a} × {b} = {fact.expectedAnswer}</h2>
          <p>{t(status)}</p>
        </div>
        {attempts?.data ? <>
        <h3>{t("directionHistory")}</h3>
        <History
          key={id}
          attempts={attempts.data.filter((row) => row.exerciseId === id)}
        />
        <details>
          <summary>
            {t("pairHistory")} · {fact.operands.join(" × ")}
          </summary>
          <History
            key={fact.canonicalId} attempts={attempts.data}
          />
        </details>
        </> : <ParentReadStatus error={attempts?.error} />}
      </section>
      </>}
    </>
  );
}
