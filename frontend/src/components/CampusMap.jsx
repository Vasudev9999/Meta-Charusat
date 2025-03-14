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

// Secondary colors for avatar details
const AVATAR_SECONDARY_COLORS = {
  avatar1: 0xFF8080,  // Lighter Phoenix
  avatar2: 0x80CFFF,  // Lighter Oceanic
  avatar3: 0x80FFAC,  // Lighter Emerald
  avatar4: 0xFFCC80,  // Lighter Solar
  avatar5: 0xD480FF   // Lighter Cosmic
};

// Default avatar if user doesn't have one set
const DEFAULT_AVATAR = "avatar3";

// Local storage key for last player position
const LAST_POSITION_KEY = "metacharusat_last_position";

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
  const [mapVersion, setMapVersion] = useState(Date.now()); // For cache busting
  const [initialLoadComplete, setInitialLoadComplete] = useState(false);
  useEffect(() => {
    // When the component first mounts, set a flag indicating it needs auto-refresh
    if (!initialLoadComplete && user) {
      setInitialLoadComplete(true);
      
      // Perform auto-refresh after a short delay
      const autoRefreshTimer = setTimeout(() => {
        console.log("Performing automatic initial refresh...");
        reloadMap();
      }, 2000); // 2 seconds after initial load
      
      return () => clearTimeout(autoRefreshTimer);
    }
  }, [initialLoadComplete, user]);
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
    lastSavedPosition: { x: 0, y: 0 },
    lastSaveTime: 0,
    player: null,
    playerNameText: null,
    gameInitialized: false,
    debugText: null,
    mapLayers: {}, // Will store all layers dynamically
    hasLoadedMap: false
  });

  // Function to create animated player sprite
  const createPlayerSprite = (scene, x, y, avatarType) => {
    // Create a container to hold all sprite parts
    const container = scene.add.container(x, y);
    
    // Get colors for this avatar type
    const primaryColor = AVATAR_COLORS[avatarType] || AVATAR_COLORS.avatar3;
    const secondaryColor = AVATAR_SECONDARY_COLORS[avatarType] || AVATAR_SECONDARY_COLORS.avatar3;
    
    // Create body parts using Graphics
    const head = scene.add.graphics();
    head.fillStyle(0xFFDDCC, 1); // Skin tone
    head.fillCircle(0, -6, 5);   // Head positioned above body
    
    const eyes = scene.add.graphics();
    eyes.fillStyle(0x000000, 1);
    eyes.fillCircle(-2, -7, 1);  // Left eye
    eyes.fillCircle(2, -7, 1);   // Right eye
    
    const body = scene.add.graphics();
    body.fillStyle(primaryColor, 1);
    body.fillRoundedRect(-4, -2, 8, 10, 2); // Body
    
    const feet = scene.add.graphics();
    feet.fillStyle(secondaryColor, 0);
    feet.fillRect(-3, 8, 2, 2); // Left foot
    feet.fillRect(1, 8, 2, 2);  // Right foot
    
    // Add all parts to container
    container.add([body, head, eyes, feet]);
    
    // Add a simple walking animation
    const walkingTween = scene.tweens.add({
      targets: feet,
      y: 7,
      duration: 200,
      ease: 'Power1',
      yoyo: true,
      repeat: -1,
      paused: true
    });
    
    // Store the walking tween in the container for later access
    container.walkingTween = walkingTween;
    
    // Add physics body to container
    scene.physics.add.existing(container);
    container.body.setSize(8, 12);
    container.body.setOffset(-4, -4);
    
    // Function to start walking animation
    container.startWalking = function() {
      if (this.walkingTween && this.walkingTween.isPaused()) {
        this.walkingTween.resume();
      }
    };
    
    // Function to stop walking animation
    container.stopWalking = function() {
      if (this.walkingTween && !this.walkingTween.isPaused()) {
        this.walkingTween.pause();
      }
    };
    
    return container;
  };

  // Function to save player position to localStorage
  const savePlayerPosition = (x, y) => {
    try {
      const position = { x, y };
      localStorage.setItem(LAST_POSITION_KEY, JSON.stringify(position));
      console.log("Saved player position:", position);
      gameStateRef.current.lastSavedPosition = position;
    } catch (error) {
      console.error("Error saving player position:", error);
    }
  };

  // Function to get last player position from localStorage
  const getLastPlayerPosition = () => {
    try {
      const positionString = localStorage.getItem(LAST_POSITION_KEY);
      if (positionString) {
        const position = JSON.parse(positionString);
        console.log("Retrieved last player position:", position);
        return position;
      }
    } catch (error) {
      console.error("Error retrieving player position:", error);
    }
    return null;
  };

  // Function to request player updates from server
  const requestPlayersUpdate = () => {
    if (socketRef.current && socketRef.current.connected) {
      socketRef.current.emit("requestPlayers");
      console.log("Requested players update");
    }
  };

  // Function to reload the map
  const reloadMap = () => {
    if (gameRef.current) {
      // Save current position before reloading if player exists
      if (gameStateRef.current.player) {
        savePlayerPosition(
          gameStateRef.current.player.x, 
          gameStateRef.current.player.y
        );
      }
      
      // Store current players data before destroying game
      const currentPlayers = {...gameStateRef.current.players};
      const myPosition = gameStateRef.current.player ? 
        { x: gameStateRef.current.player.x, y: gameStateRef.current.player.y } : 
        getLastPlayerPosition();
      
      // Destroy the current game
      gameRef.current.destroy(true);
      gameRef.current = null;
      
      // Update the map version to force a reload
      setMapVersion(Date.now());
      
      // Reset loading state
      setIsLoading(true);
      setLoadingProgress(0);
      
      // Reset the game state but keep important data
      const lastSavedPosition = gameStateRef.current.lastSavedPosition;
      gameStateRef.current.hasLoadedMap = false;
      gameStateRef.current.mapLayers = {};
      gameStateRef.current.lastSavedPosition = lastSavedPosition;
      
      // Preserve player entities info
      gameStateRef.current.playerEntities = {};
      gameStateRef.current.playerTexts = {};
      
      // Keep the players data
      gameStateRef.current.players = currentPlayers;
      
      // Create a new game with a short delay
      setTimeout(() => {
        initGame();
        
        // Re-emit join event to refresh player data after a delay
        setTimeout(() => {
          if (socketRef.current && socketRef.current.connected) {
            socketRef.current.emit("join", {
              userId: gameStateRef.current.userId,
              playerName: gameStateRef.current.playerName,
              avatarID: gameStateRef.current.avatarID,
              position: myPosition || { x: 16 * 25, y: 16 * 15 }
            });
            console.log("Re-sent join event after map reload");
            
            // Explicitly request player updates
            requestPlayersUpdate();
          }
        }, 1000);
      }, 500);
    }
  };

  // Initialize the game
  const initGame = () => {
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
          
          // Load tileset image with cache busting
          this.load.image('tile1', '/assets/tiles/tile1.png?' + mapVersion);
          
          // Load the map with cache busting to prevent browser caching
          this.load.tilemapTiledJSON('campus-map', '/assets/map/v3.tmj?' + mapVersion);
          
          console.log(`Loading map with version: ${mapVersion}`);
        },
        create: function () {
          try {
            console.log("Creating game scene...");
            
            // Create the map from the JSON
            const map = this.make.tilemap({ key: 'campus-map' });
            console.log("Map created:", map);
            
            // Check if map is infinite
            const isInfiniteMap = map.infinite === true;
            console.log("Map is infinite:", isInfiniteMap);
            
            // Log all available layer names from the map
            console.log("Available map layers:", map.layers.map(layer => layer.name));
            
            // Add the tileset
            const tileset = map.addTilesetImage('tile1', 'tile1');
            
            if (!tileset) {
              throw new Error("Failed to load tileset. Check the tileset name in the map file.");
            }
            
            console.log("Tileset added successfully:", tileset);
            
            // Get all layer names from the map
            const layerNames = map.layers.map(layer => layer.name);
            console.log("Processing layers:", layerNames);
            
            // Create all layers dynamically from the map
            layerNames.forEach((layerName, index) => {
              // Skip object layers - they're handled differently
              if (map.objects.some(objLayer => objLayer.name === layerName)) {
                console.log(`Skipping object layer: ${layerName}`);
                return;
              }
              
              console.log(`Creating layer: ${layerName}`);
              
              try {
                const layer = map.createLayer(layerName, tileset);
                
                if (layer) {
                  // Store each layer in our game state
                  gameStateRef.current.mapLayers[layerName] = layer;
                  console.log(`Layer ${layerName} created successfully`);
                  
                  // Check if this layer has collision properties
                  const hasCollisionProperty = map.getLayer(layerName).properties && 
                                             map.getLayer(layerName).properties.some(p => p.name === "collides" && p.value === true);
                  
                  // Set collisions based on properties or layer name conventions
                  if (hasCollisionProperty || layerName.toLowerCase().includes('wall') || layerName.toLowerCase().includes('collision')) {
                    layer.setCollisionByExclusion([-1], true);
                    console.log(`Set collision for layer: ${layerName}`);
                    
                    // Log collisions for debugging
                    const collidingTiles = layer.filterTiles(tile => tile.collides).length;
                    console.log(`Layer ${layerName} has ${collidingTiles} colliding tiles`);
                  }
                } else {
                  console.warn(`Failed to create layer: ${layerName}`);
                }
              } catch (error) {
                console.error(`Error creating layer ${layerName}:`, error);
              }
            });
            
            // Set world bounds for infinite exploration
            // Use very large bounds instead of the map size
            const LARGE_WORLD_SIZE = 10000; // Adjust this number as needed
            this.physics.world.setBounds(-LARGE_WORLD_SIZE/2, -LARGE_WORLD_SIZE/2, 
                                         LARGE_WORLD_SIZE, LARGE_WORLD_SIZE);
            console.log("Set large world bounds:", LARGE_WORLD_SIZE, "x", LARGE_WORLD_SIZE);
            
            // Determine spawn position - try to use last position first
            let spawnX = 16 * 25; // Default spawn position
            let spawnY = 16 * 15;
            
            // Get last position from local storage
            const lastPosition = getLastPlayerPosition();
            if (lastPosition) {
              spawnX = lastPosition.x;
              spawnY = lastPosition.y;
              console.log("Using last saved position:", spawnX, spawnY);
            } else {
              // Try to get spawn from Objects layer as fallback
              try {
                const spawnPoint = map.findObject('Objects', obj => obj.name === 'Spawn');
                if (spawnPoint) {
                  spawnX = spawnPoint.x;
                  spawnY = spawnPoint.y;
                  console.log("Using spawn point from map:", spawnX, spawnY);
                }
              } catch (error) {
                console.warn("Could not find spawn point:", error);
              }
            }
            
            // Create player using animated sprite
            gameStateRef.current.player = createPlayerSprite(
              this, spawnX, spawnY, gameStateRef.current.avatarID
            );
            
            // IMPORTANT: Don't restrict player to world bounds for infinite maps
            gameStateRef.current.player.body.setCollideWorldBounds(false);
            
            // Add player name text
            gameStateRef.current.playerNameText = this.add.text(
              spawnX, spawnY - 20, 
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
                        // Add collisions with all collision layers
                        Object.keys(gameStateRef.current.mapLayers).forEach(layerName => {
                          const layer = gameStateRef.current.mapLayers[layerName];
                          
                          // Check if this layer has any colliding tiles
                          if (layer.filterTiles(tile => tile.collides).length > 0) {
                            const collider = this.physics.add.collider(gameStateRef.current.player, layer);
                            console.log(`Added collision for player with layer: ${layerName}`);
                          }
                        });
                        
                        // Camera follow
                        this.cameras.main.startFollow(gameStateRef.current.player, true);
                        this.cameras.main.setZoom(2); // Good zoom level for 16x16 tiles
                        console.log("Camera following player");
                        
                        // Set up keyboard controls
                        gameStateRef.current.cursors = this.input.keyboard.createCursorKeys();
                        gameStateRef.current.gameInitialized = true;
                        gameStateRef.current.hasLoadedMap = true;
                        
                        // Send join event if socket is connected
                        if (socketRef.current && socketRef.current.connected) {
                          socketRef.current.emit("join", {
                            userId: gameStateRef.current.userId,
                            playerName: gameStateRef.current.playerName,
                            avatarID: gameStateRef.current.avatarID,
                            position: { x: spawnX, y: spawnY }
                          });
                          console.log("Sent join event");
                          
                          // Also request players update
                          setTimeout(() => {
                            socketRef.current.emit("requestPlayers");
                            console.log("Requested players update after join");
                          }, 500);
                        } else {
                          console.log("Socket not connected yet, couldn't send join event");
                        }
                        
                        // Handle other players with animated sprites
                        this.updateOtherPlayers = () => {
                          const currentPlayers = gameStateRef.current.players;
                          const myId = gameStateRef.current.userId;
                          
                          // Create or update other player entities
                          Object.keys(currentPlayers).forEach(playerId => {
                            if (playerId !== myId) {
                              const playerData = currentPlayers[playerId];
                              
                              if (!gameStateRef.current.playerEntities[playerId]) {
                                // Create new player entity with animated sprite
                                gameStateRef.current.playerEntities[playerId] = createPlayerSprite(
                                  this,
                                  playerData.position.x, 
                                  playerData.position.y,
                                  playerData.avatarID || 'avatar3'
                                );
                                
                                // Create name text
                                gameStateRef.current.playerTexts[playerId] = this.add.text(
                                  playerData.position.x, playerData.position.y - 20,
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
                                const sprite = gameStateRef.current.playerEntities[playerId];
                                const oldX = sprite.x;
                                
                                // Update position
                                sprite.setPosition(playerData.position.x, playerData.position.y);
                                gameStateRef.current.playerTexts[playerId].setPosition(
                                  playerData.position.x, playerData.position.y - 20
                                );
                                
                                // Animate walking if position changed significantly
                                const isMoving = Math.abs(playerData.position.x - oldX) > 1;
                                if (isMoving) {
                                  sprite.startWalking();
                                  
                                  // Face character in movement direction
                                  if (playerData.position.x < oldX) {
                                    sprite.scaleX = -1;
                                  } else if (playerData.position.x > oldX) {
                                    sprite.scaleX = 1;
                                  }
                                } else {
                                  sprite.stopWalking();
                                }
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
                        
                        // Reload map key
                        this.input.keyboard.on("keydown-M", () => {
                          reloadMap();
                        });
            
                        // Teleport to spawn key
                        this.input.keyboard.on("keydown-T", () => {
                          try {
                            const spawnPoint = map.findObject('Objects', obj => obj.name === 'Spawn');
                            if (spawnPoint && gameStateRef.current.player) {
                              gameStateRef.current.player.setPosition(spawnPoint.x, spawnPoint.y);
                              console.log("Teleported to spawn point:", spawnPoint.x, spawnPoint.y);
                            }
                          } catch (error) {
                            console.warn("Could not teleport to spawn:", error);
                          }
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
                        gameStateRef.current.player.y - 20
                      );
                      
                      // Control walking animation based on movement
                      if (velocityX !== 0 || velocityY !== 0) {
                        gameStateRef.current.player.startWalking();
                        
                        // Face character in movement direction
                        if (velocityX < 0) {
                          // Face left - flip the container
                          gameStateRef.current.player.scaleX = -1;
                        } else if (velocityX > 0) {
                          // Face right - normal scale
                          gameStateRef.current.player.scaleX = 1;
                        }
                      } else {
                        gameStateRef.current.player.stopWalking();
                      }
                      
                      // Periodically save player position for persistence
                      const now = Date.now();
                      if (!gameStateRef.current.lastSaveTime || now - gameStateRef.current.lastSaveTime > 5000) {
                        if (gameStateRef.current.player) {
                          savePlayerPosition(
                            gameStateRef.current.player.x,
                            gameStateRef.current.player.y
                          );
                          gameStateRef.current.lastSaveTime = now;
                        }
                      }
                      
                      // Update debug text with current player position and connection status
                      if (gameStateRef.current.debugText) {
                        const x = Math.floor(gameStateRef.current.player.x);
                        const y = Math.floor(gameStateRef.current.player.y);
                        const tileX = Math.floor(x/16);
                        const tileY = Math.floor(y/16);
                        
                        // Count visible players
                        const visiblePlayers = Object.keys(gameStateRef.current.playerEntities).length;
                        
                        // Show connection status and player count in debug text
                        const connectionStatus = socketRef.current && socketRef.current.connected ? 
                          "Connected" : "Disconnected";
                        const playerCount = Object.keys(gameStateRef.current.players).length;
                        const mapInfo = `Map v${mapVersion.toString().slice(-6)}`;
                        
                        gameStateRef.current.debugText.setText(
                          `Pos: ${x},${y} | Tile: ${tileX},${tileY}\n` +
                          `Socket: ${connectionStatus} | Players: ${playerCount} (Visible: ${visiblePlayers})\n` +
                          `${mapInfo} | Press 'M' to reload map | 'T' for spawn`
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
              };
            
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
                    
                    // Also explicitly request player list update
                    socketRef.current.emit("requestPlayers");
                    console.log("Requested players update after welcome");
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
            
                // Initialize the game
                initGame();
            
                const handleResize = () => {
                  if (gameRef.current) {
                    gameRef.current.scale.resize(window.innerWidth, window.innerHeight);
                  }
                };
            
                // Add handler for F5/refresh key to force map reload with cache busting
                const handleKeyDown = (e) => {
                  // F5 or Ctrl+R
                  if (e.key === 'F5' || (e.ctrlKey && e.key === 'r')) {
                    e.preventDefault();
                    reloadMap();
                  }
                  
                  // Alt+M shortcut for map reload
                  if (e.altKey && e.key === 'm') {
                    e.preventDefault();
                    reloadMap();
                  }
                };
            
                window.addEventListener("resize", handleResize);
                window.addEventListener("keydown", handleKeyDown);
            
                // Save player position before unloading the page
                const handleBeforeUnload = () => {
                  if (gameStateRef.current.player) {
                    savePlayerPosition(
                      gameStateRef.current.player.x,
                      gameStateRef.current.player.y
                    );
                  }
                };
                
                window.addEventListener("beforeunload", handleBeforeUnload);
            
                return () => {
                  window.removeEventListener("resize", handleResize);
                  window.removeEventListener("keydown", handleKeyDown);
                  window.removeEventListener("beforeunload", handleBeforeUnload);
                  
                  // Save position when component unmounts
                  if (gameStateRef.current.player) {
                    savePlayerPosition(
                      gameStateRef.current.player.x,
                      gameStateRef.current.player.y
                    );
                  }
                  
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
                // Save position before leaving
                if (gameStateRef.current.player) {
                  savePlayerPosition(
                    gameStateRef.current.player.x,
                    gameStateRef.current.player.y
                  );
                }
                
                if (socketRef.current && socketRef.current.connected) {
                  socketRef.current.emit("leave", { userId: user?.email });
                }
                navigate("/avatar");
              };
            
              const handleReconnect = () => {
                window.location.reload();
              };
            
              const handleReloadMap = () => {
                reloadMap();
                
                // Request players update after a delay to ensure game is initialized
                setTimeout(() => {
                  requestPlayersUpdate();
                }, 2000);
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
                          <span className="control-key">M</span>
                          <span className="control-desc">Reload Map</span>
                        </div>
                        <div className="control-item">
                          <span className="control-key">T</span>
                          <span className="control-desc">Teleport Home</span>
                        </div>
                        <div className="control-item">
                          <span className="control-key">D</span>
                          <span className="control-desc">Debug Mode</span>
                        </div>
                      </div>
            
                      <div className="campus-status">
                        <div className="status-item">
                          <div className={`status-indicator ${serverConnected ? 'online' : 'offline'}`}></div>
                          <span>{serverConnected ? `${onlinePlayers} Online` : "Offline"}</span>
                        </div>
                        <button className="reload-map-btn" onClick={handleReloadMap}>RELOAD MAP</button>
                        <button className="leave-campus-btn" onClick={handleLeaveCampus}>EXIT CAMPUS</button>
                      </div>
                    </div>
                  </div>
                </div>
              );
            };
            
            export default CampusMap;