const mongoose = require("mongoose");

const notificationSchema = new mongoose.Schema(
  {
    userId: { type: String, required: true, index: true },
    type: {
      type: String,
      required: true,
      enum: [
        "task_reminder",
        "overdue",
        "upcoming",
        "recurring",
        "daily_planning",
        "end_of_day",
        "high_priority",
        "weekly_summary",
        "auto_rollover",
        "system",
      ],
    },
    category: {
      type: String,
      enum: ["tasks", "reminders", "overdue", "system", "productivity"],
      default: "tasks",
    },
    title: { type: String, required: true },
    body: { type: String, required: true },
    taskId: { type: Number, default: null },
    read: { type: Boolean, default: false, index: true },
    readAt: { type: Date },
    queued: { type: Boolean, default: false },
    queuedUntil: { type: Date },
    deliveredAt: { type: Date },
    channels: {
      inApp: { type: Boolean, default: true },
      email: { type: Boolean, default: false },
      webPush: { type: Boolean, default: false },
    },
    meta: { type: mongoose.Schema.Types.Mixed },
  },
  { timestamps: true }
);

notificationSchema.index({ userId: 1, createdAt: -1 });
notificationSchema.index({ userId: 1, read: 1 });
notificationSchema.index({ queued: 1, queuedUntil: 1 });

module.exports = mongoose.model("Notification", notificationSchema);
