import { useLayoutEffect, useRef, useState } from "react";
import { replaceRoute, resolveRoute, routeHref, useHash, type AppMode } from "./router";
import { ChildShell, ParentShell } from "./ModeShells";
import { ParentPinDialog } from "../features/settings/ParentPinDialog";

interface GateRequest {
  destination: string;
  hash: string;
}

export function App() {
  const [mode, setMode] = useState<AppMode>("child");
  const [gate, setGate] = useState<GateRequest | null>(null);
  const gateRequest = useRef<GateRequest | null>(null);
  const childDestination = useRef(routeHref("child", "home"));
  const hash = useHash();
  const { screen, targetPair, parentDestination } = resolveRoute(hash, mode);

  useLayoutEffect(() => {
    if (mode === "child" && !parentDestination) {
      childDestination.current = routeHref("child", screen, targetPair);
    }
  }, [mode, parentDestination, screen, targetPair]);

  useLayoutEffect(() => {
    const dismissOnNavigation = () => {
      if (gateRequest.current && gateRequest.current.hash !== window.location.hash) {
        gateRequest.current = null;
        setGate(null);
      }
    };
    window.addEventListener("hashchange", dismissOnNavigation);
    return () => window.removeEventListener("hashchange", dismissOnNavigation);
  }, []);

  function closeGate() {
    gateRequest.current = null;
    setGate(null);
  }

  function unlock(request: GateRequest) {
    if (gateRequest.current !== request || window.location.hash !== request.hash) return;
    closeGate();
    setMode("parent");
    replaceRoute(request.destination);
  }

  if (mode === "parent") {
    return <ParentShell screen={screen} targetPair={targetPair} onSwitchMode={() => {
      setMode("child");
      replaceRoute(childDestination.current);
    }} />;
  }

  return (
    <>
      <ChildShell screen={screen} targetPair={targetPair} covered={gate !== null} onSwitchMode={() => {
        const request = { destination: parentDestination ?? routeHref("parent", "home"), hash };
        gateRequest.current = request;
        setGate(request);
      }} />
      {gate && <ParentPinDialog onDismiss={closeGate} onUnlock={() => unlock(gate)} />}
    </>
  );
}
