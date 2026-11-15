import { useEffect, useState } from "react";
import { getFact, multiplicationFacts } from "../engine/multiplication/facts";

/** Future map entry point; transposed directions share the same target session. */
export function pairTrainingLink(exerciseId: string) {
  return `#weak?pair=${encodeURIComponent(getFact(exerciseId).canonicalId)}`;
}

export const screens = [
  "home",
  "training",
  "results",
  "map",
  "settings",
] as const;
export type Screen = (typeof screens)[number];
export type Route = Screen | "diagnostic" | "weak";
function currentScreen() {
  const hash = window.location.hash.slice(1);
  const [path, search] = hash.split("?");
  const screen: Route = [...screens, "diagnostic", "weak"].includes(path!)
    ? (path as Route)
    : "home";
  const requested = new URLSearchParams(search).get("pair");
  const targetPair = multiplicationFacts.find(
    (f) => f.id === requested,
  )?.canonicalId;
  return { screen, targetPair };
}
export function useScreen() {
  const [screen, setScreen] = useState(currentScreen);
  useEffect(() => {
    const onChange = () => setScreen(currentScreen());
    window.addEventListener("hashchange", onChange);
    return () => window.removeEventListener("hashchange", onChange);
  }, []);
  return screen;
}
