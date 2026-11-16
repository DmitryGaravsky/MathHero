import { useRef, useState, useEffect } from "react";
import { useApp } from "../../app/AppContext";
import {
  exportBackup,
  parseBackup,
  restoreBackup,
  type Backup,
} from "../../database/backup";

export function BackupControls() {
  const { t, preferences } = useApp();
  const numbers = new Intl.NumberFormat(preferences.language);
  const file = useRef<HTMLInputElement>(null);
  const dialog = useRef<HTMLDialogElement>(null);
  const [pending, setPending] = useState<Backup | null>(null);
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState<
    "backupSaved" | "backupRestored" | "backupInvalid" | "backupFailed" | null
  >(null);
  useEffect(() => {
    if (pending) dialog.current?.showModal();
    else if (dialog.current?.open) dialog.current.close();
  }, [pending]);
  async function download() {
    setBusy(true);
    setStatus(null);
    try {
      const backup = await exportBackup();
      const url = URL.createObjectURL(
        new Blob([JSON.stringify(backup, null, 2)], {
          type: "application/json",
        }),
      );
      const link = document.createElement("a");
      link.href = url;
      link.download = `math-hero-${new Date().toISOString().slice(0, 10)}.json`;
      document.body.append(link);
      link.click();
      link.remove();
      setTimeout(() => URL.revokeObjectURL(url), 30_000);
      setStatus("backupSaved");
    } catch {
      setStatus("backupFailed");
    } finally {
      setBusy(false);
    }
  }
  async function restore() {
    if (!pending) return;
    setBusy(true);
    setStatus(null);
    try {
      await restoreBackup(pending, true);
      setPending(null);
      setStatus("backupRestored");
    } catch {
      setStatus("backupFailed");
      setPending(null);
    } finally {
      setBusy(false);
    }
  }
  return (
    <section className="card backup-card">
      <h2>{t("backupTitle")}</h2>
      <p>{t("backupHint")}</p>
      <div className="action-row">
        <button
          className="button primary"
          disabled={busy}
          onClick={() => void download()}
        >
          {t("exportBackup")}
        </button>
        <button
          className="button secondary"
          disabled={busy}
          onClick={() => file.current?.click()}
        >
          {t("importBackup")}
        </button>
      </div>
      <input
        ref={file}
        type="file"
        accept=".json,application/json"
        hidden
        aria-label={t("importBackup")}
        onChange={async (e) => {
          const selected = e.target.files?.[0];
          e.target.value = "";
          if (!selected) return;
          setBusy(true);
          setStatus(null);
          setPending(null);
          try {
            if (selected.size > 20_000_000) throw new Error("Backup too large");
            setPending(parseBackup(await selected.text()));
          } catch {
            setStatus("backupInvalid");
          } finally {
            setBusy(false);
          }
        }}
      />
      {status && (
        <p
          role={
            status === "backupInvalid" || status === "backupFailed"
              ? "alert"
              : "status"
          }
        >
          {t(status)}
        </p>
      )}
      <dialog
        ref={dialog}
        aria-labelledby="restore-title"
        aria-describedby="restore-warning"
        onCancel={(e) => {
          if (busy) e.preventDefault();
          else setPending(null);
        }}
      >
        <h2 id="restore-title">{t("replaceData")}</h2>
        <p id="restore-warning">{t(pending?.version === 3 ? "replaceWarning" : "replaceLegacyWarning")}</p>
        <p>
          {t("backupPreview", {
            attempts: numbers.format(pending?.tables.attempts.length ?? 0),
            sessions: numbers.format(pending?.tables.sessions.length ?? 0),
          })}
        </p>
        {pending?.version === 3 && (
          <p>
            {t("backupColumnPreview", {
              attempts: numbers.format(pending.tables.columnAttempts.length),
              sessions: numbers.format(pending.tables.columnSessions.length),
            })}
          </p>
        )}
        <div className="action-row">
          <button
            autoFocus
            className="button secondary"
            disabled={busy}
            onClick={() => setPending(null)}
          >
            {t("cancel")}
          </button>
          <button
            className="button primary"
            disabled={busy}
            onClick={() => void restore()}
          >
            {t("confirmRestore")}
          </button>
        </div>
      </dialog>
    </section>
  );
}
