import { useSyncExternalStore } from "react";
import { useApp } from "../../app/AppContext";
import { getOfflineStatus, subscribeOffline } from "../../pwa/register";

export function OfflineSettings() {
  const { t } = useApp();
  const status = useSyncExternalStore(subscribeOffline, getOfflineStatus);
  return (
    <section className="card offline-card" aria-labelledby="offline-title">
      <h2 id="offline-title">{t("offlineTitle")}</h2>
      <p aria-live="polite" data-testid="offline-status">{t(status)}</p>
      <p>{t("offlineInstall")}</p>
      <p>{t("offlineUpdateHint")}</p>
    </section>
  );
}
