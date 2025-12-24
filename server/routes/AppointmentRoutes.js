const express = require("express");
const router = express.Router();
const Appointment = require("../models/Appointment");

// 🔹 GET single appointment FIRST
router.get("/single/:id", async (req, res) => {
  try {
    const appointment = await Appointment.findOne({
      Appointment_Id: Number(req.params.id),
    });

    if (!appointment) {
      return res.status(404).json({ message: "Appointment not found" });
    }

    res.json(appointment);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 🔹 GET appointments for user SECOND
router.get("/:userId", async (req, res) => {
  try {
    const appointments = await Appointment.find({ UserId: req.params.userId })
      .sort({ Date: -1 });

    res.json(appointments);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 🔹 CREATE
router.post("/", async (req, res) => {
  try {
    const appointment = new Appointment(req.body);
    const savedAppointment = await appointment.save();
    res.status(201).json(savedAppointment);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// 🔹 UPDATE
router.put("/:id", async (req, res) => {
  try {
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

// 🔹 DELETE
router.delete("/:id", async (req, res) => {
  try {
    await Appointment.findOneAndDelete({
      Appointment_Id: Number(req.params.id),
    });
    res.json({ message: "Appointment deleted" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
