import React, { useEffect, useRef, useContext, useState } from "react";
import { useNavigate } from "react-router-dom";
import Phaser from "phaser";
import { io } from "socket.io-client";
import { AuthContext } from "../context/AuthContext";
import "../styles/CampusMap.css";

// Map of avatar colors
const AVATAR_COLORS = {
  avatar1: 0xFF5D5D,  // PHOENIX
  avatar2: 0x5DB9FF,  // OCEANIC
  avatar3: 0x5DFF8F,  // EMERALD
  avatar4: 0xFFB15D,  // SOLAR
  avatar5: 0xC45DFF   // COSMIC
};

// Default avatar if user doesn't have one set
const DEFAULT_AVATAR = "avatar3";

const CampusMap = () => {
  const { user } = useContext(AuthContext);
  const navigate = useNavigate();
  const gameRef = useRef(null);
  const socketRef = useRef(null);
  const [isLoading, setIsLoading] = useState(true);
  const [loadingProgress, setLoadingProgress] = useState(0);
  const [errorMessage, setErrorMessage] = useState("");
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [onlinePlayers, setOnlinePlayers] = useState(0);
  const [serverConnected, setServerConnected] = useState(false);
  
  // Local game state
  const gameStateRef = useRef({
    players: {},
    myPlayerId: user?.email || "guest",
    playerEntities: {},
    playerTexts: {},
    cursors: null,
    moveSpeed: 100, // Good speed for 16x16 tiles
    userId: user?.email || "guest",
    playerName: user?.playerName || user?.username || "Guest",
    avatarID: user?.avatarID || DEFAULT_AVATAR,
    lastMovement: { x: 0, y: 0 },
    player: null,
    playerNameText: null,
    gameInitialized: false,
    debugText: null,
    mapLayers: {
      ground: null,
      walls: null
    }
  });

  useEffect(() => {
    if (!user) {
      navigate("/avatar");
      return;
    }
    
    // Update game state with user info
    gameStateRef.current.myPlayerId = user.email;
    gameStateRef.current.userId = user.email;
    gameStateRef.current.playerName = user.playerName || user.username;
    gameStateRef.current.avatarID = user.avatarID || DEFAULT_AVATAR;

    // Determine socket URL based on hostname
    const SOCKET_URL =
      window.location.hostname === "localhost"
        ? "http://localhost:7001"
        : "https://" + window.location.hostname + ":7000";
  
    console.log("Connecting to socket server:", SOCKET_URL);
    
    // Create socket connection
    socketRef.current = io(SOCKET_URL, {
      withCredentials: false,
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000
    });

    // Socket event handlers
    socketRef.current.on("connect", () => {
      console.log("Socket connected!");
      setServerConnected(true);
      setErrorMessage("");
    });
    
    socketRef.current.on("disconnect", () => {
      console.log("Socket disconnected!");
      setServerConnected(false);
      setErrorMessage("Connection lost. Running in offline mode");
    });
    
    socketRef.current.on("welcome", (data) => {
      console.log("Received welcome message:", data);
      setServerConnected(true);
      setErrorMessage("");
      
      // If game is already initialized, send join event
      if (gameStateRef.current.gameInitialized && gameStateRef.current.player) {
        const pos = {
          x: gameStateRef.current.player.x,
          y: gameStateRef.current.player.y
        };
        socketRef.current.emit("join", {
          userId: gameStateRef.current.userId,
          playerName: gameStateRef.current.playerName,
          avatarID: gameStateRef.current.avatarID,
          position: pos
        });
      }
    });

    socketRef.current.on("connect_error", (error) => {
      console.error("Socket connection error:", error);
      setServerConnected(false);
      setErrorMessage("Running in offline mode");
      
      // Setup offline mode with fake players
      const offlinePlayers = {
        'offline-player-1': {
          playerName: 'Test Player 1',
          avatarID: 'avatar1',
          position: { x: 320, y: 320 }
        },
        'offline-player-2': {
          playerName: 'Test Player 2',
          avatarID: 'avatar2',
          position: { x: 350, y: 350 }
        }
      };
      
      gameStateRef.current.players = offlinePlayers;
      setOnlinePlayers(Object.keys(offlinePlayers).length);
    });

    socketRef.current.on("updatePlayers", (players) => {
      console.log("Received players update:", Object.keys(players).length);
      gameStateRef.current.players = players;
      
      // Set online players count and ensure we show connected status
      const playerCount = Object.keys(players).length;
      setOnlinePlayers(playerCount);
      
      // If we have players data, we must be connected, so make sure UI reflects that
      if (playerCount > 0) {
        setServerConnected(true);
      }
    });

    // Phaser game configuration and scene
    const config = {
      type: Phaser.AUTO,
      parent: "game-container",
      width: window.innerWidth,
      height: window.innerHeight,
      pixelArt: true,
      physics: {
        default: "arcade",
        arcade: {
          gravity: { y: 0 },
          debug: false // Will be toggled on in create
        }
      },
      scene: {
        preload: function () {
          this.load.on("progress", (value) => {
            setLoadingProgress(Math.round(value * 100));
          });
          this.load.on("complete", () => {
            setIsLoading(false);
          });
          
          // Load tileset image
          this.load.image('tile1', '/assets/tiles/tile1.png');
          
          // Load the map
          this.load.tilemapTiledJSON('campus-map', '/assets/map/v3.tmj');
        },
        create: function () {
          try {
            console.log("Creating game scene...");
            
            // Create the map from the JSON
            const map = this.make.tilemap({ key: 'campus-map' });
            console.log("Map created:", map);
            
            // Log map layers to confirm what's available
            console.log("Map layers:", map.layers.map(layer => layer.name));
            
            // Add the tileset - Make sure to use the exact name from your Tiled map
            const tileset = map.addTilesetImage('tile1', 'tile1');
            
            if (!tileset) {
              throw new Error("Failed to load tileset. Check the tileset name in the map file.");
            }
            
            console.log("Tileset added successfully:", tileset);
            
            // Create all layers from the map - using the layer names from the Tiled file
            // Fix: use let instead of const for these variables to avoid reassignment warning
            let groundLayer;
            try {
              groundLayer = map.createLayer('ground', tileset);
            } catch (error) {
              console.warn("Error creating ground layer by name:", error);
              groundLayer = map.createLayer(0, tileset);
            }
            
            if (!groundLayer) {
              throw new Error("Failed to create ground layer");
            }
            gameStateRef.current.mapLayers.ground = groundLayer;
            
            console.log("Ground layer created:", groundLayer);
            
            // Layer 1 is 'Walls'
            let wallsLayer;
            try {
              wallsLayer = map.createLayer('Walls', tileset);
            } catch (error) {
              console.warn("Error creating walls layer by name:", error);
              wallsLayer = map.createLayer(1, tileset);
            }
            
            if (!wallsLayer) {
              throw new Error("Failed to create walls layer");
            }
            gameStateRef.current.mapLayers.walls = wallsLayer;
            
            console.log("Walls layer created:", wallsLayer);
            
            // CRITICAL FIX: Make walls actually collidable
            // This is the key change - explicitly set collision for ALL tiles in the walls layer
            wallsLayer.setCollisionByExclusion([-1], true);
            
            console.log("Wall collision set for all non-empty tiles");
            
            // Log how many collidable tiles we have on the walls layer
            const collidableTiles = wallsLayer.filterTiles(tile => tile.collides).length;
            console.log(`Number of collidable tiles in walls layer: ${collidableTiles}`);
            
            // Set world bounds based on map size
            const mapWidth = map.widthInPixels;
            const mapHeight = map.heightInPixels;
            this.physics.world.setBounds(0, 0, mapWidth, mapHeight);
            console.log("World bounds set:", mapWidth, mapHeight);
            
            // Use spawn point from the Objects layer if available
            let spawnX = 16 * 25; // Default spawn position
            let spawnY = 16 * 15;
            
            // Try to get spawn from Objects layer
            const spawnPoint = map.findObject('Objects', obj => obj.name === 'Spawn');
            if (spawnPoint) {
              spawnX = spawnPoint.x;
              spawnY = spawnPoint.y;
              console.log("Using spawn point from map:", spawnX, spawnY);
            }
            
            // Create player
            gameStateRef.current.player = this.add.rectangle(
              spawnX, spawnY, 14, 14, 
              AVATAR_COLORS[gameStateRef.current.avatarID]
            );
            
            this.physics.add.existing(gameStateRef.current.player);
            
            // IMPORTANT: Make the player's collision body slightly smaller than the visual rectangle
            gameStateRef.current.player.body.setSize(12, 12);
            gameStateRef.current.player.body.setOffset(1, 1);
            
            gameStateRef.current.player.body.setCollideWorldBounds(true);
            
            // Add player name text
            gameStateRef.current.playerNameText = this.add.text(
              spawnX, spawnY - 16, 
              gameStateRef.current.playerName, 
              {
                fontSize: "12px",
                fontFamily: "Arial",
                color: "#ffffff",
                stroke: "#000000",
                strokeThickness: 2
              }
            ).setOrigin(0.5);
            
            // Add debug text
            gameStateRef.current.debugText = this.add.text(
              10, 10,
              "Debug: Map loaded",
              {
                fontSize: '14px',
                fill: '#ffffff',
                backgroundColor: '#000000'
              }
            ).setScrollFactor(0).setDepth(1000);
            
            // CRITICAL FIX: Add collision with walls layer
            // Make sure the player collides with the walls
            const wallsCollider = this.physics.add.collider(
              gameStateRef.current.player, 
              wallsLayer
            );
            
            console.log("Added collision between player and walls:", wallsCollider);
            
            // Camera follow
            this.cameras.main.startFollow(gameStateRef.current.player, true);
            this.cameras.main.setZoom(2); // Good zoom level for 16x16 tiles
            console.log("Camera following player");
            
            // Set up keyboard controls
            gameStateRef.current.cursors = this.input.keyboard.createCursorKeys();
            gameStateRef.current.gameInitialized = true;
            
            // Send join event if socket is connected
            if (socketRef.current && socketRef.current.connected) {
              socketRef.current.emit("join", {
                userId: gameStateRef.current.userId,
                playerName: gameStateRef.current.playerName,
                avatarID: gameStateRef.current.avatarID,
                position: { x: spawnX, y: spawnY }
              });
              console.log("Sent join event");
            } else {
              console.log("Socket not connected yet, couldn't send join event");
            }
            
            // Handle other players
            this.updateOtherPlayers = () => {
              const currentPlayers = gameStateRef.current.players;
              const myId = gameStateRef.current.userId;
              
              // Create or update other player entities
              Object.keys(currentPlayers).forEach(playerId => {
                if (playerId !== myId) {
                  const playerData = currentPlayers[playerId];
                  
                  if (!gameStateRef.current.playerEntities[playerId]) {
                    // Create new player entity
                    gameStateRef.current.playerEntities[playerId] = this.add.rectangle(
                      playerData.position.x, playerData.position.y,
                      14, 14,
                      AVATAR_COLORS[playerData.avatarID || 'avatar3']
                    );
                    
                    // Create name text
                    gameStateRef.current.playerTexts[playerId] = this.add.text(
                      playerData.position.x, playerData.position.y - 16,
                      playerData.playerName || "Player",
                      {
                        fontSize: "12px",
                        fontFamily: "Arial", 
                        color: "#ffffff",
                        stroke: "#000000",
                        strokeThickness: 2
                      }
                    ).setOrigin(0.5);
                    
                    console.log(`Created player entity for ${playerData.playerName || "Player"}`);
                  } else {
                    // Update existing player
                    gameStateRef.current.playerEntities[playerId].setPosition(
                      playerData.position.x, playerData.position.y
                    );
                    gameStateRef.current.playerTexts[playerId].setPosition(
                      playerData.position.x, playerData.position.y - 16
                    );
                  }
                }
              });
              
              // Remove disconnected players
              Object.keys(gameStateRef.current.playerEntities).forEach(playerId => {
                if (!currentPlayers[playerId] || playerId === myId) {
                  if (gameStateRef.current.playerEntities[playerId]) {
                    gameStateRef.current.playerEntities[playerId].destroy();
                    delete gameStateRef.current.playerEntities[playerId];
                  }
                  if (gameStateRef.current.playerTexts[playerId]) {
                    gameStateRef.current.playerTexts[playerId].destroy();
                    delete gameStateRef.current.playerTexts[playerId];
                  }
                }
              });
            };
            
            // Setup keyboard shortcuts
            this.input.keyboard.on("keydown-F", () => {
              if (this.scale.isFullscreen) {
                this.scale.stopFullscreen();
                setIsFullscreen(false);
              } else {
                this.scale.startFullscreen();
                setIsFullscreen(true);
              }
            });
            
            // Reset zoom key
            this.input.keyboard.on("keydown-R", () => {
              this.cameras.main.setZoom(2);
            });
            
            // Mouse wheel zoom
            this.input.on("wheel", (pointer, gameObjects, deltaX, deltaY) => {
              const currentZoom = this.cameras.main.zoom;
              if (deltaY > 0 && currentZoom > 1) {
                this.cameras.main.setZoom(currentZoom - 0.2);
              } else if (deltaY < 0 && currentZoom < 4) {
                this.cameras.main.setZoom(currentZoom + 0.2);
              }
            });
            
            // Debug key - toggle collision debug
            this.input.keyboard.on("keydown-D", () => {
              this.physics.world.debugGraphic.clear();
              this.physics.world.drawDebug = !this.physics.world.drawDebug;
              
              if (this.physics.world.drawDebug) {
                gameStateRef.current.debugText.setText("Debug: Collision ON");
              } else {
                gameStateRef.current.debugText.setText("Debug: Collision OFF");
              }
              
              if (!this.physics.world.debugGraphic) {
                this.physics.world.createDebugGraphic();
              }
            });
            
            // Immediately toggle debug on for testing
            this.physics.world.drawDebug = true;
            this.physics.world.createDebugGraphic();
            
            console.log("Game scene created successfully");
            
          } catch (error) {
            console.error("Error in create function:", error);
            setErrorMessage(`Error creating game scene: ${error.message}`);
            
            // Still set debug text to show error
            if (gameStateRef.current.debugText) {
              gameStateRef.current.debugText.setText(`Error: ${error.message}`);
            } else {
              gameStateRef.current.debugText = this.add.text(
                10, 10,
                `Error: ${error.message}`,
                {
                  fontSize: '14px',
                  fill: '#ff0000',
                  backgroundColor: '#000000'
                }
              ).setScrollFactor(0).setDepth(1000);
            }
          }
        },
        update: function () {
          if (!gameStateRef.current.player || !gameStateRef.current.cursors) return;
          
          // Handle movement
          let velocityX = 0;
          let velocityY = 0;
          
          if (gameStateRef.current.cursors.up.isDown || this.input.keyboard.checkDown(this.input.keyboard.addKey('W'))) {
            velocityY = -gameStateRef.current.moveSpeed;
          } else if (gameStateRef.current.cursors.down.isDown || this.input.keyboard.checkDown(this.input.keyboard.addKey('S'))) {
            velocityY = gameStateRef.current.moveSpeed;
          }
          
          if (gameStateRef.current.cursors.left.isDown || this.input.keyboard.checkDown(this.input.keyboard.addKey('A'))) {
            velocityX = -gameStateRef.current.moveSpeed;
          } else if (gameStateRef.current.cursors.right.isDown || this.input.keyboard.checkDown(this.input.keyboard.addKey('D'))) {
            velocityX = gameStateRef.current.moveSpeed;
          }
          
          // Normalize diagonal movement
          if (velocityX !== 0 && velocityY !== 0) {
            const length = Math.sqrt(velocityX * velocityX + velocityY * velocityY);
            velocityX = (velocityX / length) * gameStateRef.current.moveSpeed;
            velocityY = (velocityY / length) * gameStateRef.current.moveSpeed;
          }
          
          // Update player
          gameStateRef.current.player.body.setVelocity(velocityX, velocityY);
          gameStateRef.current.playerNameText.setPosition(
            gameStateRef.current.player.x, 
            gameStateRef.current.player.y - 16
          );
          
          // Update debug text with current player position and connection status
          if (gameStateRef.current.debugText) {
            const x = Math.floor(gameStateRef.current.player.x);
            const y = Math.floor(gameStateRef.current.player.y);
            const tileX = Math.floor(x/16);
            const tileY = Math.floor(y/16);
            
            // Get the tile at the player's position
            const wallsLayer = gameStateRef.current.mapLayers.walls;
            let wallTileInfo = "No wall data";
            
            if (wallsLayer) {
              const tile = wallsLayer.getTileAtWorldXY(x, y);
              wallTileInfo = tile ? `Wall tile: ${tile.index} (collides: ${tile.collides})` : "No wall tile";
            }
            
            // Show connection status and player count in debug text
            const connectionStatus = socketRef.current && socketRef.current.connected ? 
              "Connected" : "Disconnected";
            const playerCount = Object.keys(gameStateRef.current.players).length;
            
            gameStateRef.current.debugText.setText(
              `Pos: ${x},${y} | Tile: ${tileX},${tileY}\n` +
              `${wallTileInfo}\n` +
              `Socket: ${connectionStatus} | Players: ${playerCount}`
            );
          }
          
          // Send movement to server
          const { x, y } = gameStateRef.current.player;
          const threshold = 1;
          const positionChanged =
            Math.abs(x - gameStateRef.current.lastMovement.x) > threshold ||
            Math.abs(y - gameStateRef.current.lastMovement.y) > threshold;
            
          if (positionChanged && socketRef.current && socketRef.current.connected) {
            socketRef.current.emit("move", {
              userId: gameStateRef.current.userId,
              position: { x, y }
            });
            gameStateRef.current.lastMovement = { x, y };
          }
          
          // Update other players
          if (this.updateOtherPlayers) {
            this.updateOtherPlayers();
          }
        }
      }
    };

    if (!gameRef.current) {
      gameRef.current = new Phaser.Game(config);
    }

    const handleResize = () => {
      if (gameRef.current) {
        gameRef.current.scale.resize(window.innerWidth, window.innerHeight);
      }
    };

    window.addEventListener("resize", handleResize);

    return () => {
      window.removeEventListener("resize", handleResize);
      if (socketRef.current) {
        socketRef.current.disconnect();
      }
      if (gameRef.current) {
        gameRef.current.destroy(true);
        gameRef.current = null;
      }
    };
  }, [navigate, user]);

  const handleLeaveCampus = () => {
    if (socketRef.current && socketRef.current.connected) {
      socketRef.current.emit("leave", { userId: user?.email });
    }
    navigate("/avatar");
  };

  const handleReconnect = () => {
    window.location.reload();
  };

  return (
    <div className="campus-container">
      {isLoading && (
        <div className="loading-overlay">
          <div className="loading-content">
            <div className="campus-logo">
              <div className="campus-logo-box"></div>
              <div className="campus-logo-circle"></div>
            </div>
            <h1>LOADING CAMPUS</h1>
            <div className="loading-progress-bar">
              <div className="loading-progress-fill" style={{ width: `${loadingProgress}%` }}></div>
            </div>
            <div className="loading-percentage">{loadingProgress}%</div>
          </div>
        </div>
      )}
      
      {errorMessage && !serverConnected && (
        <div className="error-message">
          <div className="error-content">
            <h3>Connection Notice</h3>
            <p>{errorMessage}</p>
            <button onClick={handleReconnect}>Reconnect</button>
          </div>
        </div>
      )}

      <div id="game-container"></div>

      <div className="campus-ui">
        <div className="campus-header">
          <div className="campus-brand">
            <div className="campus-brand-icon">
              <div className="campus-brand-square"></div>
              <div className="campus-brand-circle"></div>
            </div>
            <h1 className="campus-brand-name">METACHARUSAT</h1>
          </div>

          <div className="campus-controls">
            <div className="control-item">
              <span className="control-key">WASD</span>
              <span className="control-desc">Move</span>
            </div>
            <div className="control-item">
              <span className="control-key">F</span>
              <span className="control-desc">Fullscreen</span>
            </div>
            <div className="control-item">
              <span className="control-key">R</span>
              <span className="control-desc">Reset Zoom</span>
            </div>
            <div className="control-item">
              <span className="control-key">Scroll</span>
              <span className="control-desc">Zoom</span>
            </div>
            <div className="control-item">
              <span className="control-key">D</span>
              <span className="control-desc">Debug</span>
            </div>
          </div>

          <div className="campus-status">
            <div className="status-item">
              <div className={`status-indicator ${serverConnected ? 'online' : 'offline'}`}></div>
              <span>{serverConnected ? `${onlinePlayers} Online` : "Offline"}</span>
            </div>
            <button className="leave-campus-btn" onClick={handleLeaveCampus}>EXIT CAMPUS</button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CampusMap;