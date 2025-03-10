import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";

// Add global polyfills for WebRTC and Node.js compatibility
import { Buffer } from 'buffer';
import process from 'process';

// Polyfill for global objects
window.Buffer = Buffer;
window.process = process;

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);