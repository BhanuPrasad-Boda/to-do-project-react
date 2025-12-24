const express = require("express");
const router = express.Router();
const User = require("../models/User");
const sendEmail = require("../utils/sendEmail");
const crypto = require("crypto");
const bcrypt = require("bcryptjs");

// ===================== REGISTER =====================
router.post("/register", async (req, res) => {
  try {
    const hashedPassword = await bcrypt.hash(req.body.Password, 10);

    const user = new User({
      ...req.body,
      Password: hashedPassword
    });

    await user.save();

    res.status(201).json({
      success: true,
      message: "Registered successfully"
    });

  } catch (err) {
    if (err.code === 11000) {
      return res.status(400).json({ message: "User already exists" });
    }
    res.status(500).json({ message: "Registration failed" });
  }
});


// ===================== LOGIN =====================
router.post("/login", async (req, res) => {
  try {
    const user = await User.findOne({ UserId: req.body.UserId });
    if (!user) {
      return res.status(401).json({ message: "Invalid credentials" });
    }

    const isMatch = await bcrypt.compare(req.body.Password, user.Password);
    if (!isMatch) {
      return res.status(401).json({ message: "Invalid credentials" });
    }

    res.json({
      message: "Login successful",
      user: {
        UserId: user.UserId,
        UserName: user.UserName,
        Email: user.Email
      }
    });

  } catch (err) {
    res.status(500).json({ message: "Login error" });
  }
});



// ===================== FORGOT PASSWORD (using Mobile) =====================
router.post("/forgot-password", async (req, res) => {
  try {
    const { Mobile } = req.body;

    const user = await User.findOne({ Mobile });
    if (!user) return res.status(404).json({ message: "User not found" });

    const token = crypto.randomBytes(32).toString("hex");
    user.resetToken = token;
    user.resetTokenExpiry = Date.now() + 15 * 60 * 1000;
    await user.save();

    const resetLink = `${process.env.CLIENT_URL}/reset-password/${token}`;

    sendEmail(
      user.Email,
      "Reset Password - ToDo App",
      `<p>Reset link:</p><a href="${resetLink}">${resetLink}</a>`
    );

    res.json({ message: "Reset link sent to email" });

  } catch (err) {
    res.status(500).json({ message: "Error sending reset link" });
  }
});




// ===================== RESET PASSWORD =====================
router.post("/reset-password/:token", async (req, res) => {
  try {
    const user = await User.findOne({
      resetToken: req.params.token,
      resetTokenExpiry: { $gt: Date.now() }
    });

    if (!user) return res.status(400).json({ message: "Invalid or expired token" });

    user.Password = await bcrypt.hash(req.body.newPassword, 10);
    user.resetToken = undefined;
    user.resetTokenExpiry = undefined;
    await user.save();

    res.json({ message: "Password reset successful" });

  } catch (err) {
    res.status(500).json({ message: "Reset failed" });
  }
});


// ===================== FORGOT USERID (using Mobile) =====================
router.post("/reset-password/:token", async (req, res) => {
  try {
    const user = await User.findOne({
      resetToken: req.params.token,
      resetTokenExpiry: { $gt: Date.now() }
    });

    if (!user) return res.status(400).json({ message: "Invalid or expired token" });

    user.Password = await bcrypt.hash(req.body.newPassword, 10);
    user.resetToken = undefined;
    user.resetTokenExpiry = undefined;
    await user.save();

    res.json({ message: "Password reset successful" });

  } catch (err) {
    res.status(500).json({ message: "Reset failed" });
  }
});


module.exports = router;
