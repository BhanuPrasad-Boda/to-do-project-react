const express = require("express");
const router = express.Router();
const User = require("../models/User");
const sendEmail = require("../utils/sendEmail");
const jwt = require("jsonwebtoken");
const authMiddleware = require("../middleware/authMiddleware");
const upload = require("../config/cloudinary");
const bcrypt = require("bcryptjs");

// ===================== REGISTER =====================
router.post("/register", async (req, res) => {
  try {
    const { UserId, UserName, Password, Email, Mobile } = req.body;

    const existingUser = await User.findOne({
      $or: [{ UserId }, { Email }, { Mobile }],
    });

    if (existingUser) {
      return res
        .status(400)
        .json({ message: "User already exists with same UserId, Email or Mobile" });
    }

    const hashedPassword = await bcrypt.hash(Password, 10);

    const user = new User({
      UserId,
      UserName,
      Password: hashedPassword,
      Email,
      Mobile,
    });

    await user.save();

    res.status(201).json({
      success: true,
      message: "Registered successfully",
    });
  } catch {
    res.status(500).json({ message: "Registration failed" });
  }
});

// ===================== LOGIN =====================
router.post("/login", async (req, res) => {
  try {
    const { UserId, Password } = req.body;

    const user = await User.findOne({ UserId });
    if (!user) return res.status(401).json({ message: "Invalid credentials" });

    const isMatch = await bcrypt.compare(Password, user.Password);
    if (!isMatch) return res.status(401).json({ message: "Invalid credentials" });

    const token = jwt.sign(
      {
        id: user._id,
        UserId: user.UserId,
        UserName: user.UserName,
        Email: user.Email,
      },
      process.env.JWT_SECRET,
      { expiresIn: "1m" }
    );

    res.json({
      UserId: user.UserId,
      UserName: user.UserName,
      Email: user.Email,
      Avatar: user.Avatar,
      token,
    });
  } catch {
    res.status(500).json({ message: "Login error" });
  }
});

// ===================== FORGOT PASSWORD =====================
router.post("/forgot-password", async (req, res) => {
  try {
    const { Mobile } = req.body;

    const user = await User.findOne({ Mobile });
    if (!user) return res.status(404).json({ message: "User not found" });

    const token = require("crypto").randomBytes(32).toString("hex");

    user.resetToken = token;
    user.resetTokenExpiry = Date.now() + 15 * 60 * 1000;
    await user.save();

    const resetLink = `${process.env.CLIENT_URL}/reset-password/${token}`;

    const emailStatus = await sendEmail(
      user.Email,
      "Reset Password - ToDo App",
      `
      <div style="font-family: Arial, sans-serif; padding: 20px;">
        <h2>Reset Your Password</h2>
        <p>Hello ${user.UserName},</p>

        <a href="${resetLink}"
           style="padding:12px 24px; background:#f0ad4e; border-radius:30px;
           color:#000; text-decoration:none;">
           Reset Password
        </a>

        <p>This link expires in 15 minutes.</p>
        <p>If you did not request a password reset, please ignore this email.</p>
        <p>ToDo App Team</p>
      </div>
      `
    );

    if (!emailStatus) {
      return res.status(500).json({ message: "Failed to send reset email" });
    }

    res.json({ message: "Reset link sent to email. Please check Inbox or Spam." });
  } catch {
    res.status(500).json({ message: "Server error" });
  }
});

// ===================== RESET PASSWORD =====================
router.post("/reset-password/:token", async (req, res) => {
  try {
    const user = await User.findOne({
      resetToken: req.params.token,
      resetTokenExpiry: { $gt: Date.now() },
    });

    if (!user)
      return res.status(400).json({ message: "Invalid or expired token" });

    user.Password = await bcrypt.hash(req.body.newPassword, 10);
    user.resetToken = undefined;
    user.resetTokenExpiry = undefined;

    await user.save();

    res.json({ message: "Password reset successful" });
  } catch {
    res.status(500).json({ message: "Reset failed" });
  }
});

// ===================== FORGOT USERID =====================
router.post("/forgot-userid", async (req, res) => {
  try {
    const { Mobile } = req.body;

    const user = await User.findOne({ Mobile });
    if (!user) return res.status(404).json({ message: "User not found" });

    const emailStatus = await sendEmail(
      user.Email,
      "Account Recovery - ToDo App",
      `
      <p>Hello,</p>
      <p>Your User ID:</p>
      <strong>${user.UserId}</strong>
      <p>If this wasn't you, please secure your account immediately.</p>
      <p>ToDo App Team</p>
      `
    );

    if (!emailStatus) {
      return res.status(500).json({ message: "Failed to send UserId email" });
    }

    res.json({
      message: "User ID sent to registered email. Please check Inbox or Spam.",
    });
  } catch {
    res.status(500).json({ message: "Server error" });
  }
});

// ===================== UPLOAD AVATAR =====================
router.put(
  "/upload-avatar",
  authMiddleware,
  upload.single("avatar"),
  async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ message: "No file uploaded" });
      }

      const avatarUrl = req.file.path;
      const userId = req.user.UserId;

      const updatedUser = await User.findOneAndUpdate(
        { UserId: userId },
        { Avatar: avatarUrl },
        { new: true }
      );

      if (!updatedUser) {
        return res.status(404).json({ message: "User not found" });
      }

      res.status(200).json({
        message: "Avatar updated successfully",
        avatar: avatarUrl,
      });
    } catch {
      res.status(500).json({ message: "Avatar upload failed" });
    }
  }
);

module.exports = router;
