const express = require("express");
const router = express.Router();
const User = require("../models/User");
const sendEmail = require("../utils/sendEmail");
const jwt = require("jsonwebtoken");
const authMiddleware = require("../middleware/authMiddleware");
const upload = require("../config/cloudinary");
const bcrypt = require("bcryptjs");
const { requestOtp, verifyOtp } = require("../services/otpService");
const { rateLimit, clientKey } = require("../middleware/rateLimiter");
const { setAuthCookie, clearAuthCookie } = require("../middleware/cookieParser");
const { publicUser, validatePassword, signToken } = require("../utils/authHelpers");
const { applyOnboardingUpdate, resolveOnboarding } = require("../utils/onboarding");
const { escapeHtml, maskEmail } = require("../utils/html");
const { buildOtpClientPayload } = require("../utils/otpDelivery");

const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  keyGenerator: (req) => `login:${clientKey(req)}`,
  message: "Too many attempts. Please wait before trying again.",
});

const otpRequestLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 8,
  keyGenerator: (req) => `otp:${clientKey(req)}`,
  message: "Too many attempts. Please wait before trying again.",
});

const otpVerifyLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 15,
  keyGenerator: (req) => `otp-verify:${clientKey(req)}`,
  message: "Too many attempts. Please wait before trying again.",
});

function handleOtpError(res, err) {
  const status = err.status || 500;
  return res.status(status).json({
    message: err.message || "Something went wrong. Please try again.",
    retryAfter: err.retryAfter,
  });
}

