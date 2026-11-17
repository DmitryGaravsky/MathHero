import { useSyncExternalStore } from "react";
import type { ColumnOperation } from "../engine/column/arithmetic";
import { getFact, multiplicationFacts } from "../engine/multiplication/facts";

/** Transposed directions share the same target session. */
export function pairTrainingLink(exerciseId: string) {
  return routeHref("parent", "weak", getFact(exerciseId).canonicalId);
}

export type AppMode = "child" | "parent";
export const parentNavigation = [
  "home",
  "map",
  "results",
  "weak-spots",
  "diagnosis",
  "history",
  "training",
  "settings",
] as const;
export const childNavigation = ["home", "training", "achievements"] as const;
export const columnRoutes = { addition: "column-addition", subtraction: "column-subtraction" } as const satisfies
  Record<ColumnOperation, string>;
export const columnReportRoutes = { addition: "column-addition-report", subtraction: "column-subtraction-report" } as const satisfies
  Record<ColumnOperation, string>;
const routes = [...parentNavigation, ...childNavigation, "diagnostic", "weak", "columns",
  ...Object.values(columnRoutes), ...Object.values(columnReportRoutes)] as const;
export type Route = (typeof routes)[number];

export function reportOperation(screen: Route): ColumnOperation | undefined {
  if (screen === columnReportRoutes.addition) return "addition";
  if (screen === columnReportRoutes.subtraction) return "subtraction";
}

export function resolveRoute(hash: string, mode: AppMode) {
  const [path = "", search] = hash.slice(1).split("?", 2);
  const namespace = path.startsWith("parent/") ? "parent" : path.startsWith("child/") ? "child" : undefined;
  const name = namespace ? path.slice(namespace.length + 1) : path;
  const requestedScreen = routes.find((route) => route === name) ?? "home";
  const parentOnly = namespace === "parent" || !!reportOperation(requestedScreen) ||
    requestedScreen === "diagnostic" || parentNavigation.some(
      (route) => route !== "home" && route !== "training" && route === requestedScreen,
    );
  const requested = new URLSearchParams(search).get("pair");
  const target = requestedScreen === "weak" ? multiplicationFacts.find(
    (f) => f.id === requested,
  )?.canonicalId : undefined;
  const blocked = mode === "child" && parentOnly;
  const columnScreen = requestedScreen === "columns" || Object.values(columnRoutes).some((route) => route === requestedScreen);
  const screen = blocked || (mode === "parent" && (namespace === "child" || columnScreen))
    ? "home" : requestedScreen;
  return {
    screen,
    targetPair: screen === "weak" ? target : undefined,
    parentDestination: blocked ? routeHref("parent", requestedScreen, target) : undefined,
  };
}

export function routeHref(mode: AppMode, screen: Route, targetPair?: string) {
  const pair = targetPair ? `?pair=${encodeURIComponent(targetPair)}` : "";
  return `#${mode === "parent" ? "parent/" : ""}${screen}${pair}`;
}

export function replaceRoute(hash: string) {
  window.history.replaceState(window.history.state, "", hash);
  window.dispatchEvent(new Event("hashchange"));
}

function subscribe(onChange: () => void) {
  window.addEventListener("hashchange", onChange);
  return () => window.removeEventListener("hashchange", onChange);
}

export function useHash() {
  return useSyncExternalStore(subscribe, () => window.location.hash);
}
