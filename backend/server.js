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

// Load env variables
dotenv.config();

const app = express();

// Connect to MongoDB
connectDB();

// Middlewares
app.use(cors());
app.use(express.json());
app.use(
  session({
    secret: process.env.SESSION_SECRET,
    resave: false,
    saveUninitialized: false
  })
);
app.use(passport.initialize());
app.use(passport.session());

// Routes
app.use("/api/auth", authRoutes);

// HTTPS options using certificate keys from /backend/cert
const PORT = process.env.PORT || 5000;
const certPath = path.join(process.cwd(), "cert", "server.cert");
const keyPath = path.join(process.cwd(), "cert", "server.key");
const options = {
  key: fs.readFileSync(keyPath),
  cert: fs.readFileSync(certPath)
};

https.createServer(options, app).listen(PORT, () =>
  console.log(`HTTPS server running on https://localhost:${PORT}`)
);