// ===================== REGISTER (legacy, preserved) =====================
router.post("/register", async (req, res) => {
  try {
    const { UserId, UserName, Password, Email, Mobile } = req.body;

    if (!UserId || !UserName || !Password || !Email || !Mobile) {
      return res.status(400).json({ message: "All fields are required" });
    }
    if (!validatePassword(Password)) {
      return res.status(400).json({
        message: "Password must be minimum 6 characters with letters & numbers",
      });
    }

    const existingUser = await User.findOne({
      $or: [{ UserId }, { Email: String(Email).toLowerCase() }, { Mobile }],
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
      Email: String(Email).toLowerCase(),
      Mobile,
      emailVerified: true,
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

// ===================== OTP REGISTER =====================
router.post("/register/request-otp", otpRequestLimiter, async (req, res) => {
  try {
    const { UserId, UserName, Password, Email, Mobile } = req.body;

    if (!UserId || !UserName || !Password || !Email || !Mobile) {
      return res.status(400).json({ message: "All fields are required" });
    }
    if (!validatePassword(Password)) {
      return res.status(400).json({
        message: "Password must be minimum 6 characters with letters & numbers",
      });
    }

    const email = String(Email).toLowerCase().trim();
    const existingUser = await User.findOne({
      $or: [{ UserId }, { Email: email }, { Mobile }],
    });
    if (existingUser) {
      return res
        .status(400)
        .json({ message: "User already exists with same UserId, Email or Mobile" });
    }

    const hashedPassword = await bcrypt.hash(Password, 10);
    const pendingPayload = {
      UserId,
      UserName,
      Password: hashedPassword,
      Email: email,
      Mobile,
    };

    const result = await requestOtp({
      email,
      purpose: "register",
      channel: "email",
      recipientName: UserName,
      ipKey: clientKey(req),
      pendingPayload,
    });

    const payload = buildOtpClientPayload(result);
    if (!payload.ok) return res.status(payload.status).json({ message: payload.message });
    return res.json({ success: true, ...payload });
  } catch (err) {
    handleOtpError(res, err);
  }
});

router.post("/register/verify-otp", otpVerifyLimiter, async (req, res) => {
  try {
    const { Email, otp } = req.body;
    const record = await verifyOtp({
      email: Email,
      purpose: "register",
      otp,
      ipKey: clientKey(req),
    });

    const payload = record.pendingPayload || {};
    const existingUser = await User.findOne({
      $or: [
        { UserId: payload.UserId },
        { Email: payload.Email },
        { Mobile: payload.Mobile },
      ],
    });
    if (existingUser) {
      return res.status(400).json({ message: "User already exists with same UserId, Email or Mobile" });
    }

    const user = new User({
      ...payload,
      emailVerified: true,
      isActive: true,
    });
    await user.save();

    const token = signToken(jwt, user);
    setAuthCookie(res, token);

    res.status(201).json({
      success: true,
      message: "Email verified. Account created.",
      ...publicUser(user),
      token,
    });
  } catch (err) {
    handleOtpError(res, err);
  }
});

router.post("/register/resend-otp", otpRequestLimiter, async (req, res) => {
  try {
    const { Email, UserId, UserName, Password, Mobile } = req.body;
    if (!Email) return res.status(400).json({ message: "Email is required" });

    const email = String(Email).toLowerCase().trim();
    let pendingPayload;
    if (UserId && UserName && Password && Mobile) {
      if (!validatePassword(Password)) {
        return res.status(400).json({
          message: "Password must be minimum 6 characters with letters & numbers",
        });
      }
      pendingPayload = {
        UserId,
        UserName,
        Password: await bcrypt.hash(Password, 10),
        Email: email,
        Mobile,
      };
    }

    const result = await requestOtp({
      email,
      purpose: "register",
      channel: "email",
      recipientName: UserName,
      ipKey: clientKey(req),
      pendingPayload,
    });
    const payload = buildOtpClientPayload(result);
    if (!payload.ok) return res.status(payload.status).json({ message: payload.message });
    return res.json({ success: true, ...payload });
  } catch (err) {
    handleOtpError(res, err);
  }
});

// ===================== LOGIN =====================
router.post("/login", loginLimiter, async (req, res) => {
  try {
    const { UserId, Password } = req.body;

    const user = await User.findOne({ UserId });
    if (!user || user.isActive === false) {
      return res.status(401).json({ message: "Invalid credentials" });
    }

    const isMatch = await bcrypt.compare(Password, user.Password);
    if (!isMatch) return res.status(401).json({ message: "Invalid credentials" });

    user.lastLoginAt = new Date();
    await user.save();

    const token = signToken(jwt, user);
    setAuthCookie(res, token);

    res.json({
      ...publicUser(user),
      token,
    });
  } catch {
    res.status(500).json({ message: "Login error" });
  }
});

router.post("/logout", (req, res) => {
  clearAuthCookie(res);
  res.json({ message: "Signed out" });
});

// ===================== FORGOT PASSWORD (legacy mobile + link) =====================
router.post("/forgot-password", async (req, res) => {
  try {
    const { Mobile, Email } = req.body;
    const user = Mobile
      ? await User.findOne({ Mobile })
      : Email
        ? await User.findOne({ Email: String(Email).toLowerCase() })
        : null;

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
        <p>Hello ${escapeHtml(user.UserName)},</p>

        <a href="${resetLink}"
           style="padding:12px 24px; background:#f0ad4e; border-radius:30px;
           color:#000; text-decoration:none;">
           Reset Password
        </a>

        <p>This link expires in 15 minutes.</p>
        <p>If you did not request a password reset, please secure your account.</p>
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

// ===================== FORGOT PASSWORD OTP =====================
router.post("/forgot-password/request-otp", otpRequestLimiter, async (req, res) => {
  try {
    const email = String(req.body.Email || "").toLowerCase().trim();
    if (!email) return res.status(400).json({ message: "Email is required" });

    const user = await User.findOne({ Email: email });
    const generic = {
      success: true,
      requiresOtp: true,
      message: "If an account exists for this email, a verification code was sent.",
      maskedEmail: maskEmail(email),
      expiresInSeconds: 300,
      resendCooldownSeconds: 45,
    };

    if (!user) return res.json(generic);

    const result = await requestOtp({
      email,
      purpose: "reset",
      channel: "email",
      recipientName: user.UserName,
      ipKey: clientKey(req),
      pendingPayload: { UserId: user.UserId },
    });
    const payload = buildOtpClientPayload(result);
    if (!payload.ok) return res.status(payload.status).json({ message: payload.message });
    return res.json({ ...generic, ...payload });
  } catch (err) {
    handleOtpError(res, err);
  }
});

router.post("/forgot-password/verify-otp", otpVerifyLimiter, async (req, res) => {
  try {
    const { Email, otp } = req.body;
    const record = await verifyOtp({
      email: Email,
      purpose: "reset",
      otp,
      ipKey: clientKey(req),
    });

    const resetTicket = require("crypto").randomBytes(32).toString("hex");
    const user = await User.findOne({ Email: String(Email).toLowerCase() });
    if (!user) return res.status(400).json({ message: "This code has expired. Please request a new code." });

    user.resetToken = resetTicket;
    user.resetTokenExpiry = Date.now() + 10 * 60 * 1000;
    await user.save();

    res.json({
      success: true,
      message: "Code verified. You can now set a new password.",
      resetToken: resetTicket,
      userId: record.pendingPayload?.UserId,
    });
  } catch (err) {
    handleOtpError(res, err);
  }
});

router.post("/forgot-password/resend-otp", otpRequestLimiter, async (req, res) => {
  try {
    const email = String(req.body.Email || "").toLowerCase().trim();
    if (!email) return res.status(400).json({ message: "Email is required" });
    const user = await User.findOne({ Email: email });
    const generic = {
      success: true,
      requiresOtp: true,
      message: "If an account exists for this email, a verification code was sent.",
      maskedEmail: maskEmail(email),
      expiresInSeconds: 300,
      resendCooldownSeconds: 45,
    };
    if (!user) return res.json(generic);
    const result = await requestOtp({
      email,
      purpose: "reset",
      channel: "email",
      recipientName: user.UserName,
      ipKey: clientKey(req),
      pendingPayload: { UserId: user.UserId },
    });
    const payload = buildOtpClientPayload(result);
    if (!payload.ok) return res.status(payload.status).json({ message: payload.message });
    return res.json({ ...generic, ...payload });
  } catch (err) {
    handleOtpError(res, err);
  }
});

// ===================== RESET PASSWORD =====================
router.post("/reset-password/:token", async (req, res) => {
  try {
    if (!validatePassword(req.body.newPassword)) {
      return res.status(400).json({
        message: "Password must be minimum 6 characters with letters & numbers",
      });
    }

    const user = await User.findOne({
      resetToken: req.params.token,
      resetTokenExpiry: { $gt: Date.now() },
    });

    if (!user) {
      return res.status(400).json({ message: "Invalid or expired token" });
    }

    user.Password = await bcrypt.hash(req.body.newPassword, 10);
    user.resetToken = undefined;
    user.resetTokenExpiry = undefined;

    await user.save();

    res.json({ message: "Password reset successful" });
  } catch {
    res.status(500).json({ message: "Reset failed" });
  }
});

router.post("/reset-password", async (req, res) => {
  try {
    const { resetToken, newPassword, confirmPassword } = req.body;
    if (confirmPassword && confirmPassword !== newPassword) {
      return res.status(400).json({ message: "Passwords do not match" });
    }
    if (!validatePassword(newPassword)) {
      return res.status(400).json({
        message: "Password must be minimum 6 characters with letters & numbers",
      });
    }
    const user = await User.findOne({
      resetToken,
      resetTokenExpiry: { $gt: Date.now() },
    });
    if (!user) return res.status(400).json({ message: "Invalid or expired token" });
    user.Password = await bcrypt.hash(newPassword, 10);
    user.resetToken = undefined;
    user.resetTokenExpiry = undefined;
    await user.save();
    res.json({ message: "Password updated. You can now log in." });
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
      <p>Hello, ${escapeHtml(user.UserName)}</p>
      <p>Your User ID:</p>
      <strong>${escapeHtml(user.UserId)}</strong>
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

router.get("/me", authMiddleware, async (req, res) => {
  try {
    const user = await User.findOne({ UserId: req.user.UserId });
    if (!user) return res.status(404).json({ message: "User not found" });
    res.json(publicUser(user));
  } catch {
    res.status(500).json({ message: "Something went wrong. Please try again." });
  }
});

router.get("/get-user/:userId", authMiddleware, async (req, res) => {
  try {
    if (req.user.UserId !== req.params.userId) {
      return res.status(403).json({ message: "Forbidden" });
    }
    const user = await User.findOne({ UserId: req.params.userId });
    if (!user) return res.status(404).json({ message: "User not found" });
    res.json(publicUser(user));
  } catch {
    res.status(500).json({ message: "Something went wrong. Please try again." });
  }
});

router.put("/preferences", authMiddleware, async (req, res) => {
  try {
    const allowed = [
      "taskReminders",
      "overdueAlerts",
      "dailyPlanning",
      "weeklySummary",
      "endOfDay",
      "emailNotifications",
      "browserNotifications",
      "quietHoursEnabled",
      "quietHoursStart",
      "quietHoursEnd",
      "defaultReminderMinutes",
      "autoPilot",
      "autoRolloverOverdue",
      "autoAdvanceRecurring",
      "smartReminders",
      "companionEnabled",
      "companionProactive",
      "companionCelebrations",
      "companionGuidance",
    ];
    const updates = {};
    allowed.forEach((key) => {
      if (req.body[key] !== undefined) updates[`notificationPreferences.${key}`] = req.body[key];
    });
    const user = await User.findOneAndUpdate(
      { UserId: req.user.UserId },
      { $set: updates },
      { new: true }
    );
    res.json({
      message: "Preferences updated",
      notificationPreferences: user.notificationPreferences,
    });
  } catch {
    res.status(500).json({ message: "Something went wrong. Please try again." });
  }
});

router.put("/onboarding", authMiddleware, async (req, res) => {
  try {
    const user = await User.findOne({ UserId: req.user.UserId });
    if (!user) return res.status(404).json({ message: "User not found" });
    const next = applyOnboardingUpdate(user, req.body || {});
    user.onboardingStatus = next.onboardingStatus;
    user.currentTourStep = next.currentTourStep;
    await user.save();
    res.json({
      message: "Onboarding updated",
      ...resolveOnboarding(user),
    });
  } catch {
    res.status(500).json({ message: "Something went wrong. Please try again." });
  }
});

router.put("/update-avatar/:userId", authMiddleware, async (req, res) => {
  try {
    if (req.user.UserId !== req.params.userId) {
      return res.status(403).json({ message: "Forbidden" });
    }
    const avatar = req.body.Avatar;
    if (!avatar || typeof avatar !== "string") {
      return res.status(400).json({ message: "No image provided" });
    }
    if (avatar.length > 2_000_000) {
      return res.status(400).json({ message: "Image is too large" });
    }
    const user = await User.findOneAndUpdate(
      { UserId: req.params.userId },
      { Avatar: avatar },
      { new: true }
    );
    if (!user) return res.status(404).json({ message: "User not found" });
    res.json({ message: "Avatar updated successfully", user: publicUser(user) });
  } catch {
    res.status(500).json({ message: "Avatar upload failed" });
  }
});

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
