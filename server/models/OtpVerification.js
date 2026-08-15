const mongoose = require("mongoose");

const otpVerificationSchema = new mongoose.Schema(
  {
    email: {
      type: String,
      required: true,
      lowercase: true,
      trim: true,
      index: true,
    },
    purpose: {
      type: String,
      required: true,
      enum: ["register", "reset", "verify_email"],
      index: true,
    },
    channel: {
      type: String,
      enum: ["email", "sms"],
      default: "email",
    },
    otpHash: { type: String, required: true },
    expiresAt: { type: Date, required: true },
    attempts: { type: Number, default: 0 },
    maxAttempts: { type: Number, default: 5 },
    consumed: { type: Boolean, default: false, index: true },
    consumedAt: { type: Date },
    lastSentAt: { type: Date, default: Date.now },
    resendCount: { type: Number, default: 0 },
    pendingPayload: { type: mongoose.Schema.Types.Mixed },
  },
  { timestamps: true }
);

otpVerificationSchema.index({ email: 1, purpose: 1, consumed: 1 });
otpVerificationSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 60 * 60 });

module.exports = mongoose.model("OtpVerification", otpVerificationSchema);
