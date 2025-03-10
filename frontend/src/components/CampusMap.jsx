import React, { useState, useEffect, useRef, useContext } from "react";
import Peer from "simple-peer";
import { io } from "socket.io-client";
import { AuthContext } from "../context/AuthContext";
import TiledMap from "./TiledMap";
import "../styles/CampusMap.css";

const socket = io("https://localhost:7000", {
  rejectUnauthorized: false,
  withCredentials: true,
});

const CampusMap = () => {
  const { user } = useContext(AuthContext);
  const [position, setPosition] = useState({ x: 200, y: 200 }); // Starting position in middle of valid area
  const [otherPlayers, setOtherPlayers] = useState({});
  const [micOn, setMicOn] = useState(false);
  const [micVolume, setMicVolume] = useState(0);

  // Map boundaries based on your tilemap data (pixels)
  // Tilemap is 30x20 tiles, each 32x32 pixels
  // The valid area is from column 5-17 (0-indexed), row 0-19
  const mapBoundaries = {
    minX: 5 * 32 + 16, // Column 5 (add half avatar width)
    maxX: 17 * 32 + 16, // Column 17 (add half avatar width)
    minY: 0 * 32 + 16, // Row 0 (add half avatar height)
    maxY: 19 * 32 + 16 // Row 19 (add half avatar height)
  };

  const voiceInitialized = useRef(false);
  const voicePeers = useRef({});
  const localAudioStream = useRef(null);
  const remoteAudioElements = useRef({});
  const pressedKeys = useRef({});
  const animationFrameId = useRef(null);
  const moveStep = 2;
  const audioContextRef = useRef(null);
  const analyserRef = useRef(null);
  const micStreamRef = useRef(null);
  const speakingAnimationRef = useRef(null);

  // Auto-initialize mic on first gesture
  useEffect(() => {
    const initVoiceOnGesture = async () => {
      if (!voiceInitialized.current) {
        console.log("[CampusMap] Auto-initializing mic on first user gesture");
        await initMic();
        voiceInitialized.current = true;
        document.removeEventListener("click", initVoiceOnGesture);
        document.removeEventListener("keydown", initVoiceOnGesture);
      }
    };
    document.addEventListener("click", initVoiceOnGesture);
    document.addEventListener("keydown", initVoiceOnGesture);
    return () => {
      document.removeEventListener("click", initVoiceOnGesture);
      document.removeEventListener("keydown", initVoiceOnGesture);
    };
  }, []);

  // Emit join event
  useEffect(() => {
    if (user && user.email) {
      console.log("[CampusMap] Emitting join event for:", user.email);
      socket.emit("join", {
        userId: user.email,
        playerName: user.playerName || user.username,
        avatarID: user.avatarID,
        position: position
      });
    }
  }, [user, position]);

  // Listen for player updates
  useEffect(() => {
    socket.on("updatePlayers", (players) => {
      console.log("[CampusMap] Received players update:", players);
      setOtherPlayers(players);

      if (user && user.email && localAudioStream.current) {
        // Clean up stale voice peers
        Object.keys(voicePeers.current).forEach((id) => {
          if (!players[id]) {
            voicePeers.current[id].destroy();
            delete voicePeers.current[id];
            if (remoteAudioElements.current[id]) {
              remoteAudioElements.current[id].pause();
              remoteAudioElements.current[id].srcObject = null;
              remoteAudioElements.current[id].remove();
              delete remoteAudioElements.current[id];
            }
          }
        });

        // Set up voice peers for new players
        Object.entries(players).forEach(([id]) => {
          if (!id || id === user.email) return;
          if (!voicePeers.current[id]) {
            const isInitiator = user.email < id;
            console.log(
              `[CampusMap] Creating voice peer for ${id} as ${isInitiator ? "initiator" : "receiver"}`
            );
            try {
              const peer = new Peer({
                initiator: isInitiator,
                trickle: false,
                stream: localAudioStream.current,
              });
              peer.on("signal", (signalData) => {
                console.log(
                  `[CampusMap] Sending voice signal from ${user.email} to ${id}`,
                  signalData
                );
                socket.emit("voiceSignal", {
                  from: user.email,
                  to: id,
                  signal: signalData,
                });
              });
              peer.on("stream", (stream) => {
                console.log(`[CampusMap] Received remote voice stream from ${id}`);
                if (!remoteAudioElements.current[id]) {
                  const audioEl = document.createElement("audio");
                  audioEl.srcObject = stream;
                  audioEl.autoplay = true;
                  audioEl.setAttribute("playsinline", "true");
                  document.body.appendChild(audioEl);
                  remoteAudioElements.current[id] = audioEl;
                  audioEl
                    .play()
                    .catch((err) => console.error(`Failed to play audio for ${id}:`, err));
                } else {
                  remoteAudioElements.current[id].srcObject = stream;
                  remoteAudioElements.current[id]
                    .play()
                    .catch((err) => console.error(`Failed to play audio for ${id}:`, err));
                }
              });
              peer.on("error", (err) =>
                console.error(`Voice peer error with ${id}:`, err)
              );
              voicePeers.current[id] = peer;
            } catch (err) {
              console.error(`Error creating peer for ${id}:`, err);
            }
          }
        });
      }
    });
    return () => {
      socket.off("updatePlayers");
    };
  }, [user]);

  // Listen for incoming voice signals
  useEffect(() => {
    socket.on("voiceSignal", (data) => {
      if (!user || user.email !== data.to) return;
      console.log(`[CampusMap] Received voice signal from ${data.from}`, data.signal);
      if (voicePeers.current[data.from]) {
        voicePeers.current[data.from].signal(data.signal);
      } else {
        try {
          const peer = new Peer({
            initiator: false,
            trickle: false,
            stream: localAudioStream.current,
          });
          peer.on("signal", (signalData) => {
            console.log(
              `[CampusMap] Sending back voice signal from ${user.email} to ${data.from}`,
              signalData
            );
            socket.emit("voiceSignal", {
              from: user.email,
              to: data.from,
              signal: signalData,
            });
          });
          peer.on("stream", (stream) => {
            console.log(`[CampusMap] Received remote voice stream from ${data.from}`);
            if (!remoteAudioElements.current[data.from]) {
              const audioEl = document.createElement("audio");
              audioEl.srcObject = stream;
              audioEl.autoplay = true;
              audioEl.setAttribute("playsinline", "true");
              document.body.appendChild(audioEl);
              remoteAudioElements.current[data.from] = audioEl;
              audioEl
                .play()
                .catch((err) => console.error(`Failed to play audio for ${data.from}:`, err));
            } else {
              remoteAudioElements.current[data.from].srcObject = stream;
              remoteAudioElements.current[data.from]
                .play()
                .catch((err) => console.error(`Failed to play audio for ${data.from}:`, err));
            }
          });
          peer.on("error", (err) =>
            console.error(`Voice peer error with ${data.from}:`, err)
          );
          voicePeers.current[data.from] = peer;
          peer.signal(data.signal);
        } catch (err) {
          console.error(`Error creating peer for incoming signal from ${data.from}:`, err);
        }
      }
    });
    return () => {
      socket.off("voiceSignal");
    };
  }, [user]);

  // Handle keyboard movement with adjusted boundaries
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
      setPosition((prev) => {
        let newX = prev.x;
        let newY = prev.y;
        
        if (pressedKeys.current["w"]) {
          newY = Math.max(newY - moveStep, mapBoundaries.minY);
        }
        if (pressedKeys.current["s"]) {
          newY = Math.min(newY + moveStep, mapBoundaries.maxY);
        }
        if (pressedKeys.current["a"]) {
          newX = Math.max(newX - moveStep, mapBoundaries.minX);
        }
        if (pressedKeys.current["d"]) {
          newX = Math.min(newX + moveStep, mapBoundaries.maxX);
        }
        
        if (newX !== prev.x || newY !== prev.y) {
          if (user && user.email) {
            socket.emit("move", {
              userId: user.email,
              position: { x: newX, y: newY },
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
  }, [user, mapBoundaries]);

  // Initialize the microphone
  const initMic = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      micStreamRef.current = stream;
      localAudioStream.current = stream;
      audioContextRef.current = new AudioContext();
      if (audioContextRef.current.state === "suspended") {
        await audioContextRef.current.resume();
      }
      analyserRef.current = audioContextRef.current.createAnalyser();
      const source = audioContextRef.current.createMediaStreamSource(stream);
      source.connect(analyserRef.current);
      analyserRef.current.fftSize = 512;
      setMicOn(true);
      checkAudioVolume();
    } catch (err) {
      console.error("Mic access error:", err);
    }
  };

  const toggleMic = async () => {
    if (!micOn) {
      await initMic();
      // Update existing peers with the new stream
      Object.values(voicePeers.current).forEach((peer) => {
        if (peer && !peer.destroyed) {
          peer.removeStream(localAudioStream.current);
          peer.addStream(localAudioStream.current);
        }
      });
    } else {
      if (micStreamRef.current) {
        micStreamRef.current.getTracks().forEach((track) => track.stop());
      }
      if (audioContextRef.current) {
        audioContextRef.current.close();
      }
      setMicOn(false);
      socket.emit("speaking", { userId: user.email, speaking: false });
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
      socket.emit("speaking", {
        userId: user.email,
        speaking: normalized > THRESHOLD,
      });
      speakingAnimationRef.current = requestAnimationFrame(analyse);
    };
    analyse();
  };

  const getColorForAvatar = (avatarID) => {
    switch (avatarID) {
      case "avatar1":
        return "#FF5D5D";
      case "avatar2":
        return "#5DB9FF";
      case "avatar3":
        return "#5DFF8F";
      case "avatar4":
        return "#FFB15D";
      case "avatar5":
        return "#C45DFF";
      default:
        return "#ccc";
    }
  };

  return (
    <div className="campus-map-container">
      {/* Render the tiled map as the background */}
      <TiledMap />
      
      {/* Map boundary indicator for debug purposes */}
      {/* Uncomment this to see the boundaries visually
      <div className="map-boundaries" style={{
        position: 'absolute',
        left: `${mapBoundaries.minX}px`,
        top: `${mapBoundaries.minY}px`,
        width: `${mapBoundaries.maxX - mapBoundaries.minX}px`,
        height: `${mapBoundaries.maxY - mapBoundaries.minY}px`,
        border: '2px dashed red',
        zIndex: 5,
        pointerEvents: 'none'
      }}></div>
      */}
      
      {/* Overlay for players */}
      <div className="overlay">
        {Object.entries(otherPlayers).map(([id, data]) => {
          if (user && user.email === id) return null;
          return (
            <div
              key={id}
              className="player-container"
              style={{ left: data.position.x, top: data.position.y }}
            >
              <div className="player-name">
                {data.playerName}
                {data.speaking && <span className="speaking-indicator"></span>}
              </div>
              <div
                className="player"
                style={{ backgroundColor: getColorForAvatar(data.avatarID) }}
              ></div>
            </div>
          );
        })}
        <div
          className="player-container current-player"
          style={{ left: position.x, top: position.y }}
        >
          <div className="player-name">
            {user?.playerName || "Player"}
            {otherPlayers[user?.email]?.speaking && (
              <span className="speaking-indicator"></span>
            )}
          </div>
          <div
            className="player"
            style={{ backgroundColor: getColorForAvatar(user?.avatarID) }}
          ></div>
        </div>
      </div>
      
      <div className="ui-container">
        <div className="instructions">Use W, A, S, D keys to move around</div>
        <div className="controls">
          <button className={`mic-toggle-button ${micOn ? 'active' : ''}`} onClick={toggleMic}>
            {micOn ? "Mic On" : "Mic Off"}
          </button>
          <div className="mic-indicator">
            <div className="mic-meter" style={{ width: `${micVolume}%` }}></div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CampusMap;