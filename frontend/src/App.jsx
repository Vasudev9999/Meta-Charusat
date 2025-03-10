import React from "react";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import HomePage from "./pages/HomePage";
import AvatarPage from "./pages/AvatarPage";
import CampusMap from "./components/CampusMap";
import { AuthProvider } from "./context/AuthContext";

// Add global polyfills for WebRTC and Node.js compatibility
import { Buffer } from 'buffer';
import process from 'process';

// Polyfill for global objects
window.Buffer = Buffer;
window.process = process;

function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/avatar" element={<AvatarPage />} />
          <Route path="/campus" element={<CampusMap />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}

export default App;