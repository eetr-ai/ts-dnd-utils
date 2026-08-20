import { StrictMode } from "react";
import { createRoot } from "react-dom/client";

import { App } from "./App.js";
import "./styles.css";

const container = document.querySelector("#root");
if (!container) throw new Error("no #root to mount into");

createRoot(container).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
