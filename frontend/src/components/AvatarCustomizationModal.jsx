import React, { useState } from "react";
import { updateAvatar } from "../api/authApi";
import "./AvatarCustomizationModal.css";

const placeholderAvatars = [
  { id: "avatar1", label: "Avatar 1", color: "#f39c12" },
  { id: "avatar2", label: "Avatar 2", color: "#27ae60" },
  { id: "avatar3", label: "Avatar 3", color: "#2980b9" }
];

export default function AvatarCustomizationModal({
  currentName,
  currentAvatarID,
  onClose,
  onSave,
  user,
  onRequireLogin
}) {
  const defaultAvatar =
    currentAvatarID ||
    placeholderAvatars[Math.floor(Math.random() * placeholderAvatars.length)].id;
  const [selectedAvatar, setSelectedAvatar] = useState(defaultAvatar);
  const [displayName, setDisplayName] = useState(currentName || "");

  const handleSave = async () => {
    // Derive email: for Google users, user.email may be missing.
    const emailToUse = user?.email || (user?.emails && user.emails[0]?.value);
    if (!emailToUse) {
      console.log("User not logged in or missing email:", user);
      onRequireLogin();
      return;
    }
    try {
      const res = await updateAvatar({
        email: emailToUse,
        playerName: displayName,
        avatarID: selectedAvatar
      });
      onSave(res.data.user);
      onClose();
    } catch (error) {
      console.error("Error updating avatar:", error);
      alert("Error updating avatar");
    }
  };

  return (
    <div className="avatar-modal-overlay">
      <div className="avatar-modal-container">
        <h2>Customize Your Avatar</h2>
        <label>
          Display Name:
          <input
            type="text"
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
          />
        </label>
        <div className="avatar-options">
          {placeholderAvatars.map((avatar) => (
            <div
              key={avatar.id}
              className={`avatar-option ${selectedAvatar === avatar.id ? "selected" : ""}`}
              onClick={() => setSelectedAvatar(avatar.id)}
            >
              <div className="avatar-shape" style={{ backgroundColor: avatar.color }}></div>
              <p>{avatar.label}</p>
            </div>
          ))}
        </div>
        <div className="avatar-modal-buttons">
          <button onClick={handleSave}>Save Changes</button>
          <button onClick={onClose}>Cancel</button>
        </div>
      </div>
    </div>
  );
}