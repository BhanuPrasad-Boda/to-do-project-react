const mongoose = require("mongoose");

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
    Description: String,
    Date: {
      type: Date,
      required: true,
    },
    UserId: {
      type: String,
      required: true,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Appointment", appointmentSchema);
