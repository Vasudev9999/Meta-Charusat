import express from "express";
import { register, login } from "../controllers/authController.js";
import passport from "passport";

const router = express.Router();

router.post("/register", register);
router.post("/login", login);

// Initiate Google Login
router.get(
  "/google",
  passport.authenticate("google", { scope: ["profile", "email"] })
);

// Handle callback from Google
router.get(
  "/google/callback",
  passport.authenticate("google", { failureRedirect: "/login" }),
  (req, res) => {
    // On successful auth, redirect to frontend (adjust URL and protocol as needed)
    res.redirect(`http://localhost:5173/avatar?username=${req.user.username}`);
  }
);

export default router;