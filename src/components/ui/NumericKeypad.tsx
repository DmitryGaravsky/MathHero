import { useApp } from "../../app/AppContext";

interface Props {
  onDigit: (digit: string) => void;
  onErase: () => void;
  canSubmit: boolean;
}
export function NumericKeypad({ onDigit, onErase, canSubmit }: Props) {
  const { t } = useApp();
  return (
    <div className="keypad" role="group" aria-label={t("keypad")}>
      {["1", "2", "3", "4", "5", "6", "7", "8", "9"].map((digit) => (
        <button type="button" key={digit} onClick={() => onDigit(digit)}>
          {digit}
        </button>
      ))}
      <button
        className="key-secondary"
        type="button"
        aria-label={t("erase")}
        onClick={onErase}
      >
        ⌫
      </button>
      <button type="button" onClick={() => onDigit("0")}>
        0
      </button>
      <button
        className="key-confirm"
        type="submit"
        disabled={!canSubmit}
        aria-label={t("confirm")}
      >
        ✓
      </button>
    </div>
  );
}
