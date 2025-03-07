import React, { useState, useEffect, useRef, useContext } from "react";
import { io } from "socket.io-client";
import { AuthContext } from "../context/AuthContext";
import "../styles/CampusMap.css";

// Connect to the campus socket server on port 7000.
const socket = io("https://localhost:7000", {
  rejectUnauthorized: false,
  withCredentials: true
});

const CampusMap = () => {
  const { user } = useContext(AuthContext);
  const [position, setPosition] = useState({ x: 50, y: 50 });
  const [otherPlayers, setOtherPlayers] = useState({});
  const [micOn, setMicOn] = useState(false);
  const [micVolume, setMicVolume] = useState(0);
  const pressedKeys = useRef({});
  const animationFrameId = useRef(null);
  const moveStep = 2;

  // Audio refs for mic analysis.
  const audioContextRef = useRef(null);
  const analyserRef = useRef(null);
  const micStreamRef = useRef(null);
  const speakingAnimationRef = useRef(null);

  // Emit join event when user becomes available.
  useEffect(() => {
    if (user && user.email) {
      console.log("[CampusMap] Emitting join event for:", user.email);
      socket.emit("join", {
        userId: user.email,
        playerName: user.playerName || user.username,
        avatarID: user.avatarID
      });
    }
  }, [user]);

  // Listen for player updates.
  useEffect(() => {
    socket.on("updatePlayers", (players) => {
      console.log("[CampusMap] Received players update:", players);
      setOtherPlayers(players);
    });
    return () => {
      socket.off("updatePlayers");
    };
  }, []);

  // Handle movement based on key presses.
  useEffect(() => {
    const handleKeyDown = (e) => {
      pressedKeys.current[e.key.toLowerCase()] = true;
    };
    const handleKeyUp = (e) => {
      pressedKeys.current[e.key.toLowerCase()] = false;
    };
    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("keyup", handleKeyUp);

    const updatePosition = () => {
      setPosition((prevPos) => {
        let newX = prevPos.x;
        let newY = prevPos.y;
        if (pressedKeys.current["w"]) newY = Math.max(newY - moveStep, 0);
        if (pressedKeys.current["s"]) newY = Math.min(newY + moveStep, 380);
        if (pressedKeys.current["a"]) newX = Math.max(newX - moveStep, 0);
        if (pressedKeys.current["d"]) newX = Math.min(newX + moveStep, 580);
        if (newX !== prevPos.x || newY !== prevPos.y) {
          if (user && user.email) {
            socket.emit("move", {
              userId: user.email,
              position: { x: newX, y: newY }
            });
          }
        }
        return { x: newX, y: newY };
      });
      animationFrameId.current = requestAnimationFrame(updatePosition);
    };

    animationFrameId.current = requestAnimationFrame(updatePosition);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("keyup", handleKeyUp);
      cancelAnimationFrame(animationFrameId.current);
    };
  }, [user]);

  // Microphone toggle and analysis.
  const toggleMic = async () => {
    if (!micOn) {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        micStreamRef.current = stream;
        audioContextRef.current = new AudioContext();
        analyserRef.current = audioContextRef.current.createAnalyser();
        const source = audioContextRef.current.createMediaStreamSource(stream);
        source.connect(analyserRef.current);
        analyserRef.current.fftSize = 512;
        setMicOn(true);
        checkAudioVolume();
      } catch (err) {
        console.error("Mic access error:", err);
      }
    } else {
      if (micStreamRef.current) {
        micStreamRef.current.getTracks().forEach((track) => track.stop());
      }
      if (audioContextRef.current) {
        audioContextRef.current.close();
      }
      setMicOn(false);
      if (user && user.email) {
        socket.emit("speaking", { userId: user.email, speaking: false });
      }
      if (speakingAnimationRef.current) {
        cancelAnimationFrame(speakingAnimationRef.current);
      }
      setMicVolume(0);
    }
  };

  const checkAudioVolume = () => {
    const bufferLength = analyserRef.current.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);
    const THRESHOLD = 20;
    const analyse = () => {
      analyserRef.current.getByteFrequencyData(dataArray);
      let sum = 0;
      for (let i = 0; i < bufferLength; i++) {
        sum += dataArray[i];
      }
      const avg = sum / bufferLength;
      const normalized = Math.min(Math.round((avg / 255) * 100), 100);
      setMicVolume(normalized);
      if (user && user.email) {
        socket.emit("speaking", {
          userId: user.email,
          speaking: normalized > THRESHOLD
        });
      }
      speakingAnimationRef.current = requestAnimationFrame(analyse);
    };
    analyse();
  };

  // Helper: get avatar background color based on avatarID.
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

  return (
    <div className="campus-map-container">
      <h1 className="map-title">Campus Map</h1>
      <div className="map-background">
        {Object.entries(otherPlayers).map(([id, data]) => {
          // Do not render the local player.
          if (user && user.email === id) return null;
          return (
            <div
              className="player-container"
              key={id}
              style={{ left: data.position.x, top: data.position.y }}
            >
              <div className="player-name">
                {data.playerName}
                {data.speaking && <span className="speaking-indicator"></span>}
              </div>
              <div className="player" style={{ backgroundColor: getColorForAvatar(data.avatarID) }}></div>
            </div>
          );
        })}
        {/* Render the local player */}
        <div className="player-container" style={{ left: position.x, top: position.y }}>
          <div className="player-name">
            {user?.playerName || "Player"}
            {otherPlayers[user?.email]?.speaking && <span className="speaking-indicator"></span>}
          </div>
          <div className="player" style={{ backgroundColor: getColorForAvatar(user?.avatarID) }}></div>
        </div>
      </div>
      <div className="instructions">Use W, A, S, D keys to move around.</div>
      <button className="mic-toggle-button" onClick={toggleMic}>
        {micOn ? "Turn Mic Off" : "Turn Mic On"}
      </button>
      <div className="mic-indicator">
        <div className="mic-meter" style={{ width: `${micVolume}%` }}></div>
        <span>{micVolume > 20 ? "Sound detected" : "No sound"}</span>
      </div>
    </div>
  );
};

export default CampusMap;