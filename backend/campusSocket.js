import { createServer } from "https";
import express from "express";
import fs from "fs";
import path from "path";
import cors from "cors";
import { Server } from "socket.io";

// Global players object to store connected players keyed by unique userId.
const players = {};

const app = express();
app.use(cors());
app.use(express.json());

app.get("/", (req, res) => {
  res.send("Campus socket server running");
});

// HTTPS options using certificate keys from your cert folder
const certPath = path.join(process.cwd(), "cert", "server.cert");
const keyPath = path.join(process.cwd(), "cert", "server.key");
const options = {
  key: fs.readFileSync(keyPath),
  cert: fs.readFileSync(certPath),
};

// Create HTTPS server for campus socket functionality.
const httpsServer = createServer(options, app);

// Initialize socket.io on this HTTPS server – running on port 6000.
const io = new Server(httpsServer, {
  cors: {
    origin: "https://localhost:5173", // your frontend URL
    methods: ["GET", "POST"],
    credentials: true,
  },
});

io.on("connection", (socket) => {
  console.log(
    `[${new Date().toISOString()}] Client connected: socket.id ${socket.id} on campus port 6000`
  );

  // When a client joins campus.
  socket.on("join", (data) => {
    // data should include: { userId, playerName, avatarID }
    // Ensure players use a unique userId (e.g. email).
    players[data.userId] = {
      ...data,
      socketId: socket.id,
      position: { x: 50, y: 50 },
      speaking: false,
    };
    io.emit("updatePlayers", players);
    console.log(
      `[${new Date().toISOString()}] User ${data.userId} joined campus from socket ${socket.id}`
    );
  });

  // Listen for movement updates.
  socket.on("move", (data) => {
    if (players[data.userId]) {
      players[data.userId].position = data.position;
      io.emit("updatePlayers", players);
    }
  });

  // Listen for speaking status updates.
  socket.on("speaking", (data) => {
    if (players[data.userId]) {
      players[data.userId].speaking = data.speaking;
      io.emit("updatePlayers", players);
    }
  });

  // Optional manual leave event.
  socket.on("leave", (data) => {
    if (players[data.userId]) {
      console.log(
        `[${new Date().toISOString()}] User ${data.userId} left campus from socket ${socket.id}`
      );
      delete players[data.userId];
      io.emit("updatePlayers", players);
    }
  });

  // On disconnect, remove the player associated with the socket.
  socket.on("disconnect", () => {
    console.log(
      `[${new Date().toISOString()}] Client disconnected: socket.id ${socket.id} on campus port 6000`
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

// Start the campus socket server on port 6000.
const PORT = 6000;
httpsServer.listen(PORT, () => {
  console.log(`Campus HTTPS socket server running on https://localhost:${PORT}`);
});