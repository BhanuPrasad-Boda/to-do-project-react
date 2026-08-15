const mongoose = require("mongoose");

const notificationPreferencesSchema = new mongoose.Schema(
  {
    taskReminders: { type: Boolean, default: true },
    overdueAlerts: { type: Boolean, default: true },
    dailyPlanning: { type: Boolean, default: true },
    weeklySummary: { type: Boolean, default: true },
    endOfDay: { type: Boolean, default: true },
    emailNotifications: { type: Boolean, default: false },
    browserNotifications: { type: Boolean, default: true },
    quietHoursEnabled: { type: Boolean, default: true },
    quietHoursStart: { type: String, default: "22:00" },
    quietHoursEnd: { type: String, default: "07:00" },
    defaultReminderMinutes: { type: Number, default: 30 },
    autoPilot: { type: Boolean, default: true },
    autoRolloverOverdue: { type: Boolean, default: true },
    autoAdvanceRecurring: { type: Boolean, default: true },
    smartReminders: { type: Boolean, default: true },
    companionEnabled: { type: Boolean, default: true },
    companionProactive: { type: Boolean, default: true },
    companionCelebrations: { type: Boolean, default: true },
    companionGuidance: { type: Boolean, default: true },
  },
  { _id: false }
);

const userSchema = new mongoose.Schema(
  {
    UserId: { type: String, required: [true, "UserId is required"], unique: true },
    UserName: { type: String, required: [true, "UserName is required"] },
    Password: { type: String, required: [true, "Password is required"] },

    resetToken: String,
    resetTokenExpiry: Date,

    Email: { type: String, required: [true, "Email is required"], unique: true },
    Mobile: {
      type: String,
      required: [true, "Mobile is required"],
      unique: true,
      trim: true,
      validate: {
        validator: (v) => v && v.trim() !== "",
        message: "Mobile cannot be empty",
      },
    },
    Avatar: {
      type: String,
      default: function () {
        return `https://api.dicebear.com/7.x/identicon/svg?seed=${this.UserId}`;
      },
    },

    emailVerified: { type: Boolean, default: true },
    isActive: { type: Boolean, default: true },
    lastLoginAt: { type: Date },
    lastDailyPlanAt: { type: Date },
    lastWeeklySummaryAt: { type: Date },
    lastEndOfDayAt: { type: Date },
    onboardingStatus: {
      type: String,
      enum: ["NOT_STARTED", "IN_PROGRESS", "COMPLETED", "SKIPPED"],
      default: "NOT_STARTED",
    },
    currentTourStep: { type: Number, default: 0, min: 0 },
    notificationPreferences: {
      type: notificationPreferencesSchema,
      default: () => ({}),
    },
  },
  { timestamps: true }
);

userSchema.index({ UserId: 1 }, { unique: true });
userSchema.index({ Email: 1 }, { unique: true });
userSchema.index({ Mobile: 1 }, { unique: true });

module.exports = mongoose.model("User", userSchema);
