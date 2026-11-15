import {
  useEffect,
  useLayoutEffect,
  useState,
  useSyncExternalStore,
} from "react";
import { DiagnosticController } from "./DiagnosticController";

export function useDiagnostic() {
  const [controller] = useState(() => new DiagnosticController());
  const view = useSyncExternalStore(
    controller.subscribe,
    controller.getSnapshot,
  );
  useEffect(() => {
    controller.attach();
    void controller.load();
    const hide = () => {
      if (document.hidden) void controller.pause();
    };
    const leave = () => {
      void controller.pause();
    };
    document.addEventListener("visibilitychange", hide);
    window.addEventListener("pagehide", leave);
    window.addEventListener("beforeunload", leave);
    const interval = window.setInterval(() => {
      if (!document.hidden) void controller.saveCheckpoint();
    }, 250);
    return () => {
      document.removeEventListener("visibilitychange", hide);
      window.removeEventListener("pagehide", leave);
      window.removeEventListener("beforeunload", leave);
      window.clearInterval(interval);
      void controller.detach();
    };
  }, [controller]);
  useLayoutEffect(() => {
    if (!document.hidden) controller.reveal();
    else void controller.pause();
  }, [
    controller,
    view.session?.cursor,
    view.session?.phase,
    view.paused,
    view.busy,
  ]);
  return { controller, ...view };
}
