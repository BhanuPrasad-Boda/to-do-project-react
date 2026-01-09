const express = require("express");
const router = express.Router();
const Appointment = require("../models/Appointment"); // We'll later rename to Todo

// 🔹 GET single todo
router.get("/single/:id", async (req, res) => {
  try {
    const todo = await Appointment.findOne({
      Appointment_Id: Number(req.params.id),
    });

    if (!todo) {
      return res.status(404).json({ message: "Todo not found" });
    }

    res.json(todo);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 🔹 GET all todos for a user
router.get("/:userId", async (req, res) => {
  try {
    const todos = await Appointment.find({
      UserId: req.params.userId,
    }).sort({ Date: -1, createdAt: -1 }); // sort by due date then creation date

    res.json(todos);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 🔹 CREATE todo
router.post("/", async (req, res) => {
  try {
    const todo = new Appointment(req.body);
    const savedTodo = await todo.save();

    res.status(201).json(savedTodo);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// 🔹 UPDATE todo
router.put("/:id", async (req, res) => {
  try {
    const updated = await Appointment.findOneAndUpdate(
      { Appointment_Id: Number(req.params.id) },
      req.body,
      { new: true }
    );

    res.json(updated);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// 🔹 DELETE todo
router.delete("/:id", async (req, res) => {
  try {
    await Appointment.findOneAndDelete({
      Appointment_Id: Number(req.params.id),
    });

    res.json({ message: "Todo deleted" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
