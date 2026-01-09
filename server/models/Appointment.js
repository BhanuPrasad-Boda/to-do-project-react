const mongoose = require("mongoose");

const appointmentSchema = new mongoose.Schema(
  {
    // This will later be renamed to Todo_Id
    Appointment_Id: {
      type: Number,
      required: true,
      unique: true,
    },

    // To-Do title
    Title: {
      type: String,
      required: true,
    },

    // Optional notes
    Description: {
      type: String,
    },

    // Optional due date (not mandatory like appointment)
    Date: {
      type: Date,
    },

    // User who owns the todo
    UserId: {
      type: String,
      required: true,
    },

    // ✅ Core To-Do field
    Completed: {
      type: Boolean,
      default: false,
    },

    // Optional but useful
    Priority: {
      type: String,
      enum: ["Low", "Medium", "High"],
      default: "Medium",
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Appointment", appointmentSchema);
