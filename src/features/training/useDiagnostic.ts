import {
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  useSyncExternalStore,
} from "react";
import { DiagnosticController } from "./DiagnosticController";

import type { Session } from "../../engine/learning/session";
import { LearningRepository } from "../../database/learningRepository";
import { diagnosticRepository } from "../../database/diagnosticRepository";
import { observeSession } from "../../database/usePracticeData";
import type { SessionMode } from "../../engine/sessions/diagnostic";

const correctFeedbackMs = 800;

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
  const pageAvailable = useRef(true);
  useLayoutEffect(() => {
    controller.attach(false);
    return () => { void controller.detach(); };
  }, [controller]);
  useLayoutEffect(() => {
    const syncActivity = () => {
      void controller.setActive(pageAvailable.current && !document.hidden && !covered);
    };
    const leave = () => {
      pageAvailable.current = false;
      syncActivity();
    };
    const show = () => {
      pageAvailable.current = true;
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
  const { active, busy, error, loading, paused, session } = view;
  useLayoutEffect(() => {
    if (!session || !controller.canAdvanceAutomatically(session)) return;
    const hash = window.location.hash;
    const timeout = window.setTimeout(() => {
      if (pageAvailable.current && !document.hidden && window.location.hash === hash) {
        void controller.advanceCorrectFeedback(session);
      }
    }, correctFeedbackMs);
    const subscription = observeSession(session.id).subscribe({
      next: (saved) => {
        if (saved?.owner === session.owner && saved.phase === session.phase &&
          saved.cursor === session.cursor && saved.startedAt === session.startedAt) return;
        window.clearTimeout(timeout);
        if (controller.canAdvanceAutomatically(session)) void controller.load();
      },
      error: () => window.clearTimeout(timeout),
    });
    return () => {
      window.clearTimeout(timeout);
      subscription.unsubscribe();
    };
  }, [controller, active, busy, error, loading, paused, session]);
  return { controller, ...view };
}
