export type OfflineStatus =
  | "offlinePreparing"
  | "offlineReady"
  | "offlineUpdate"
  | "offlineUnavailable";
let status: OfflineStatus = "offlinePreparing";
const listeners = new Set<() => void>();
let started = false;
export const getOfflineStatus = () => status;
export function subscribeOffline(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}
function publish(next: OfflineStatus) {
  status = next;
  listeners.forEach((listener) => listener());
}

export async function registerOffline() {
  if (started) return;
  started = true;
  if (!import.meta.env.PROD || !("serviceWorker" in navigator)) {
    publish("offlineUnavailable");
    return;
  }
  let current: ServiceWorkerRegistration | undefined;
  const connect = async () => {
    try {
      const registration = await navigator.serviceWorker.register(
        `${import.meta.env.BASE_URL}sw.js`,
        { scope: import.meta.env.BASE_URL, updateViaCache: "none" },
      );
      current = registration;
      const refresh = () => publish(
        registration.waiting ? "offlineUpdate" :
          registration.active ? "offlineReady" : "offlinePreparing",
      );
      const watch = () => {
        const worker = registration.installing;
        worker?.addEventListener("statechange", () => {
          if (worker.state === "redundant" && !registration.active) {
            publish("offlineUnavailable");
          } else refresh();
        });
      };
      registration.addEventListener("updatefound", watch);
      navigator.serviceWorker.addEventListener("controllerchange", () => {
        if (current === registration) refresh();
      });
      watch();
      refresh();
    } catch {
      publish(navigator.serviceWorker.controller ? "offlineReady" : "offlineUnavailable");
    }
  };
  // A failed first install may have removed its registration entirely.
  window.addEventListener("online", () => {
    if (current?.active) void current.update().catch(() => {});
    else void connect();
  });
  await connect();
}
