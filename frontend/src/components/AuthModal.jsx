import React, { useState } from "react";
import { registerUser, loginUser } from "../api/authApi";

const AuthModal = ({ onClose, onAuth }) => {
  const [isSignUp, setIsSignUp] = useState(false);
  const [formData, setFormData] = useState({
    username: "",
    email: "",
    password: ""
  });
  const [message, setMessage] = useState("");

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      let res;
      let userName;
      if (isSignUp) {
        res = await registerUser(formData);
        userName = formData.username;
      } else {
        res = await loginUser({
          email: formData.email,
          password: formData.password
        });
        userName = res.data.user.username;
      }
      // Store the username in localStorage
      localStorage.setItem("username", userName);
      onAuth(userName);
      setMessage(res.data.message || "Success");
      onClose();
    } catch (error) {
      setMessage(
        error.response?.data?.message || "An error occurred. Try again."
      );
    }
  };

  return (
    <div style={styles.overlay}>
      <div style={styles.modal}>
        <h2>{isSignUp ? "Sign Up" : "Login"}</h2>
        <form onSubmit={handleSubmit} style={styles.form}>
          {isSignUp && (
            <div>
              <label>Username:</label>
              <input
                type="text"
                name="username"
                value={formData.username}
                onChange={handleChange}
                required
              />
            </div>
          )}
          <div>
            <label>Email:</label>
            <input
              type="email"
              name="email"
              value={formData.email}
              onChange={handleChange}
              required
            />
          </div>
          <div>
            <label>Password:</label>
            <input
              type="password"
              name="password"
              value={formData.password}
              onChange={handleChange}
              required
            />
          </div>
          {message && <p>{message}</p>}
          <button type="submit">{isSignUp ? "Sign Up" : "Login"}</button>
        </form>
        <div style={{ marginTop: "10px" }}>
          {isSignUp ? (
            <p>
              Already have an account?{" "}
              <span style={styles.link} onClick={() => setIsSignUp(false)}>
                Login
              </span>
            </p>
          ) : (
            <p>
              New user?{" "}
              <span style={styles.link} onClick={() => setIsSignUp(true)}>
                Create account
              </span>
            </p>
          )}
        </div>
        <button onClick={onClose} style={styles.closeButton}>
          Close
        </button>
      </div>
    </div>
  );
};

const styles = {
  overlay: {
    position: "fixed",
    top: 0,
    left: 0,
    width: "100%",
    height: "100%",
    backgroundColor: "rgba(0,0,0,0.5)",
    display: "flex",
    justifyContent: "center",
    alignItems: "center"
  },
  modal: {
    backgroundColor: "#fff",
    padding: "20px",
    borderRadius: "8px",
    width: "300px"
  },
  form: {
    display: "flex",
    flexDirection: "column"
  },
  link: {
    color: "blue",
    cursor: "pointer"
  },
  closeButton: {
    marginTop: "10px"
  }
};

export default AuthModal;
