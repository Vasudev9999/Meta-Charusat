import mongoose from "mongoose";

const UserSchema = new mongoose.Schema({
  username: { type: String, required: true },
  playerName: { type: String, default: "" },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  avatarID: { type: String, default: "" },
  authType: { type: String, default: "email" }
});

export default mongoose.model("User", UserSchema);