import express from "express";
import dotenv from "dotenv";
import cors from "cors";
import session from "express-session";
import fs from "fs";
import https from "https";
import path from "path";
import passport from "./config/passport.js";
import { connectDB } from "./config/db.js";
import authRoutes from "./routes/auth.js";
import { Server } from "socket.io";

dotenv.config();

// ---------------------------
// Auth Server (Login, etc.)
// ---------------------------
const authApp = express();

// Connect to MongoDB
connectDB();

authApp.use(cors());
authApp.use(express.json());
authApp.use(
  session({
    secret: process.env.SESSION_SECRET,
    resave: false,
    saveUninitialized: false
  })
);
authApp.use(passport.initialize());
authApp.use(passport.session());
authApp.use("/api/auth", authRoutes);

const PORT_AUTH = process.env.PORT || 5000;
const certPath = path.join(process.cwd(), "cert", "server.cert");
const keyPath = path.join(process.cwd(), "cert", "server.key");
const httpsOptions = {
  key: fs.readFileSync(keyPath),
  cert: fs.readFileSync(certPath)
};

https.createServer(httpsOptions, authApp).listen(PORT_AUTH, () =>
  console.log(`Auth HTTPS server running on https://localhost:${PORT_AUTH}`)
);

// ---------------------------
// Campus Socket Server
// ---------------------------
const campusApp = express();
campusApp.use(cors());
campusApp.use(express.json());

campusApp.get("/", (req, res) => {
  res.send("Campus socket server running");
});

const PORT_CAMPUS = 7000;
const campusServer = https.createServer(httpsOptions, campusApp);

const io = new Server(campusServer, {
  cors: {
    origin: ["http://localhost:5173", "https://localhost:5173"],
    methods: ["GET", "POST"],
    credentials: true
  }
});

// Global players object keyed by unique user identifier (e.g. email)
const players = {};

io.on("connection", (socket) => {
  console.log(
    `[${new Date().toISOString()}] Campus client connected: socket.id ${socket.id} on port ${PORT_CAMPUS}`
  );

  socket.on("join", (data) => {
    console.log(
      `[${new Date().toISOString()}] Received join from ${data.userId} on socket ${socket.id}`
    );
    players[data.userId] = {
      ...data,
      socketId: socket.id,
      position: { x: 50, y: 50 },
      speaking: false
    };
    io.emit("updatePlayers", players);
    console.log(
      `[${new Date().toISOString()}] Players: ${JSON.stringify(players)}`
    );
  });

  socket.on("move", (data) => {
    if (players[data.userId]) {
      players[data.userId].position = data.position;
      io.emit("updatePlayers", players);
      console.log(
        `[${new Date().toISOString()}] ${data.userId} moved to (${data.position.x}, ${data.position.y})`
      );
    }
  });

  socket.on("speaking", (data) => {
    if (players[data.userId]) {
      players[data.userId].speaking = data.speaking;
      io.emit("updatePlayers", players);
      console.log(
        `[${new Date().toISOString()}] ${data.userId} speaking: ${data.speaking}`
      );
    }
  });

  // Forward voice signal events for WebRTC signaling.
  socket.on("voiceSignal", (data) => {
    // data should include: { from, to, signal }
    console.log(
      `[${new Date().toISOString()}] Voice signal from ${data.from} to ${data.to}`
    );
    socket.broadcast.emit("voiceSignal", data);
  });

  socket.on("leave", (data) => {
    if (players[data.userId]) {
      console.log(
        `[${new Date().toISOString()}] ${data.userId} left campus from socket ${socket.id}`
      );
      delete players[data.userId];
      io.emit("updatePlayers", players);
    }
  });

  socket.on("disconnect", () => {
    console.log(
      `[${new Date().toISOString()}] Campus client disconnected: socket.id ${socket.id} on port ${PORT_CAMPUS}`
    );
    for (const userId in players) {
      if (players[userId].socketId === socket.id) {
        console.log(
          `[${new Date().toISOString()}] Removing user ${userId} due to disconnect`
        );
        delete players[userId];
        break;
      }
    }
    io.emit("updatePlayers", players);
  });
});

campusServer.listen(PORT_CAMPUS, () => {
  console.log(`Campus HTTPS socket server running on https://localhost:${PORT_CAMPUS}`);
});