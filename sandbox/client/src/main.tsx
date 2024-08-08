import React from "react";
import ReactDOM from "react-dom/client";
import Root from "./root.tsx";
import "./index.css";

// biome-ignore lint/style/noNonNullAssertion: it should always be present
ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <Root />
  </React.StrictMode>,
);
