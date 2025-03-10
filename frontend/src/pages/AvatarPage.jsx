import React, { useState, useEffect, useContext, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import AuthModal from "../components/AuthModal";
import { AuthContext } from "../context/AuthContext";
import { updateAvatar } from "../api/authApi";
import noiseTexture from "../assets/noise-texture.png";
import "../styles/AvatarPage.css";

// Avatar color palette with names
const avatarOptions = [
  { id: "avatar1", color: "#FF5D5D", name: "PHOENIX", personality: "Bold and adventurous" },
  { id: "avatar2", color: "#5DB9FF", name: "OCEANIC", personality: "Calm and strategic" },
  { id: "avatar3", color: "#5DFF8F", name: "EMERALD", personality: "Creative and insightful" },
  { id: "avatar4", color: "#FFB15D", name: "SOLAR", personality: "Energetic and cheerful" },
  { id: "avatar5", color: "#C45DFF", name: "COSMIC", personality: "Mysterious and innovative" }
];

const getRandomAvatar = () => {
  return avatarOptions[Math.floor(Math.random() * avatarOptions.length)].id;
};

const getAvatarInfo = (avatarID) => {
  return avatarOptions.find(av => av.id === avatarID) || avatarOptions[0];
};

const AvatarPage = () => {
  // Context and navigation
  const { user, login } = useContext(AuthContext);
  const navigate = useNavigate();
  
  // State management
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [accountName, setAccountName] = useState("");
  const [playerName, setPlayerName] = useState("");
  const [newPlayerName, setNewPlayerName] = useState(""); // For editing
  const [avatarID, setAvatarID] = useState("");
  const [currentSection, setCurrentSection] = useState("create");
  const [isLoaded, setIsLoaded] = useState(false);
  const [cursorPosition, setCursorPosition] = useState({ x: 0, y: 0 });
  const [isHovering, setIsHovering] = useState(false);
  const [hoverButton, setHoverButton] = useState("");
  const [showTooltip, setShowTooltip] = useState(false);
  const [tooltipContent, setTooltipContent] = useState("");
  const [tooltipPosition, setTooltipPosition] = useState({ x: 0, y: 0 });
  const [confettiActive, setConfettiActive] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isAvatarSaving, setIsAvatarSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState({ text: "", type: "" });
  
  // Refs
  const canvasRef = useRef(null);
  const confettiRef = useRef(null);
  const nameInputRef = useRef(null);
  
  // Handle mouse movement
  useEffect(() => {
    const handleMouseMove = (e) => {
      setCursorPosition({ x: e.clientX, y: e.clientY });
    };
    
    window.addEventListener("mousemove", handleMouseMove);
    
    // Simulate loading
    const timer = setTimeout(() => {
      setIsLoaded(true);
    }, 1200);
    
    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      clearTimeout(timer);
    };
  }, []);

  // Focus input when editing starts
  useEffect(() => {
    if (isEditing && nameInputRef.current) {
      nameInputRef.current.focus();
    }
  }, [isEditing]);
  
  // Canvas background effect
  useEffect(() => {
    if (!isLoaded) return;
    
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    
    const gridSize = 40;
    const dotSize = 1;
    
    const drawGrid = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.fillStyle = "#191919";
      
      for (let x = 0; x < canvas.width; x += gridSize) {
        for (let y = 0; y < canvas.height; y += gridSize) {
          ctx.fillRect(x, y, dotSize, dotSize);
        }
      }
    };
    
    drawGrid();
    
    const handleResize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
      drawGrid();
    };
    
    window.addEventListener('resize', handleResize);
    
    return () => {
      window.removeEventListener('resize', handleResize);
    };
  }, [isLoaded]);
  
  // Confetti effect
  useEffect(() => {
    if (!confettiActive || !confettiRef.current) return;
    
    const canvas = confettiRef.current;
    const ctx = canvas.getContext('2d');
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    
    const confettiPieces = [];
    const confettiColors = [
      "#FF5D5D", "#5DB9FF", "#5DFF8F", "#FFB15D", "#C45DFF"
    ];
    
    // Create confetti pieces
    for (let i = 0; i < 100; i++) {
      confettiPieces.push({
        x: Math.random() * canvas.width,
        y: Math.random() * canvas.height - canvas.height,
        size: Math.random() * 10 + 5,
        color: confettiColors[Math.floor(Math.random() * confettiColors.length)],
        speed: Math.random() * 3 + 2,
        angle: Math.random() * 6.28,
        rotation: Math.random() * 6.28,
        rotationSpeed: Math.random() * 0.2 - 0.1
      });
    }
    
    const animate = () => {
      if (!confettiActive) return;
      
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      
      let stillActive = false;
      
      for (const piece of confettiPieces) {
        piece.y += piece.speed;
        piece.rotation += piece.rotationSpeed;
        
        ctx.save();
        ctx.translate(piece.x, piece.y);
        ctx.rotate(piece.rotation);
        ctx.fillStyle = piece.color;
        ctx.fillRect(-piece.size / 2, -piece.size / 2, piece.size, piece.size);
        ctx.restore();
        
        if (piece.y < canvas.height) {
          stillActive = true;
        }
      }
      
      if (stillActive) {
        requestAnimationFrame(animate);
      } else {
        setConfettiActive(false);
      }
    };
    
    animate();
    
    // Auto-disable confetti after 3 seconds
    const timer = setTimeout(() => {
      setConfettiActive(false);
    }, 3000);
    
    return () => {
      clearTimeout(timer);
    };
  }, [confettiActive]);

  // Auto-hide save message after 3 seconds
  useEffect(() => {
    if (saveMessage.text) {
      const timer = setTimeout(() => {
        setSaveMessage({ text: "", type: "" });
      }, 3000);
      
      return () => clearTimeout(timer);
    }
  }, [saveMessage]);

  // Load user data
  useEffect(() => {
    // Process query parameters from Google login
    const params = new URLSearchParams(window.location.search);
    const emailParam = params.get("email");
    if (emailParam) {
      const usernameParam = params.get("username") || "";
      const playerNameParam = params.get("playerName") || usernameParam;
      const avatarIDParam = params.get("avatarID");
      const finalAvatarID =
        avatarIDParam && avatarIDParam.trim() ? avatarIDParam : getRandomAvatar();

      const newUser = {
        email: emailParam,
        username: usernameParam,
        playerName: playerNameParam,
        avatarID: finalAvatarID
      };

      login(newUser);
      setConfettiActive(true);
      window.history.replaceState({}, document.title, window.location.pathname);
    }

    // Load user data from context or localStorage
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
      setNewPlayerName(activeUser.playerName ? activeUser.playerName : activeUser.username);
      setAvatarID(activeUser.avatarID ? activeUser.avatarID : getRandomAvatar());
      setCurrentSection("profile");
    } else {
      setAvatarID(getRandomAvatar());
    }
  }, [user, login]);

  const handleAuth = (userData) => {
    login(userData);
    setAccountName(userData.username);
    setPlayerName(userData.playerName ? userData.playerName : userData.username);
    setNewPlayerName(userData.playerName ? userData.playerName : userData.username);
    setAvatarID(userData.avatarID ? userData.avatarID : getRandomAvatar());
    localStorage.setItem("user", JSON.stringify(userData));
    setCurrentSection("profile");
    setConfettiActive(true);
  };

  const handleSavePlayerName = async () => {
    if (!user) {
      setShowAuthModal(true);
      return;
    }
    
    const emailToUse = user.email || (user.emails && user.emails[0]?.value);
    if (!emailToUse) {
      setShowAuthModal(true);
      return;
    }
    
    setIsSaving(true);
    
    try {
      const res = await updateAvatar({
        email: emailToUse,
        playerName: newPlayerName,
        avatarID: avatarID
      });
      
      setPlayerName(res.data.user.playerName);
      localStorage.setItem(
        "user", 
        JSON.stringify({ ...user, playerName: res.data.user.playerName, avatarID })
      );
      
      setIsEditing(false);
      setSaveMessage({
        text: "Player name updated successfully!",
        type: "success"
      });
    } catch (error) {
      console.error("Error updating player name:", error);
      setSaveMessage({
        text: "Failed to update player name. Please try again.",
        type: "error"
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleAvatarSelect = async (newAvatarID) => {
    setAvatarID(newAvatarID);
    
    if (!user) {
      localStorage.setItem("selectedAvatarID", newAvatarID); // Store choice for after login
      setSaveMessage({
        text: "Login to save your avatar",
        type: "info"
      });
      return;
    }
    
    const emailToUse = user.email || (user.emails && user.emails[0]?.value);
    if (!emailToUse) {
      setShowAuthModal(true);
      return;
    }
    
    setIsAvatarSaving(true);
    
    try {
      const res = await updateAvatar({
        email: emailToUse,
        playerName: playerName,
        avatarID: newAvatarID
      });
      
      localStorage.setItem(
        "user", 
        JSON.stringify({ ...user, avatarID: newAvatarID })
      );
      
      setSaveMessage({
        text: "Avatar updated successfully!",
        type: "success"
      });
      
      // Short confetti burst for successful avatar change
      setTimeout(() => setConfettiActive(true), 100);
    } catch (error) {
      console.error("Error updating avatar:", error);
      setSaveMessage({
        text: "Failed to update avatar. Please try again.",
        type: "error"
      });
    } finally {
      setIsAvatarSaving(false);
    }
  };
  
  const startEditing = () => {
    setIsEditing(true);
    setNewPlayerName(playerName);
  };
  
  const cancelEditing = () => {
    setIsEditing(false);
    setNewPlayerName(playerName);
  };
  
  const handleMouseEnter = (button, label) => {
    setIsHovering(true);
    setHoverButton(button);
    setShowTooltip(true);
    setTooltipContent(label);
  };
  
  const handleMouseLeave = () => {
    setIsHovering(false);
    setHoverButton("");
    setShowTooltip(false);
  };
  
  const handleMouseMove = (e) => {
    if (showTooltip) {
      setTooltipPosition({ 
        x: e.clientX, 
        y: e.clientY - 40 
      });
    }
  };

  return (
    <div 
      className="avatar-page" 
      onMouseMove={handleMouseMove}
    >
      <div className="noise-overlay" style={{ backgroundImage: `url(${noiseTexture})` }}></div>
      
      {/* Dynamic cursor */}
      <div 
        className={`cursor-follower ${isHovering ? 'active' : ''} ${hoverButton}`}
        style={{
          left: `${cursorPosition.x}px`,
          top: `${cursorPosition.y}px`
        }}
      />
      
      {/* Canvas background */}
      <canvas ref={canvasRef} className="canvas-background" />
      
      {/* Confetti effect */}
      {confettiActive && (
        <canvas ref={confettiRef} className="confetti-canvas" />
      )}
      
      {/* Tooltip */}
      {showTooltip && (
        <div 
          className="tooltip" 
          style={{
            left: `${tooltipPosition.x}px`,
            top: `${tooltipPosition.y}px`
          }}
        >
          {tooltipContent}
        </div>
      )}
      
      <AnimatePresence>
        {!isLoaded ? (
          <motion.div 
            className="loading-screen"
            exit={{ opacity: 0 }}
          >
            <div className="loading-content">
              <svg className="loading-logo" viewBox="0 0 100 100" width="80" height="80">
                <rect className="loading-square" x="25" y="25" width="50" height="50" />
                <circle className="loading-circle" cx="50" cy="50" r="30" />
              </svg>
              <h1 className="loading-title">METACHARUSAT</h1>
              <div className="loading-bar">
                <motion.div 
                  className="loading-progress"
                  initial={{ width: "0%" }}
                  animate={{ width: "100%" }}
                  transition={{ duration: 1.2, ease: "easeInOut" }}
                />
              </div>
            </div>
          </motion.div>
        ) : (
          <div className="main-content">
            <header className="app-header">
              <div className="brand">
                <div className="brand-icon">
                  <div className="brand-square"></div>
                  <div className="brand-circle"></div>
                </div>
                <h1 className="brand-name">METACHARUSAT</h1>
              </div>
              
              <nav className="main-nav">
                <a href="/" className="nav-link">HOME</a>
                <a href="#" className="nav-link active">AVATAR</a>
                <a href="/campus" className="nav-link">CAMPUS</a>
              </nav>
            </header>
            
            <main className="avatar-content">
              {saveMessage.text && (
                <div className={`save-message ${saveMessage.type}`}>
                  {saveMessage.text}
                </div>
              )}
              
              <div className="content-wrapper">
                <div className="left-panel">
                  <motion.div 
                    className="section-heading"
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ duration: 0.5 }}
                  >
                    <span className="section-number">01</span>
                    <h2>{accountName ? "YOUR PROFILE" : "CREATE IDENTITY"}</h2>
                  </motion.div>
                  
                  <motion.div 
                    className="profile-card"
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.5, delay: 0.2 }}
                  >
                    {accountName ? (
                      <div className="profile-details">
                        <div className="profile-section">
                          <div className="profile-label">ACCOUNT</div>
                          <div className="profile-name">{accountName}</div>
                        </div>
                        
                        <div className="profile-section">
                          <div className="profile-label">PLAYER NAME</div>
                          {isEditing ? (
                            <div className="name-edit">
                              <input
                                ref={nameInputRef}
                                type="text"
                                className="name-input"
                                value={newPlayerName}
                                onChange={(e) => setNewPlayerName(e.target.value)}
                                placeholder="Enter player name"
                                maxLength={20}
                              />
                              <div className="name-actions">
                                <button 
                                  className={`name-action-btn save-name ${isSaving ? 'saving' : ''}`} 
                                  onClick={handleSavePlayerName}
                                  disabled={isSaving}
                                  title="Save name"
                                >
                                  {isSaving ? (
                                    <div className="btn-mini-spinner"></div>
                                  ) : (
                                    <svg viewBox="0 0 24 24" width="16" height="16">
                                      <path d="M21,7L9,19L3.5,13.5L4.91,12.09L9,16.17L19.59,5.59L21,7Z" />
                                    </svg>
                                  )}
                                </button>
                                <button 
                                  className="name-action-btn cancel" 
                                  onClick={cancelEditing}
                                  title="Cancel"
                                >
                                  <svg viewBox="0 0 24 24" width="16" height="16">
                                    <path d="M19,6.41L17.59,5L12,10.59L6.41,5L5,6.41L10.59,12L5,17.59L6.41,19L12,13.41L17.59,19L19,17.59L13.41,12L19,6.41Z" />
                                  </svg>
                                </button>
                              </div>
                            </div>
                          ) : (
                            <div className="name-display">
                              <div className="profile-value">{playerName}</div>
                              <button 
                                className="name-edit-btn" 
                                onClick={startEditing}
                                title="Edit player name"
                              >
                                <svg viewBox="0 0 24 24" width="16" height="16">
                                  <path d="M20.71,7.04C21.1,6.65 21.1,6 20.71,5.63L18.37,3.29C18,2.9 17.35,2.9 16.96,3.29L15.12,5.12L18.87,8.87M3,17.25V21H6.75L17.81,9.93L14.06,6.18L3,17.25Z" />
                                </svg>
                              </button>
                            </div>
                          )}
                        </div>
                      </div>
                    ) : (
                      <div className="login-prompt">
                        <p>Create your virtual identity to explore the MetaCharusat campus. Connect with other students, attend events, and participate in activities.</p>
                        
                        <button 
                          className="prompt-login-btn"
                          onClick={() => setShowAuthModal(true)}
                        >
                          LOGIN / SIGN UP
                        </button>
                      </div>
                    )}
                  </motion.div>
                  
                  {accountName && (
                    <motion.div
                      className="profile-actions"
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.5, delay: 0.4 }}
                    >
                      <button 
                        className="btn-action btn-login"
                        onClick={() => setShowAuthModal(true)}
                        onMouseEnter={() => handleMouseEnter('login', 'Change account')}
                        onMouseLeave={handleMouseLeave}
                      >
                        <div className="btn-icon">
                          <svg viewBox="0 0 24 24" width="24" height="24">
                            <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z" />
                          </svg>
                        </div>
                        <span>ACCOUNT</span>
                      </button>
                      
                      <button 
                        className="btn-action btn-enter"
                        onClick={() => navigate("/campus")}
                        onMouseEnter={() => handleMouseEnter('enter', 'Start your virtual experience')}
                        onMouseLeave={handleMouseLeave}
                      >
                        <div className="btn-icon">
                          <svg viewBox="0 0 24 24" width="24" height="24">
                            <path d="M8.59,16.58L13.17,12L8.59,7.41L10,6L16,12L10,18L8.59,16.58Z" />
                          </svg>
                        </div>
                        <span>ENTER CAMPUS</span>
                      </button>
                    </motion.div>
                  )}
                  
                  <motion.div 
                    className="avatar-data"
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.5, delay: 0.6 }}
                  >
                    <div className="data-row">
                      <div className="data-label">AVATAR TYPE</div>
                      <div className="data-value">{getAvatarInfo(avatarID).name}</div>
                    </div>
                    
                    <div className="data-row">
                      <div className="data-label">PERSONALITY</div>
                      <div className="data-value">{getAvatarInfo(avatarID).personality}</div>
                    </div>
                    
                    <div className="data-row">
                      <div className="data-label">ID</div>
                      <div className="data-value avatar-id">{avatarID}</div>
                    </div>
                  </motion.div>
                </div>
                
                <div className="right-panel">
                  <motion.div 
                    className="avatar-preview"
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ duration: 0.6 }}
                  >
                    <div className="preview-header">
                      <span>PREVIEW & CUSTOMIZE</span>
                    </div>
                    
                    <div className="avatar-display">
                      <div className="avatar-frame">
                        <div className="avatar-circle" style={{backgroundColor: getAvatarInfo(avatarID).color}}>
                          <div className="avatar-face">
                            <div className="avatar-eyes">
                              <div className="eye left"></div>
                              <div className="eye right"></div>
                            </div>
                            <div className="avatar-mouth"></div>
                          </div>
                        </div>
                        
                        {isAvatarSaving && (
                          <div className="avatar-saving-overlay">
                            <div className="btn-spinner"></div>
                          </div>
                        )}
                      </div>
                      
                      <div className="avatar-info">
                        <div className="avatar-type-tag">{getAvatarInfo(avatarID).name}</div>
                        <div className="avatar-player-name">
                          {isEditing ? newPlayerName || "Player" : playerName || "Player"}
                        </div>
                      </div>
                    </div>
                    
                    <div className="avatar-selector">
                      <h3>CHOOSE AVATAR{user ? " (AUTOSAVES)" : ""}</h3>
                      <div className="avatar-options">
                        {avatarOptions.map((avatar) => (
                          <div
                            key={avatar.id}
                            className={`avatar-option ${avatarID === avatar.id ? 'active' : ''} ${isAvatarSaving && avatarID === avatar.id ? 'saving' : ''}`}
                            style={{backgroundColor: avatar.color}}
                            onClick={() => handleAvatarSelect(avatar.id)}
                            onMouseEnter={() => handleMouseEnter('avatar', avatar.name)}
                            onMouseLeave={handleMouseLeave}
                          >
                            <span className="option-name">{avatar.name.charAt(0)}</span>
                            {avatarID === avatar.id && (
                              <span className="avatar-selected-check">
                                <svg viewBox="0 0 24 24" width="12" height="12">
                                  <path d="M21,7L9,19L3.5,13.5L4.91,12.09L9,16.17L19.59,5.59L21,7Z" />
                                </svg>
                              </span>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  </motion.div>
                  
                  <motion.div 
                    className="avatar-features"
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.5, delay: 0.4 }}
                  >
                    <div className="feature-item">
                      <div className="feature-icon chat-icon">💬</div>
                      <div className="feature-text">
                        <h3>CAMPUS CHAT</h3>
                        <p>Connect instantly with fellow students</p>
                      </div>
                    </div>
                    
                    <div className="feature-item">
                      <div className="feature-icon events-icon">🎓</div>
                      <div className="feature-text">
                        <h3>EVENTS</h3>
                        <p>Attend virtual classes and workshops</p>
                      </div>
                    </div>
                    
                    <div className="feature-item">
                      <div className="feature-icon games-icon">🎮</div>
                      <div className="feature-text">
                        <h3>MINI GAMES</h3>
                        <p>Have fun with interactive activities</p>
                      </div>
                    </div>
                  </motion.div>
                </div>
              </div>
              
              <div className="decorative-elements">
                <div className="corner-element top-left"></div>
                <div className="corner-element top-right"></div>
                <div className="corner-element bottom-left"></div>
                <div className="corner-element bottom-right"></div>
              </div>
            </main>
            
            <footer className="app-footer">
              <div className="footer-info">
                <p>© 2025 METACHARUSAT. All rights reserved.</p>
              </div>
              
              <div className="footer-links">
                <a href="/terms">Terms</a>
                <a href="/privacy">Privacy</a>
                <a href="/contact">Contact</a>
              </div>
            </footer>
          </div>
        )}
      </AnimatePresence>
      
      {showAuthModal && (
        <AuthModal 
          onClose={() => setShowAuthModal(false)} 
          onAuth={handleAuth} 
        />
      )}
    </div>
  );
};

export default AvatarPage;