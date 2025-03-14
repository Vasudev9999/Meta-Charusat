import express from "express";
import dotenv from "dotenv";
import cors from "cors";
import session from "express-session";
import fs from "fs";
import https from "https";
import http from "http";
import path from "path";
import passport from "./config/passport.js";
import { connectDB } from "./config/db.js";
import authRoutes from "./routes/auth.js";
import { Server } from "socket.io";

dotenv.config();

// ---------- SSL SETUP ----------
const certPath = path.join(process.cwd(), "cert", "server.cert");
const keyPath = path.join(process.cwd(), "cert", "server.key");
let httpsOptions;
try {
  httpsOptions = {
    key: fs.readFileSync(keyPath),
    cert: fs.readFileSync(certPath),
  };
} catch (err) {
  console.warn("SSL certificates not found or invalid. Running in HTTP mode only.");
  console.error(err);
}

// ---------- CREATE A SINGLE EXPRESS APP ----------
const app = express();

// Connect to MongoDB
connectDB();

// Global middleware (for both auth and campus endpoints)
app.use(cors());
app.use(express.json());
app.use(
  session({
    secret: process.env.SESSION_SECRET,
    resave: false,
    saveUninitialized: false,
  })
);
app.use(passport.initialize());
app.use(passport.session());

// Mount auth routes under /api/auth
app.use("/api/auth", authRoutes);

// Campus health check endpoint
app.get("/campus", (req, res) => {
  res.send("Campus socket server running");
});

// ---------- PORTS ----------
const PORT_AUTH = process.env.AUTH_PORT || 5000;        // For Auth endpoints
const PORT_CAMPUS_HTTPS = process.env.CAMPUS_HTTPS_PORT || 7000; // For socket (HTTPS)
const PORT_CAMPUS_HTTP = process.env.CAMPUS_HTTP_PORT || 7001;   // For socket (HTTP, development)

// ---------- CREATE SERVERS ----------
// For auth endpoints and campus socket endpoints, we use the same app.
// If SSL is available, create an HTTPS server; otherwise fallback to HTTP.
const authServer = httpsOptions ? https.createServer(httpsOptions, app) : http.createServer(app);

// For campus sockets, we create both HTTPS and HTTP servers (if desired).
const campusHttpsServer = httpsOptions ? https.createServer(httpsOptions, app) : null;
const campusHttpServer = http.createServer(app);

// ---------- SET UP SOCKET.IO ----------
// Socket options to allow our expected origins.
const socketOptions = {
  cors: {
    origin: ["http://localhost:5173", "https://localhost:5173"],
    methods: ["GET", "POST"],
    credentials: true,
  },
  transports: ["websocket", "polling"],
};

// Create Socket.IO instances
const ioHttps = campusHttpsServer ? new Server(campusHttpsServer, socketOptions) : null;
const ioHttp = new Server(campusHttpServer, socketOptions);

// ---------- SOCKET EVENT HANDLERS ----------
// Global players object keyed by unique userId (for example, email).
const players = {};

// Common function for handling events.
const setupSocketEvents = (socketIo) => {
  socketIo.on("connection", (socket) => {
    console.log(`[${new Date().toISOString()}] Client connected: ${socket.id}`);
    
    socket.on("join", (data) => {
      console.log(`[${new Date().toISOString()}] Received join from ${data.userId} on socket ${socket.id}`);
      players[data.userId] = {
        ...data,
        socketId: socket.id,
        position: data.position || { x: 50, y: 50 },
        speaking: false,
        lastUpdated: Date.now(),
      };
      socketIo.emit("updatePlayers", players);
    });

    socket.on("move", (data) => {
      if (players[data.userId]) {
        players[data.userId].position = data.position;
        players[data.userId].lastUpdated = Date.now();
        socketIo.emit("updatePlayers", players);
      }
    });

    socket.on("speaking", (data) => {
      if (players[data.userId]) {
        players[data.userId].speaking = data.speaking;
        socketIo.emit("updatePlayers", players);
      }
    });

    // Forward WebRTC signaling
    socket.on("voiceSignal", (data) => {
      console.log(`[${new Date().toISOString()}] Voice signal from ${data.from} to ${data.to}`);
      socket.broadcast.emit("voiceSignal", data);
    });

    socket.on("leave", (data) => {
      if (data && data.userId && players[data.userId]) {
        console.log(`[${new Date().toISOString()}] ${data.userId} left from socket ${socket.id}`);
        delete players[data.userId];
        socketIo.emit("updatePlayers", players);
      }
    });

    socket.on("disconnect", () => {
      console.log(`[${new Date().toISOString()}] Client disconnected: ${socket.id}`);
      // Remove player based on socket id.
      for (const userId in players) {
        if (players[userId].socketId === socket.id) {
          console.log(`[${new Date().toISOString()}] Removing user ${userId} due to disconnect`);
          delete players[userId];
          break;
        }
      }
      socketIo.emit("updatePlayers", players);
    });

    socket.on("error", (error) => {
      console.error(`[${new Date().toISOString()}] Socket error on ${socket.id}:`, error);
    });
  });
};

// Set up events on both socket instances.
if (ioHttps) setupSocketEvents(ioHttps);
setupSocketEvents(ioHttp);

// Periodic cleanup for inactive players (5 minute timeout)
const PLAYER_TIMEOUT = 5 * 60 * 1000; // 5 minutes
setInterval(() => {
  const now = Date.now();
  let cleaned = 0;
  for (const userId in players) {
    if (now - players[userId].lastUpdated > PLAYER_TIMEOUT) {
      console.log(`[${new Date().toISOString()}] Removing inactive player ${userId}`);
      delete players[userId];
      cleaned++;
    }
  }
  if (cleaned > 0) {
    if (ioHttps) ioHttps.emit("updatePlayers", players);
    ioHttp.emit("updatePlayers", players);
    console.log(`[${new Date().toISOString()}] Cleaned ${cleaned} inactive players`);
  }
}, 60000); // Check every minute

// ---------- START SERVERS ----------
// Start auth server (for API endpoints)
authServer.listen(PORT_AUTH, () => {
  console.log(
    `Auth server running on ${httpsOptions ? "https" : "http"}://localhost:${PORT_AUTH}`
  );
});

// Start campus socket servers
if (campusHttpsServer) {
  campusHttpsServer.listen(PORT_CAMPUS_HTTPS, () => {
    console.log(`Campus HTTPS socket server running on https://localhost:${PORT_CAMPUS_HTTPS}`);
  });
}

campusHttpServer.listen(PORT_CAMPUS_HTTP, () => {
  console.log(`Campus HTTP socket server running on http://localhost:${PORT_CAMPUS_HTTP}`);
});

// ---------- GRACEFUL SHUTDOWN ----------
const shutdown = () => {
  console.log("Shutting down servers...");
  authServer.close(() => console.log("Auth server closed"));
  if (campusHttpsServer) campusHttpsServer.close(() => console.log("Campus HTTPS server closed"));
  campusHttpServer.close(() => console.log("Campus HTTP server closed"));
  setTimeout(() => {
    console.log("Exiting process");
    process.exit(0);
  }, 1000);
};

process.on("SIGTERM", shutdown);
process.on("SIGINT", shutdown);