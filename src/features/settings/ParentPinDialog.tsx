import { useLayoutEffect, useRef, useState } from "react";
import { useApp } from "../../app/AppContext";
import { defaultParentPin, isParentPin, parentPinRepository } from "../../database/parentPinRepository";

export function ParentPinDialog({ onDismiss, onUnlock }: {
  onDismiss: () => void;
  onUnlock: () => void;
}) {
  const { t } = useApp();
  const dialog = useRef<HTMLDialogElement>(null);
  const input = useRef<HTMLInputElement>(null);
  const resetCancel = useRef<HTMLButtonElement>(null);
  const [pin, setPin] = useState("");
  const [reset, setReset] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<"pinHint" | "pinWrong" | "pinResetDone" | "pinStorageError" | null>(null);

  useLayoutEffect(() => {
    const element = dialog.current!;
    const opener = document.activeElement;
    element.showModal();
    return () => {
      element.close();
      if (opener instanceof HTMLElement) opener.focus({ preventScroll: true });
    };
  }, []);
  useLayoutEffect(() => {
    if (busy) return;
    if (reset) resetCancel.current?.focus();
    else input.current?.focus();
  }, [reset, busy]);

  async function confirm() {
    if (busy) return;
    if (!reset && !isParentPin(pin)) {
      setMessage("pinHint");
      input.current?.focus();
      return;
    }
    setBusy(true);
    setMessage(null);
    try {
      if (reset) {
        await parentPinRepository.reset();
        setReset(false);
        setPin("");
        setMessage("pinResetDone");
      } else if (await parentPinRepository.verify(pin)) {
        onUnlock();
      } else {
        setPin("");
        setMessage("pinWrong");
      }
    } catch {
      setMessage("pinStorageError");
    } finally {
      setBusy(false);
    }
  }

  return (
    <dialog ref={dialog} aria-labelledby="pin-title" onCancel={(event) => {
      event.preventDefault();
      if (reset && !busy) setReset(false);
      else if (!reset) onDismiss();
    }}>
      <h2 id="pin-title">{t(reset ? "pinReset" : "parentMode")}</h2>
      <form noValidate onSubmit={(event) => {
        event.preventDefault();
        void confirm();
      }}>
        {reset ? (
          <p>{t("pinResetConfirm", { pin: defaultParentPin })}</p>
        ) : (
          <div className="pin-field">
            <label htmlFor="parent-pin">{t("parentPin")}</label>
            <input ref={input} id="parent-pin" type="password" inputMode="numeric"
              autoComplete="off" maxLength={4} required value={pin}
              disabled={busy} aria-describedby="pin-hint pin-default" aria-invalid={message === "pinWrong" || message === "pinHint"}
              onChange={(event) => {
                setPin(event.target.value);
                setMessage(null);
              }} />
            <p id="pin-hint" role={message === "pinHint" ? "alert" : undefined}>{t("pinHint")}</p>
            <p id="pin-default">{t("pinDefaultHint", { pin: defaultParentPin })}</p>
          </div>
        )}
        {message && message !== "pinHint" && <p role={message === "pinResetDone" ? "status" : "alert"}>
          {t(message, { pin: defaultParentPin })}
        </p>}
        <div className="action-row">
          <button ref={resetCancel} type="button" className="button secondary" disabled={busy && reset}
            onClick={reset ? () => setReset(false) : onDismiss}>{t("cancel")}</button>
          <button type="submit" className="button primary" disabled={busy}>
            {t(reset ? "pinResetAction" : "parentEnter")}
          </button>
        </div>
        {!reset && <button type="button" className="keyboard-mode" disabled={busy} onClick={() => {
          setMessage(null);
          setReset(true);
        }}>{t("pinReset")}</button>}
      </form>
    </dialog>
  );
}
