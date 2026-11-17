import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { App } from "./app/App";
import { AppProvider } from "./app/providers";
import "./styles/themes.css";
import "./styles/global.css";
import "./styles/responsive.css";
import "./styles/child.css";
import "./styles/column.css";
import "./styles/parent.css";
import { registerOffline } from "./pwa/register";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <AppProvider>
      <App />
    </AppProvider>
  </StrictMode>,
);

void registerOffline();
