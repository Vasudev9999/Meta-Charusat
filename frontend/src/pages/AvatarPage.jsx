import React, { useState, useEffect, useContext } from "react";
import { useNavigate } from "react-router-dom";
import AuthModal from "../components/AuthModal";
import AvatarCustomizationModal from "../components/AvatarCustomizationModal";
import { AuthContext } from "../context/AuthContext";

const placeholderAvatars = [
  { id: "avatar1", color: "#f39c12" },
  { id: "avatar2", color: "#27ae60" },
  { id: "avatar3", color: "#2980b9" }
];

const getRandomAvatar = () => {
  return placeholderAvatars[Math.floor(Math.random() * placeholderAvatars.length)].id;
};

const getColorForAvatar = (avatarID) => {
  switch (avatarID) {
    case "avatar1":
      return "#f39c12";
    case "avatar2":
      return "#27ae60";
    case "avatar3":
      return "#2980b9";
    default:
      return "#ccc";
  }
};

const AvatarPage = () => {
  const { user, login } = useContext(AuthContext);
  const navigate = useNavigate();
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [showAvatarModal, setShowAvatarModal] = useState(false);
  const [accountName, setAccountName] = useState("");
  const [playerName, setPlayerName] = useState("");
  const [avatarID, setAvatarID] = useState("");

  useEffect(() => {
    // Process query parameters from Google login.
    const params = new URLSearchParams(window.location.search);
    const emailParam = params.get("email");
    if (emailParam) {
      const usernameParam = params.get("username") || "";
      const playerNameParam = params.get("playerName") || usernameParam;
      // If avatarID is empty (or only whitespace), assign a random avatar.
      const avatarIDParam = params.get("avatarID");
      const finalAvatarID =
        avatarIDParam && avatarIDParam.trim() ? avatarIDParam : getRandomAvatar();

      const newUser = {
        email: emailParam,
        username: usernameParam,
        playerName: playerNameParam,
        avatarID: finalAvatarID
      };

      // Update AuthContext with the new user.
      login(newUser);
      // Remove query parameters from URL.
      window.history.replaceState({}, document.title, window.location.pathname);
    }

    // Load user data from AuthContext or localStorage.
    let activeUser = user;
    if (!activeUser) {
      const storedUser = localStorage.getItem("user");
      if (storedUser) {
        activeUser = JSON.parse(storedUser);
      }
    }
    if (activeUser) {
      setAccountName(activeUser.username);
      setPlayerName(activeUser.playerName ? activeUser.playerName : activeUser.username);
      setAvatarID(activeUser.avatarID ? activeUser.avatarID : getRandomAvatar());
    } else {
      setAvatarID(getRandomAvatar());
    }
  }, [user, login]);

  const handleAuth = (userData) => {
    login(userData);
    setAccountName(userData.username);
    setPlayerName(userData.playerName ? userData.playerName : userData.username);
    setAvatarID(userData.avatarID ? userData.avatarID : getRandomAvatar());
    localStorage.setItem("user", JSON.stringify(userData));
  };

  const handleAvatarSave = (updatedUser) => {
    setPlayerName(updatedUser.playerName);
    setAvatarID(updatedUser.avatarID);
    if (user) {
      localStorage.setItem("user", JSON.stringify({ ...user, ...updatedUser }));
    }
  };

  const handleRequireLogin = () => {
    setShowAvatarModal(false);
    setShowAuthModal(true);
  };

  return (
    <div style={styles.container}>
      {accountName && (
        <div style={styles.header}>
          <h3>Account: {accountName}</h3>
          <h2>Welcome, {playerName}!</h2>
        </div>
      )}
      <div style={styles.avatarPreview}>
        <div style={{ ...styles.avatarShape, backgroundColor: getColorForAvatar(avatarID) }}></div>
      </div>
      <button onClick={() => setShowAvatarModal(true)} style={styles.customizeButton}>
        Customize Avatar &amp; Player Name
      </button>
      <button onClick={() => setShowAuthModal(true)} style={styles.button}>
        {accountName ? "Re-Login / Update" : "Login / Sign Up"}
      </button>
      {/* Button to navigate to Campus page */}
      <button onClick={() => navigate("/campus")} style={styles.button}>
        Enter Campus
      </button>
      {showAvatarModal && (
        <AvatarCustomizationModal
          currentName={playerName}
          currentAvatarID={avatarID}
          user={user}
          onRequireLogin={handleRequireLogin}
          onSave={handleAvatarSave}
          onClose={() => setShowAvatarModal(false)}
        />
      )}
      {showAuthModal && <AuthModal onClose={() => setShowAuthModal(false)} onAuth={handleAuth} />}
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
  header: {
    textAlign: "center",
    marginBottom: "20px"
  },
  avatarPreview: {
    marginBottom: "20px",
    width: "100px",
    height: "100px"
  },
  avatarShape: {
    width: "100%",
    height: "100%",
    borderRadius: "50%"
  },
  customizeButton: {
    padding: "8px 16px",
    marginBottom: "20px",
    cursor: "pointer"
  },
  button: {
    padding: "10px 20px",
    fontSize: "16px",
    marginBottom: "10px"
  }
};

export default AvatarPage;