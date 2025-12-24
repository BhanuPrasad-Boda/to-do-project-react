const express = require("express");
const router = express.Router();
const User = require("../models/User");
const sendEmail = require("../utils/sendEmail");
const crypto = require("crypto");
const bcrypt = require("bcryptjs");

// ===================== REGISTER =====================
router.post("/register", async (req, res) => {
  try {
    // Hash password before saving
    const hashedPassword = await bcrypt.hash(req.body.Password, 10);
    const user = new User({
      ...req.body,
      Password: hashedPassword
    });

    await user.save();

    await sendEmail(
      user.Email,
      "Welcome to ToDo App 🎉",
      `<h3>Hello ${user.UserName},</h3>
       <p>You have successfully registered.</p>
       <p>Enjoy the experience 🚀</p>`
    );

    res.status(201).json({
      success: true,
      message: "Registered successfully"
    });

  } catch (err) {
    console.log("REGISTER ERROR:", err);

    if (err.code === 11000) {
      const duplicatedField = Object.keys(err.keyValue)[0];
      return res.status(400).json({
        message: `Already registered with this ${duplicatedField}`
      });
    }

    if (err.name === "ValidationError") {
      const messages = Object.values(err.errors).map(e => e.message);
      return res.status(400).json({ message: messages.join(", ") });
    }

    return res.status(500).json({ message: "Registration cancelled" });
  }
});

// ===================== LOGIN =====================
router.post("/login", async (req, res) => {
  try {
    const user = await User.findOne({ UserId: req.body.UserId });
    if (!user) {
      return res.status(401).json({ message: "Invalid credentials" });
    }

    const isPasswordValid = await bcrypt.compare(req.body.Password, user.Password);
    if (!isPasswordValid) {
      return res.status(401).json({ message: "Invalid credentials" });
    }

    // Send login notification email
    await sendEmail(
      user.Email,
      "Login Alert 🔐",
      `<p>Hello ${user.UserName},</p>
       <p>A login was detected on your account.</p>
       <p>If this wasn't you, please secure your account.</p>`
    );

    res.json({ message: "Login successful", user });

  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});


// ===================== FORGOT PASSWORD (using Mobile) =====================
router.post("/forgot-password", async (req, res) => {
  console.log("REQ BODY 👉", req.body);

  try {
    const { Mobile } = req.body; // now using Mobile

    if (!Mobile) {
      return res.status(400).json({ message: "Mobile number is required" });
    }

    const user = await User.findOne({ Mobile });
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    const token = crypto.randomBytes(32).toString("hex");
    user.resetToken = token;
    user.resetTokenExpiry = Date.now() + 15 * 60 * 1000; // 15 mins
    await user.save();

const resetLink = `${process.env.CLIENT_URL}/reset-password/${token}`;


    await sendEmail(
      user.Email, // still sending to user's email
      "Reset Your Password - ToDo App",
      `<p>Click here to reset password:</p><a href="${resetLink}">${resetLink}</a>`
    );

    res.json({ message: "Password reset link sent to user's email" });

  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});



// ===================== RESET PASSWORD =====================
router.post("/reset-password/:token", async (req, res) => {
  try {
    const { token } = req.params;
    const { newPassword } = req.body;

    if (!newPassword) return res.status(400).json({ message: "New password required" });

    const user = await User.findOne({
      resetToken: token,
      resetTokenExpiry: { $gt: Date.now() },
    });

    if (!user) return res.status(400).json({ message: "Invalid or expired token" });

    user.Password = await bcrypt.hash(newPassword, 10);
    user.resetToken = undefined;
    user.resetTokenExpiry = undefined;

    await user.save();

    res.json({ message: "Password reset successful" });

  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ===================== FORGOT USERID (using Mobile) =====================
router.post("/forgot-userid", async (req, res) => {
  console.log("REQ BODY 👉", req.body);

  try {
    const { Mobile } = req.body;

    if (!Mobile) {
      return res.status(400).json({ message: "Mobile number is required" });
    }

    const user = await User.findOne({ Mobile });
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    await sendEmail(
      user.Email, // send UserId to email
      "Your UserID - ToDo App",
      `<p>You attempted to retrieve your UserID.</p>
      <p>Your UserID is: <b>${user.UserId}</b></p>`
    );

    res.json({ message: "UserID sent to user's email" });

  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
