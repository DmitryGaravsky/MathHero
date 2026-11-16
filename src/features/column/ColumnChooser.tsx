import { liveQuery } from "dexie";
import { useEffect, useState } from "react";
import { useApp } from "../../app/AppContext";
import { Icon } from "../../components/ui/Icon";
import type { ColumnRepository } from "../../database/columnRepository";
import type { ColumnOperation } from "../../engine/column/arithmetic";
import { operationMessages } from "./columnLabels";

const operations = ["addition", "subtraction"] as const;

export function ColumnChooser({ repository, onChoose }: {
  repository: ColumnRepository;
  onChoose: (operation: ColumnOperation) => void;
}) {
  const { t } = useApp();
  const [pending, setPending] = useState<boolean[]>([]);
  useEffect(() => {
    const reading = liveQuery(() => Promise.all(operations.map((operation) => repository.readOpen(operation))));
    const subscription = reading.subscribe({
      next: (states) => setPending(states.map(({ open }) => !!open)),
      error: () => setPending([]),
    });
    return () => subscription.unsubscribe();
  }, [repository]);

  return (
    <section className="column-chooser">
      <h1>{t("columnTitle")}</h1>
      <div className="child-modules">
        {operations.map((operation, index) => (
          <button type="button" className="module-card" key={operation} onClick={() => onChoose(operation)}>
            <span className="column-operation-symbol" aria-hidden="true">{operation === "addition" ? "+" : "−"}</span>
            <span><strong>{t(operationMessages[operation])}</strong>
              {pending[index] && <small>{t("resumeLearning")}</small>}
            </span>
            <Icon name="arrow" />
          </button>
        ))}
      </div>
    </section>
  );
}
