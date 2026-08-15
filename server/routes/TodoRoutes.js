const express = require("express");
const router = express.Router();
const Todo = require("../models/Todo");
const authMiddleware = require("../middleware/authMiddleware");

router.use(authMiddleware);

router.post("/", async (req, res) => {
  try {
    const todo = new Todo({ ...req.body, userId: req.user.UserId });
    const savedTodo = await todo.save();
    res.status(201).json(savedTodo);
  } catch {
    res.status(400).json({ message: "Unable to create todo" });
  }
});

router.get("/", async (req, res) => {
  try {
    const todos = await Todo.find({ userId: req.user.UserId }).sort({ createdAt: -1 });
    res.json(todos);
  } catch {
    res.status(500).json({ message: "Something went wrong. Please try again." });
  }
});

router.get("/single/:id", async (req, res) => {
  try {
    const todo = await Todo.findById(req.params.id);
    if (!todo || todo.userId !== req.user.UserId) {
      return res.status(404).json({ message: "Todo not found" });
    }
    res.json(todo);
  } catch {
    res.status(500).json({ message: "Something went wrong. Please try again." });
  }
});

router.delete("/:id", async (req, res) => {
  try {
    const todo = await Todo.findById(req.params.id);
    if (!todo || todo.userId !== req.user.UserId) {
      return res.status(404).json({ message: "Todo not found" });
    }
    await Todo.findByIdAndDelete(req.params.id);
    res.json({ message: "Todo deleted" });
  } catch {
    res.status(500).json({ message: "Something went wrong. Please try again." });
  }
});

module.exports = router;
