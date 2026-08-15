const crypto = require("crypto");
const bcrypt = require("bcryptjs");
const OtpVerification = require("../models/OtpVerification");
const { sendOtpCodeEmail, sendPasswordResetOtpEmail } = require("./emailService");
const { getLastEmailError } = require("../utils/sendEmail");
const { maskEmail } = require("../utils/html");
const { allow } = require("../middleware/rateLimiter");
const { isOtpDevMode } = require("../utils/otpDelivery");

const OTP_EXPIRY_MS = Number(process.env.OTP_EXPIRY_MS) || 5 * 60 * 1000;
const MAX_ATTEMPTS = 5;
const RESEND_COOLDOWN_MS = 45 * 1000;
const MAX_RESENDS = 5;
const REQUEST_WINDOW_MS = 60 * 60 * 1000;

function generateOtp() {
  return String(crypto.randomInt(0, 1_000_000)).padStart(6, "0");
}

function normalizeEmail(email) {
  return String(email || "").trim().toLowerCase();
}

async function hashOtp(otp) {
  return bcrypt.hash(otp, 10);
}

async function requestOtp({
  email,
  purpose,
  channel = "email",
  pendingPayload,
  recipientName,
  ipKey,
}) {
  const normalized = normalizeEmail(email);
  if (!normalized || !normalized.includes("@")) {
    const err = new Error("A valid email is required");
    err.status = 400;
    throw err;
  }

  const emailRate = allow(`otp-req:${normalized}:${purpose}`, 5, REQUEST_WINDOW_MS);
  if (!emailRate.ok) {
    const err = new Error("Too many attempts. Please wait before trying again.");
    err.status = 429;
    throw err;
  }

  if (ipKey) {
    const ipRate = allow(`otp-req-ip:${ipKey}:${purpose}`, 10, REQUEST_WINDOW_MS);
    if (!ipRate.ok) {
      const err = new Error("Too many attempts. Please wait before trying again.");
      err.status = 429;
      throw err;
    }
  }

  const existing = await OtpVerification.findOne({
    email: normalized,
    purpose,
    consumed: false,
  }).sort({ createdAt: -1 });

  if (existing && existing.lastSentAt) {
    const elapsed = Date.now() - new Date(existing.lastSentAt).getTime();
    if (elapsed < RESEND_COOLDOWN_MS) {
      const wait = Math.ceil((RESEND_COOLDOWN_MS - elapsed) / 1000);
      const err = new Error(`Please wait ${wait} seconds before requesting a new code.`);
      err.status = 429;
      err.retryAfter = wait;
      throw err;
    }
    if (existing.resendCount >= MAX_RESENDS) {
      const err = new Error("Too many attempts. Please wait before trying again.");
      err.status = 429;
      throw err;
    }
  }

  await OtpVerification.updateMany(
    { email: normalized, purpose, consumed: false },
    { $set: { consumed: true, consumedAt: new Date() } }
  );

  const otp = generateOtp();
  const otpHash = await hashOtp(otp);
  const record = await OtpVerification.create({
    email: normalized,
    purpose,
    channel,
    otpHash,
    expiresAt: new Date(Date.now() + OTP_EXPIRY_MS),
    attempts: 0,
    maxAttempts: MAX_ATTEMPTS,
    consumed: false,
    lastSentAt: new Date(),
    resendCount: existing ? existing.resendCount + 1 : 0,
    pendingPayload: pendingPayload || null,
  });

  let delivered = false;
  if (channel === "email") {
    if (purpose === "reset") {
      delivered = await sendPasswordResetOtpEmail(normalized, recipientName, otp);
    } else {
      delivered = await sendOtpCodeEmail(normalized, recipientName, otp);
    }
  }

  const devMode = isOtpDevMode();
  if (!delivered && !devMode) {
    await OtpVerification.deleteOne({ _id: record._id });
  }
  if (devMode && !delivered) {
    console.info(`[otp-dev] ${purpose} code for ${maskEmail(normalized)}`);
  }

  return {
    delivered,
    otp: devMode ? otp : undefined,
    emailError: delivered ? undefined : getLastEmailError(),
    maskedEmail: maskEmail(normalized),
    expiresInSeconds: Math.floor(OTP_EXPIRY_MS / 1000),
    resendCooldownSeconds: Math.floor(RESEND_COOLDOWN_MS / 1000),
  };
}

async function verifyOtp({ email, purpose, otp, ipKey }) {
  const normalized = normalizeEmail(email);
  const code = String(otp || "").replace(/\s/g, "");

  if (!/^\d{6}$/.test(code)) {
    const err = new Error("Enter the 6-digit verification code.");
    err.status = 400;
    throw err;
  }

  if (ipKey) {
    const ipRate = allow(`otp-verify-ip:${ipKey}`, 20, 15 * 60 * 1000);
    if (!ipRate.ok) {
      const err = new Error("Too many attempts. Please wait before trying again.");
      err.status = 429;
      throw err;
    }
  }

  const record = await OtpVerification.findOne({
    email: normalized,
    purpose,
    consumed: false,
  }).sort({ createdAt: -1 });

  if (!record) {
    const err = new Error("This code has expired. Please request a new code.");
    err.status = 400;
    throw err;
  }

  if (record.expiresAt.getTime() < Date.now()) {
    record.consumed = true;
    record.consumedAt = new Date();
    await record.save();
    const err = new Error("This code has expired. Please request a new code.");
    err.status = 400;
    throw err;
  }

  if (record.attempts >= record.maxAttempts) {
    record.consumed = true;
    record.consumedAt = new Date();
    await record.save();
    const err = new Error("Too many attempts. Please wait before trying again.");
    err.status = 429;
    throw err;
  }

  const matches = await bcrypt.compare(code, record.otpHash);
  record.attempts += 1;

  if (!matches) {
    await record.save();
    const remaining = record.maxAttempts - record.attempts;
    const err = new Error(
      remaining > 0
        ? "Invalid verification code. Please try again."
        : "Too many attempts. Please wait before trying again."
    );
    err.status = remaining > 0 ? 400 : 429;
    throw err;
  }

  record.consumed = true;
  record.consumedAt = new Date();
  await record.save();

  return record;
}

module.exports = {
  requestOtp,
  verifyOtp,
  generateOtp,
  OTP_EXPIRY_MS,
  RESEND_COOLDOWN_MS,
  MAX_ATTEMPTS,
};
