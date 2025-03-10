import React, { useState } from "react";
import { loginUser, registerUser } from "../api/authApi";
import "./AuthModal.css";

function LoginCard({ onAuth, onClose, setMessage }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const handleLogin = async (e) => {
    e.preventDefault();
    try {
      const res = await loginUser({ email, password });
      const user = res.data.user;
      localStorage.setItem("user", JSON.stringify(user));
      onAuth(user);
      onClose();
    } catch (error) {
      setMessage(error.response?.data?.message || "Login error");
    }
  };

  return (
    <div className="auth-card">
      <div className="card-header">
        <h2>Login</h2>
        <div className="header-line"></div>
        <p>Enter your credentials to access your account.</p>
      </div>
      <div className="card-content">
        <form onSubmit={handleLogin}>
          <div className="form-group">
            <label htmlFor="login-email">Email</label>
            <input
              type="email"
              id="login-email"
              placeholder="Enter your email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>
          <div className="form-group">
            <label htmlFor="login-password">Password</label>
            <input
              type="password"
              id="login-password"
              placeholder="Enter your password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>
          <div className="card-footer">
            <button type="button" className="btn btn-outline" onClick={onClose}>
              Cancel
            </button>
            <button type="submit" className="btn btn-primary">
              Login
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function SignUpCard({ onAuth, onClose, setMessage }) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [agree, setAgree] = useState(false);

  const handleSignup = async (e) => {
    e.preventDefault();
    if (password !== confirmPassword) {
      setMessage("Passwords do not match");
      return;
    }
    if (!agree) {
      setMessage("You must agree to the terms and conditions");
      return;
    }
    try {
      const res = await registerUser({ username: name, email, password });
      const user = res.data.user || { username: name, email };
      localStorage.setItem("user", JSON.stringify(user));
      onAuth(user);
      onClose();
    } catch (error) {
      setMessage(error.response?.data?.message || "Signup error");
    }
  };

  return (
    <div className="auth-card">
      <div className="card-header">
        <h2>Sign Up</h2>
        <div className="header-line"></div>
        <p>Create a new account to get started.</p>
      </div>
      <div className="card-content">
        <form onSubmit={handleSignup}>
          <div className="form-group">
            <label htmlFor="signup-name">Name</label>
            <input
              type="text"
              id="signup-name"
              placeholder="Enter your name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
            />
          </div>
          <div className="form-group">
            <label htmlFor="signup-email">Email</label>
            <input
              type="email"
              id="signup-email"
              placeholder="Enter your email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>
          <div className="form-group">
            <label htmlFor="signup-password">Password</label>
            <input
              type="password"
              id="signup-password"
              placeholder="Choose a password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>
          <div className="form-group">
            <label htmlFor="signup-confirm-password">Confirm Password</label>
            <input
              type="password"
              id="signup-confirm-password"
              placeholder="Confirm your password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
            />
          </div>
          <div className="form-group terms">
            <div className="checkbox-wrapper">
              <input
                type="checkbox"
                id="terms"
                checked={agree}
                onChange={(e) => setAgree(e.target.checked)}
              />
              <span className="custom-checkbox"></span>
            </div>
            <label htmlFor="terms">I agree to the terms and conditions</label>
          </div>
          <div className="card-footer">
            <button type="submit" className="btn btn-full">
              Create Account
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function AuthModal({ onClose, onAuth }) {
  const [mode, setMode] = useState("login");
  const [message, setMessage] = useState("");

  return (
    <div className="auth-overlay">
      <div className="modal-container">
        <svg className="modal-bg-shape shape-1" viewBox="0 0 200 200" xmlns="http://www.w3.org/2000/svg">
          <path fill="#FF5D5D" d="M47.7,-57.2C59.5,-45.8,65.8,-28.5,67.3,-11.2C68.8,6.1,65.5,23.3,56.3,36.1C47.1,48.9,32,57.4,14.5,64.1C-3,70.8,-22.9,75.6,-37.3,68.9C-51.7,62.2,-60.6,44,-68.1,24.6C-75.6,5.3,-81.7,-15.2,-75.9,-31.2C-70,-47.2,-52.3,-58.8,-35.5,-68.4C-18.7,-77.9,-2.8,-85.4,12,-84.4C26.7,-83.3,36,-68.7,47.7,-57.2Z" transform="translate(100 100)" />
        </svg>
        <svg className="modal-bg-shape shape-2" viewBox="0 0 200 200" xmlns="http://www.w3.org/2000/svg">
          <path fill="#5DB9FF" d="M48.2,-57.1C63.3,-45.6,77.2,-31.3,82.1,-14C87.1,3.3,83.2,23.6,72.1,38.2C61,52.8,42.8,61.6,24.4,68.3C6,75,-12.7,79.5,-29.7,74.8C-46.8,70,-62.2,56,-72.5,38.9C-82.8,21.8,-88.1,1.5,-83.9,-16.2C-79.7,-33.9,-66.1,-48.9,-50.4,-60.4C-34.7,-71.9,-17.3,-79.8,-0.4,-79.3C16.5,-78.9,33,-68.7,48.2,-57.1Z" transform="translate(100 100)" />
        </svg>

        <div className="modal-content">
          <div className="modal-header">
            <h1 className="modal-title">MetaCharusat</h1>
            <button className="close-button" onClick={onClose}>×</button>
          </div>

          <div className="tab-controls">
            <button
              className={`tab-btn ${mode === "login" ? "active" : ""}`}
              onClick={() => {
                setMode("login");
                setMessage("");
              }}
            >
              Login
            </button>
            <button
              className={`tab-btn ${mode === "signup" ? "active" : ""}`}
              onClick={() => {
                setMode("signup");
                setMessage("");
              }}
            >
              Signup
            </button>
          </div>

          {message && <div className="alert">{message}</div>}

          <div className="card-container">
            {mode === "login" ? (
              <LoginCard onAuth={onAuth} onClose={onClose} setMessage={setMessage} />
            ) : (
              <SignUpCard onAuth={onAuth} onClose={onClose} setMessage={setMessage} />
            )}
          </div>

          <div className="extra-controls">
            <a href="https://localhost:5000/api/auth/google" className="google-link">
              <button className="btn btn-google">
                <svg className="google-icon" width="20" height="20" viewBox="0 0 24 24">
                  <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                  <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                  <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
                  <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
                </svg>
                Continue with Google
              </button>
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}