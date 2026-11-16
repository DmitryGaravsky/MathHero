import { useRef, useState } from "react";
import { useApp } from "../../app/AppContext";
import { defaultParentPin, isParentPin, parentPinRepository } from "../../database/parentPinRepository";

export function ParentPinSettings() {
  const { t } = useApp();
  const input = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<"pinHint" | "pinChanged" | "pinStorageError" | null>(null);
  return (
    <section className="card parent-section">
      <h2>{t("parentPin")}</h2>
      <p>{t("pinDefaultHint", { pin: defaultParentPin })}</p>
      <form noValidate onSubmit={async (event) => {
        event.preventDefault();
        if (busy) return;
        const form = event.currentTarget;
        const pin = String(new FormData(form).get("pin") ?? "");
        if (!isParentPin(pin)) {
          setMessage("pinHint");
          input.current?.focus();
          return;
        }
        setBusy(true);
        setMessage(null);
        try {
          await parentPinRepository.change(pin);
          form.reset();
          setMessage("pinChanged");
        } catch {
          setMessage("pinStorageError");
        } finally {
          setBusy(false);
        }
      }}>
        <div className="pin-field">
          <label htmlFor="new-parent-pin">{t("pinNew")}</label>
          <input ref={input} id="new-parent-pin" name="pin" type="password" inputMode="numeric" autoComplete="off"
            maxLength={4} required disabled={busy} aria-describedby="new-pin-hint" aria-invalid={message === "pinHint"}
            onChange={() => setMessage(null)} />
          <p id="new-pin-hint" role={message === "pinHint" ? "alert" : undefined}>{t("pinHint")}</p>
        </div>
        <button type="submit" className="button secondary" disabled={busy}>{t("pinChange")}</button>
        {message && message !== "pinHint" && <p role={message === "pinChanged" ? "status" : "alert"}>{t(message)}</p>}
      </form>
    </section>
  );
}
