import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { App } from "./App";
import "../styles.css";
import "./styles.css";

const rootEl = document.getElementById("persona-turn-root");
if (!rootEl) {
  throw new Error("persona-turn-root element missing in persona-turn.html");
}

createRoot(rootEl).render(
  <StrictMode>
    <App />
  </StrictMode>
);
