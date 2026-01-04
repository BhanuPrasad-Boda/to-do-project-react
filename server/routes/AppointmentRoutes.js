const express = require("express");
const router = express.Router();
const Appointment = require("../models/Appointment");
const authMiddleware = require("../middleware/authMiddleware");


// 🔹 GET single appointment (protected)
router.get("/single/:id", authMiddleware, async (req, res) => {
  try {
    const appointment = await Appointment.findOne({
      Appointment_Id: Number(req.params.id),
    });

    if (!appointment) {
      return res.status(404).json({ message: "Appointment not found" });
    }

    // Only allow owner to access
    if (appointment.UserId !== req.user.UserId) {
      return res.status(403).json({ message: "Forbidden" });
    }

    res.json(appointment);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 🔹 GET all appointments for a user (protected)
router.get("/:userId", authMiddleware, async (req, res) => {
  try {
    // Ensure only the logged-in user can fetch their appointments
    if (req.user.UserId !== req.params.userId) {
      return res.status(403).json({ message: "Forbidden" });
    }

    const appointments = await Appointment.find({ UserId: req.params.userId }).sort({ Date: -1 });
    res.json(appointments);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 🔹 CREATE appointment (protected)
router.post("/", authMiddleware, async (req, res) => {
  try {
    // Only allow creating for logged-in user
    const appointment = new Appointment({
      ...req.body,
      UserId: req.user.UserId
    });

    const savedAppointment = await appointment.save();
    res.status(201).json(savedAppointment);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// 🔹 UPDATE appointment (protected)
router.put("/:id", authMiddleware, async (req, res) => {
  try {
    const appointment = await Appointment.findOne({ Appointment_Id: Number(req.params.id) });
    if (!appointment) {
      return res.status(404).json({ message: "Appointment not found" });
    }

    // Only allow owner to update
    if (appointment.UserId !== req.user.UserId) {
      return res.status(403).json({ message: "Forbidden" });
    }

    const updatedAppointment = await Appointment.findOneAndUpdate(
      { Appointment_Id: Number(req.params.id) },
      req.body,
      { new: true }
    );

    res.json(updatedAppointment);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// 🔹 DELETE appointment (protected)
router.delete("/:id", authMiddleware, async (req, res) => {
  try {
    const appointment = await Appointment.findOne({ Appointment_Id: Number(req.params.id) });
    if (!appointment) {
      return res.status(404).json({ message: "Appointment not found" });
    }

    // Only allow owner to delete
    if (appointment.UserId !== req.user.UserId) {
      return res.status(403).json({ message: "Forbidden" });
    }

    await Appointment.findOneAndDelete({ Appointment_Id: Number(req.params.id) });
    res.json({ message: "Appointment deleted" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
