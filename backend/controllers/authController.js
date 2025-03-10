import User from "../models/User.js";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import dotenv from "dotenv";
dotenv.config();

export const login = async (req, res) => {
  const { email, password } = req.body;
  try {
    let user = await User.findOne({ email });
    if (!user)
      return res.status(400).json({ message: "Invalid credentials" });

    if (user.authType !== "google") {
      const isMatch = await bcrypt.compare(password, user.password);
      if (!isMatch)
        return res.status(400).json({ message: "Invalid credentials" });
    }
    
    const secret = process.env.JWT_SECRET || "default_jwt_secret";
    const token = jwt.sign({ id: user._id }, secret, { expiresIn: "1h" });
    
    // Ensure playerName: if not set, fallback to username.
    const playerName = user.playerName || user.username;
    
    res.json({
      token,
      user: { 
        id: user._id, 
        username: user.username,      // Fixed account name
        playerName,                   // Customizable display name
        email: user.email, 
        avatarID: user.avatarID 
      }
    });
  } catch (error) {
    console.error("Login error:", error);
    res.status(500).json({ message: "Server error" });
  }
};

export const register = async (req, res) => {
  const { username, email, password } = req.body;
  try {
    let user = await User.findOne({ email });
    if (user)
      return res.status(400).json({ message: "User already exists" });

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);
    // Set playerName equal to username by default.
    user = new User({ username, playerName: username, email, password: hashedPassword });
    await user.save();
    res.status(201).json({
      message: "User registered successfully",
      user: { 
        id: user._id, 
        username: user.username, 
        playerName: user.playerName,
        email: user.email,
        avatarID: user.avatarID 
      }
    });
  } catch (error) {
    console.error("Registration error:", error);
    res.status(500).json({ message: "Server error" });
  }
};

// New function to update avatar and playerName
export const updateAvatarAndPlayerName = async (req, res) => {
  // Expecting { email, playerName, avatarID } in req.body.
  const { email, playerName, avatarID } = req.body;
  try {
    let user = await User.findOne({ email });
    if (!user)
      return res.status(400).json({ message: "User not found" });
    
    // Update only the display name (playerName) and the avatarID.
    user.playerName = playerName;
    user.avatarID = avatarID;
    await user.save();
    
    res.json({
      message: "Avatar updated successfully",
      user: { 
        username: user.username,       // account name remains unchanged
        playerName: user.playerName,     // updated display name
        avatarID: user.avatarID 
      }
    });
  } catch (err) {
    console.error("Avatar update error:", err);
    res.status(500).json({ message: "Server error" });
  }
};