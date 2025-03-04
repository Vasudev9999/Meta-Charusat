import React, { useState, useEffect } from "react";
import AuthModal from "../components/AuthModal";

const AvatarPage = () => {
  const [showModal, setShowModal] = useState(false);
  const [username, setUsername] = useState("");

  // On mount, check for username in URL query or localStorage
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const urlUsername = params.get("username");
    if (urlUsername) {
      // Update localStorage and state
      localStorage.setItem("username", urlUsername);
      setUsername(urlUsername);
      // Clear the query parameter from URL (refresh browser history)
      window.history.replaceState({}, document.title, window.location.pathname);
    } else {
      const storedUsername = localStorage.getItem("username");
      if (storedUsername) setUsername(storedUsername);
    }
  }, []);

  const handleAuth = (name) => {
    localStorage.setItem("username", name);
    setUsername(name);
  };

  return (
    <div style={styles.container}>
      {username && <h2 style={styles.welcome}>Welcome, {username}!</h2>}
      <button onClick={() => setShowModal(true)} style={styles.button}>
        {username ? "Re-Login / Update" : "Login / Sign Up"}
      </button>
      {showModal && (
        <AuthModal onClose={() => setShowModal(false)} onAuth={handleAuth} />
      )}
    </div>
  );
};

const styles = {
  container: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    marginTop: "50px"
  },
  button: {
    padding: "10px 20px",
    fontSize: "16px"
  },
  welcome: {
    marginBottom: "20px"
  }
};

export default AvatarPage;