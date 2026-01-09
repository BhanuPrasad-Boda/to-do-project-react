const express = require("express");
const router = express.Router();
const User = require("../models/User");
const sendEmail = require("../utils/sendEmail");
const jwt = require("jsonwebtoken");


const bcrypt = require("bcryptjs");

// ===================== REGISTER =====================
router.post("/register", async (req, res) => {
  try {
    const { UserId, UserName, Password, Email, Mobile } = req.body;

    // Check if user already exists
    const existingUser = await User.findOne({ 
      $or: [
        { UserId },
        { Email },
        { Mobile }
      ]
    });

    if (existingUser) {
      return res.status(400).json({ message: "User already exists with same UserId, Email or Mobile" });
    }

    const hashedPassword = await bcrypt.hash(Password, 10);

    const user = new User({
      UserId,
      UserName,
      Password: hashedPassword,
      Email,
      Mobile
    });

    await user.save();

    res.status(201).json({
      success: true,
      message: "Registered successfully"
    });

  } catch (err) {
    console.error(err);
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

    // Generate JWT
    const token = jwt.sign(
      {
        id: user._id,
        UserId: user.UserId,
        UserName: user.UserName,
        Email: user.Email
      },
      process.env.JWT_SECRET,
      { expiresIn: "2m" } // token valid for 2 minutes
    );

    res.json({
      UserId: user.UserId,
      UserName: user.UserName,
      Email: user.Email,
      token
    });
  } catch (err) {
    console.error(err);
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
    user.resetTokenExpiry = Date.now() + 15 * 60 * 1000; // 15 minutes
    await user.save();

    const resetLink = `${process.env.CLIENT_URL}/reset-password/${token}`;

    try {
    await sendEmail(
  user.Email,
  "Reset Password - ToDo App",
  `
  <div style="font-family: Arial, sans-serif; padding: 20px;">
    <h2 style="color:#333;">Reset Your Password</h2>
    <p>Hello ${user.UserName},</p>
    <p>You requested to reset your password.</p>

    <a href="${resetLink}"
       style="
         display: inline-block;
         padding: 12px 24px;
         background-color: #f0ad4e;
         color: #000;
         text-decoration: none;
         border-radius: 30px;
         font-weight: bold;
         margin-top: 10px;
       ">
       Reset Password
    </a>

    <p style="margin-top:20px;">
      This link will expire in <strong>15 minutes</strong>.
    </p>

    <p>If you did not request this, please ignore this email.</p>

    <p style="margin-top:30px;">
      Regards,<br/>
      <strong>To-Do App Team</strong>
    </p>
  </div>
  `
);

      res.json({ message: "Reset link sent to email. Please check Inbox or Spam." });
    } catch (err) {
      console.error("Email sending error:", err);
      res.status(500).json({ message: "Failed to send reset email" });
    }

  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
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
    console.error(err);
    res.status(500).json({ message: "Reset failed" });
  }
  console.log("Token from URL:", req.params.token);
console.log("Password from body:", req.body.newPassword);

});

// ===================== FORGOT USERID =====================
router.post("/forgot-userid", async (req, res) => {
  try {
    const { Mobile } = req.body;

    const user = await User.findOne({ Mobile });
    if (!user) return res.status(404).json({ message: "User not found" });

    try {
      await sendEmail(
  user.Email,
  "Account Recovery  ToDo App",
  `
    <p>Hello,</p>
    <p>You requested your User ID.</p>
    <p><strong>User ID:</strong> ${user.UserId}</p>
    <p>If this wasn't you, please ignore this email.</p>
    <p>ToDo App Team</p>
  `
);

console.log("📧 Forgot UserID email sent to:", user.Email);


      res.json({
  message: "The User ID has been sent to the registered email. Please check Inbox or Spam."
});

    } catch (err) {
      console.error("Email sending error:", err);
      res.status(500).json({ message: "Failed to send UserId email" });
    }

  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
});

module.exports = router;
