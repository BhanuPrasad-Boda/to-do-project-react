const mongoose = require("mongoose");

const subtaskSchema = new mongoose.Schema(
  {
    title: { type: String, required: true, trim: true },
    completed: { type: Boolean, default: false },
  },
  { _id: true }
);

const appointmentSchema = new mongoose.Schema(
  {
    Appointment_Id: {
      type: Number,
      required: true,
      unique: true,
    },

    Title: {
      type: String,
      required: true,
    },

    Description: {
      type: String,
    },

    Date: {
      type: Date,
    },

    UserId: {
      type: String,
      required: true,
      index: true,
    },

    completed: {
      type: Boolean,
      default: false,
      index: true,
    },

    Priority: {
      type: String,
      enum: ["Low", "Medium", "High"],
      default: "Medium",
      index: true,
    },

    status: {
      type: String,
      enum: ["pending", "in_progress", "completed", "overdue", "cancelled"],
      default: "pending",
      index: true,
    },

    category: {
      type: String,
      default: "General",
      index: true,
    },

    tags: [{ type: String, trim: true }],

    dueTime: {
      type: String,
    },

    notes: {
      type: String,
    },

    subtasks: [subtaskSchema],

    reminderOffsetMinutes: {
      type: Number,
      default: 30,
    },

    reminderAt: {
      type: Date,
      index: true,
    },

    reminderSent: {
      type: Boolean,
      default: false,
    },

    recurrence: {
      type: String,
      enum: ["none", "daily", "weekdays", "weekly", "monthly", "custom"],
      default: "none",
    },

    recurrenceCustom: {
      type: String,
    },

    recurrenceGroupId: {
      type: Number,
      index: true,
    },

    completedAt: {
      type: Date,
    },

    cancelledReminders: {
      type: Boolean,
      default: false,
    },

    lastAutoRolledAt: {
      type: Date,
    },
  },
  { timestamps: true }
);

appointmentSchema.index({ UserId: 1, Date: 1 });
appointmentSchema.index({ UserId: 1, completed: 1, Date: 1 });
appointmentSchema.index({ UserId: 1, status: 1 });

module.exports = mongoose.model("Appointment", appointmentSchema);
