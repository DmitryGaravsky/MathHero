import { liveQuery } from "dexie";
import { useLayoutEffect, useSyncExternalStore } from "react";
import type { ColumnRepository } from "../../database/columnRepository";
import type { ColumnOperation } from "../../engine/column/arithmetic";
import type { ColumnController } from "./ColumnController";

export function useColumnPractice(
  controller: ColumnController, repository: ColumnRepository, operation: ColumnOperation,
  covered: boolean, takeEntry: (operation: ColumnOperation) => boolean,
) {
  const view = useSyncExternalStore(controller.subscribe, controller.getSnapshot);

  useLayoutEffect(() => {
    if (covered) return;
    const hash = window.location.hash;
    controller.attach(!document.hidden, () => !document.hidden && window.location.hash === hash);
    let attached = true;
    queueMicrotask(() => {
      if (!attached) return;
      if (takeEntry(operation) && !document.hidden) void controller.enter();
      else void controller.load();
    });
    const subscription = liveQuery(() => repository.readOpen(operation)).subscribe({
      next: ({ open }) => { void controller.verifyOwnership(open?.token); },
      error: () => { void controller.verifyOwnership(); },
    });
    const syncVisibility = () => {
      controller.setVisible(!document.hidden);
      if (!document.hidden && controller.getSnapshot().status === "loading") void controller.load();
    };
    const hide = () => controller.setVisible(false);
    document.addEventListener("visibilitychange", syncVisibility);
    window.addEventListener("pageshow", syncVisibility);
    window.addEventListener("pagehide", hide);
    return () => {
      attached = false;
      subscription.unsubscribe();
      document.removeEventListener("visibilitychange", syncVisibility);
      window.removeEventListener("pageshow", syncVisibility);
      window.removeEventListener("pagehide", hide);
      void controller.detach();
    };
  }, [controller, repository, operation, covered, takeEntry]);

  const { status, busy, hintOpen, session } = view;
  const phase = session?.draft?.phase;
  useLayoutEffect(() => {
    if (covered || status !== "active" || busy || hintOpen) return;
    controller.reveal();
    return () => controller.conceal();
  }, [controller, covered, status, busy, hintOpen, session?.id, session?.order.length, phase]);

  return view;
}
