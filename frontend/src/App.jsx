import React from "react";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import HomePage from "./pages/HomePage";
import AvatarPage from "./pages/AvatarPage";
import { AuthProvider } from "./context/AuthContext";

function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/avatar" element={<AvatarPage />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}

export default App;