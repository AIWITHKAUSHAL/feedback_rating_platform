/** Application entry point. */
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router-dom";

import { App } from "./App";
import { AuthProvider } from "./hooks/AuthProvider";
import "./index.css";

const container = document.getElementById("root");
if (!container) {
  throw new Error('Missing <div id="root"> in index.html');
}

createRoot(container).render(
  <StrictMode>
    <BrowserRouter>
      <AuthProvider>
        <App />
      </AuthProvider>
    </BrowserRouter>
  </StrictMode>,
);
