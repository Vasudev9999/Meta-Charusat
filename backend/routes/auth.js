import express from "express";
import { register, login, updateAvatarAndPlayerName } from "../controllers/authController.js";
import passport from "passport";

const router = express.Router();

router.post("/register", register);
router.post("/login", login);
router.put("/update-avatar", updateAvatarAndPlayerName);  // Updated endpoint

// Initiate Google Login
router.get(
  "/google",
  passport.authenticate("google", { scope: ["profile", "email"] })
);

// Example Google callback in backend (routes/auth.js):
router.get(
  "/google/callback",
  passport.authenticate("google", { failureRedirect: "/login" }),
  (req, res) => {
    req.user.email = req.user.email || req.user.emails?.[0]?.value;
    if (!req.user.playerName) {
      req.user.playerName = req.user.username;
    }
    res.redirect(
      `https://localhost:5173/avatar?email=${req.user.email}&username=${req.user.username}&playerName=${req.user.playerName}&avatarID=${req.user.avatarID}`
    );
  }
);

export default router;