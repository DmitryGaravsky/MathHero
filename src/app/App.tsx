import { useCallback, useLayoutEffect, useRef, useState } from "react";
import { columnRoutes, replaceRoute, resolveRoute, routeHref, useHash, type AppMode } from "./router";
import { ChildShell, ParentShell } from "./ModeShells";
import { ParentPinDialog } from "../features/settings/ParentPinDialog";
import type { ColumnOperation } from "../engine/column/arithmetic";
import { ColumnRepository } from "../database/columnRepository";
import { ColumnController } from "../features/column/ColumnController";

interface GateRequest {
  destination: string;
  hash: string;
}

export function App() {
  const [mode, setMode] = useState<AppMode>("child");
  const [gate, setGate] = useState<GateRequest | null>(null);
  const gateRequest = useRef<GateRequest | null>(null);
  const childDestination = useRef(routeHref("child", "home"));
  const columnEntry = useRef<ColumnOperation | null>(null);
  const [columns] = useState(() => {
    const repository = new ColumnRepository();
    return {
      repository,
      addition: new ColumnController("addition", repository, crypto.randomUUID()),
      subtraction: new ColumnController("subtraction", repository, crypto.randomUUID()),
    };
  });
  const hash = useHash();
  const { screen, targetPair, parentDestination } = resolveRoute(hash, mode);
  const takeColumnEntry = useCallback((operation: ColumnOperation) => {
    const matches = columnEntry.current === operation;
    columnEntry.current = null;
    return matches;
  }, []);

  useLayoutEffect(() => {
    if (mode === "child" && !parentDestination) {
      childDestination.current = routeHref("child", screen, targetPair);
    }
    const entry = columnEntry.current;
    if (entry && (mode !== "child" || screen !== columnRoutes[entry])) columnEntry.current = null;
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
      <ChildShell screen={screen} targetPair={targetPair} covered={gate !== null} columns={columns}
        chooseColumn={(operation) => {
          columnEntry.current = operation;
          window.location.hash = routeHref("child", columnRoutes[operation]);
        }}
        takeColumnEntry={takeColumnEntry}
        onSwitchMode={() => {
          columnEntry.current = null;
          const request = { destination: parentDestination ?? routeHref("parent", "home"), hash };
          gateRequest.current = request;
          setGate(request);
        }} />
      {gate && <ParentPinDialog onDismiss={closeGate} onUnlock={() => unlock(gate)} />}
    </>
  );
}
