import { useEffect, useState } from "react";

export const screens = [
  "home",
  "training",
  "results",
  "map",
  "settings",
] as const;
export type Screen = (typeof screens)[number];
function currentScreen(): Screen {
  const hash = window.location.hash.slice(1);
  return screens.find((screen) => screen === hash) ?? "home";
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
