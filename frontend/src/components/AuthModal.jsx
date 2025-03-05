import React, { useState } from "react";
import { loginUser, registerUser } from "../api/authApi";
import "./AuthModal.css";

function LoginCard({ onAuth, onClose, setMessage }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  // Inside LoginCard:
const handleLogin = async (e) => {
  e.preventDefault();
  try {
    const res = await loginUser({ email, password });
    const user = res.data.user; // full user object including email, playerName, avatarID
    localStorage.setItem("user", JSON.stringify(user));
    onAuth(user);
    onClose();
  } catch (error) {
    setMessage(error.response?.data?.message || "Login error");
  }
};

// Similarly, in SignUpCard, store full user.
  // const handleLogin = async (e) => {
  //   e.preventDefault();
  //   try {
  //     const res = await loginUser({ email, password });
  //     // Full user object returned
  //     const user = res.data.user;
  //     localStorage.setItem("user", JSON.stringify(user));
  //     onAuth(user); // Pass full user object to AuthContext
  //     onClose();
  //   } catch (error) {
  //     setMessage(error.response?.data?.message || "Login error");
  //   }
  // };

  return (
    <div className="card">
      <div className="card-header">
        <h2>Login</h2>
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
            <button type="submit" className="btn">
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
      // Assume backend returns user data (if not, you may need to login immediately)
      const user = res.data.user || { username: name, email };
      localStorage.setItem("user", JSON.stringify(user));
      onAuth(user);
      onClose();
    } catch (error) {
      setMessage(error.response?.data?.message || "Signup error");
    }
  };

  return (
    <div className="card">
      <div className="card-header">
        <h2>Sign Up</h2>
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
            <input
              type="checkbox"
              id="terms"
              checked={agree}
              onChange={(e) => setAgree(e.target.checked)}
            />
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
        <h1 className="modal-title">MetaCharusat</h1>
        <div className="tab-controls">
          <button
            className={mode === "login" ? "active" : ""}
            onClick={() => {
              setMode("login");
              setMessage("");
            }}
          >
            Login
          </button>
          <button
            className={mode === "signup" ? "active" : ""}
            onClick={() => {
              setMode("signup");
              setMessage("");
            }}
          >
            Signup
          </button>
        </div>
        {message && <p className="alert">{message}</p>}
        <div className="card-container">
          {mode === "login" ? (
            <LoginCard onAuth={onAuth} onClose={onClose} setMessage={setMessage} />
          ) : (
            <SignUpCard onAuth={onAuth} onClose={onClose} setMessage={setMessage} />
          )}
        </div>
        <div className="extra-controls">
          <a href="https://localhost:5000/api/auth/google" className="google-link">
            <button className="btn btn-google">Continue with Google</button>
          </a>
          <button className="btn btn-close" onClick={onClose}>
            Close
          </button>
        </div>
      </div>
    </div>
  );
}