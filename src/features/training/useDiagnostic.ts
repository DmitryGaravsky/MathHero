import {
  useEffect,
  useLayoutEffect,
  useState,
  useSyncExternalStore,
} from "react";
import { DiagnosticController } from "./DiagnosticController";

import type { Session } from "../../engine/learning/session";
import { LearningRepository } from "../../database/learningRepository";
import { diagnosticRepository } from "../../database/diagnosticRepository";
import type { SessionMode } from "../../engine/sessions/diagnostic";

export function useDiagnostic(
  mode: SessionMode = "diagnostic",
  targetPair?: string,
  covered = false,
) {
  const [controller] = useState(
    () =>
      new DiagnosticController<Session>(
        mode === "diagnostic"
          ? diagnosticRepository
          : new LearningRepository(
              undefined,
              undefined,
              undefined,
              mode,
              targetPair,
            ),
      ),
  );
  const view = useSyncExternalStore(
    controller.subscribe,
    controller.getSnapshot,
  );
  useLayoutEffect(() => {
    controller.attach(false);
    return () => { void controller.detach(); };
  }, [controller]);
  useLayoutEffect(() => {
    let pageAvailable = true;
    const syncActivity = () => {
      void controller.setActive(pageAvailable && !document.hidden && !covered);
    };
    const leave = () => {
      pageAvailable = false;
      syncActivity();
    };
    const show = () => {
      pageAvailable = true;
      syncActivity();
    };
    syncActivity();
    document.addEventListener("visibilitychange", syncActivity);
    window.addEventListener("pagehide", leave);
    window.addEventListener("pageshow", show);
    return () => {
      document.removeEventListener("visibilitychange", syncActivity);
      window.removeEventListener("pagehide", leave);
      window.removeEventListener("pageshow", show);
    };
  }, [controller, covered]);
  useEffect(() => {
    const interval = window.setInterval(() => {
      void controller.saveCheckpoint();
    }, 250);
    return () => {
      window.clearInterval(interval);
    };
  }, [controller]);
  useLayoutEffect(() => {
    controller.reveal();
  }, [
    controller,
    view.active,
    view.loading,
    view.session?.cursor,
    view.session?.phase,
    view.paused,
    view.busy,
  ]);
  return { controller, ...view };
}
