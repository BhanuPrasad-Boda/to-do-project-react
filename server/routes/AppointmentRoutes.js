const express = require("express");
const router = express.Router();
const Appointment = require("../models/Appointment");
const User = require("../models/User");
const authMiddleware = require("../middleware/authMiddleware");
const automation = require("../services/automationEngine");
const { parseNaturalTask, suggestReschedule } = require("../services/taskParser");
const { buildDailyPlan, deriveStatus, computeReminderAt } = require("../services/automationRules");
const { getProductivity } = require("../services/analyticsService");
const { runAssistantTool } = require("../services/assistantTools");
const { handleAssistantChat } = require("../services/assistantChat");
const { rateLimit, clientKey } = require("../middleware/rateLimiter");

const assistantChatLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 20,
  keyGenerator: (req) => `assistant-chat:${req.user?.UserId || clientKey(req)}`,
  message: "Too many assistant requests. Please wait a moment.",
});

router.use(authMiddleware);

function notOwner(task, userId) {
  return !task || task.UserId !== userId;
}

function sanitizeInput(body, userId) {
  const allowed = [
    "Appointment_Id",
    "Title",
    "Description",
    "Date",
    "UserId",
    "completed",
    "Priority",
    "status",
    "category",
    "tags",
    "dueTime",
    "notes",
    "subtasks",
    "reminderOffsetMinutes",
    "recurrence",
    "recurrenceCustom",
    "naturalText",
  ];
  const next = {};
  allowed.forEach((key) => {
    if (body[key] !== undefined) next[key] = body[key];
  });
  next.UserId = userId;
  if (next.Title) next.Title = String(next.Title).slice(0, 200);
  if (next.Description) next.Description = String(next.Description).slice(0, 4000);
  if (next.notes) next.notes = String(next.notes).slice(0, 4000);
  if (Array.isArray(next.tags)) next.tags = next.tags.slice(0, 12).map((t) => String(t).slice(0, 32));
  return next;
}

async function listTasks(req, res) {
  try {
    const userId = req.params.userId || req.user.UserId;
    if (userId !== req.user.UserId) {
      return res.status(403).json({ message: "Forbidden" });
    }

    const {
      search,
      status,
      priority,
      category,
      tag,
      overdue,
      completed,
      sort = "newest",
      page,
      limit,
    } = req.query;

    const query = { UserId: userId };

    if (completed === "true") query.completed = true;
    if (completed === "false") query.completed = false;
    if (status && status !== "all") query.status = status;
    if (priority && priority !== "all") query.Priority = priority;
    if (category && category !== "all") query.category = category;
    if (tag) query.tags = tag;
    if (overdue === "true") {
      query.completed = false;
      query.Date = { $lt: new Date() };
    }
    if (search && String(search).trim()) {
      const rx = new RegExp(String(search).trim().replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i");
      query.$or = [{ Title: rx }, { Description: rx }, { notes: rx }, { tags: rx }, { category: rx }];
    }

    const sortMap = {
      newest: { createdAt: -1 },
      oldest: { createdAt: 1 },
      dueDateAsc: { Date: 1 },
      dueDateDesc: { Date: -1 },
      priority: { Priority: 1, Date: 1 },
      updated: { updatedAt: -1 },
    };

    const cursor = Appointment.find(query).sort(sortMap[sort] || { createdAt: -1 });
    const pageNum = Number(page);
    const pageSize = Math.min(Number(limit) || 50, 100);

    if (pageNum >= 1) {
      const [items, total] = await Promise.all([
        cursor.skip((pageNum - 1) * pageSize).limit(pageSize),
        Appointment.countDocuments(query),
      ]);
      return res.json({ items, total, page: pageNum, limit: pageSize });
    }

    const todos = await cursor;
    res.json(todos);
  } catch {
    res.status(500).json({ message: "Something went wrong. Please try again." });
  }
}

async function createTask(req, res) {
  try {
    const user = await User.findOne({ UserId: req.user.UserId });
    const input = sanitizeInput(req.body, req.user.UserId);
    if (!input.Appointment_Id) input.Appointment_Id = Date.now();
    if (!input.Title || !String(input.Title).trim()) {
      return res.status(400).json({ message: "Title is required" });
    }

    const normalized = automation.normalizeTaskInput(input, user);
    const todo = new Appointment(normalized);
    const saved = await todo.save();
    await automation.onTaskCreated(saved, user);
    res.status(201).json(saved);
  } catch (err) {
    res.status(400).json({ message: "Unable to create task" });
  }
}

async function updateTask(req, res) {
  try {
    const todo = await Appointment.findOne({ Appointment_Id: Number(req.params.id) });
    if (notOwner(todo, req.user.UserId)) {
      return res.status(todo ? 403 : 404).json({ message: todo ? "Forbidden" : "Todo not found" });
    }

    const user = await User.findOne({ UserId: req.user.UserId });
    const input = sanitizeInput({ ...todo.toObject(), ...req.body }, req.user.UserId);
    const normalized = automation.normalizeTaskInput(input, user);

    const wasCompleted = todo.completed;
    Object.assign(todo, normalized);

    if (!wasCompleted && todo.completed) {
      await automation.onTaskCompleted(todo, user);
    } else if (wasCompleted && !todo.completed) {
      await automation.onTaskReopened(todo);
    } else {
      todo.status = deriveStatus(todo);
      todo.reminderAt = computeReminderAt(todo.Date, todo.reminderOffsetMinutes);
      await todo.save();
    }

    res.json(todo);
  } catch {
    res.status(400).json({ message: "Update failed" });
  }
}

async function deleteTask(req, res) {
  try {
    const todo = await Appointment.findOne({ Appointment_Id: Number(req.params.id) });
    if (notOwner(todo, req.user.UserId)) {
      return res.status(todo ? 403 : 404).json({ message: todo ? "Forbidden" : "Todo not found" });
    }
    await Appointment.deleteOne({ Appointment_Id: todo.Appointment_Id });
    res.json({ message: "Todo deleted" });
  } catch {
    res.status(500).json({ message: "Something went wrong. Please try again." });
  }
}

router.post("/parse", (req, res) => {
  const text = req.body.text || req.body.naturalText || req.body.Title || "";
  res.json(parseNaturalTask(text));
});

router.get("/stats/productivity", async (req, res) => {
  try {
    const stats = await getProductivity(req.user.UserId);
    res.json(stats);
  } catch {
    res.status(500).json({ message: "Something went wrong. Please try again." });
  }
});

router.get("/plan/today", async (req, res) => {
  try {
    const tasks = await Appointment.find({
      UserId: req.user.UserId,
      status: { $ne: "cancelled" },
    });
    res.json(buildDailyPlan(tasks));
  } catch {
    res.status(500).json({ message: "Something went wrong. Please try again." });
  }
});

router.get("/assistant", async (req, res) => {
  try {
    const user = await User.findOne({ UserId: req.user.UserId });
    if (!user) return res.status(404).json({ message: "User not found" });
    res.json(await automation.buildAssistant(user));
  } catch {
    res.status(500).json({ message: "Something went wrong. Please try again." });
  }
});

router.post("/assistant/act", async (req, res) => {
  try {
    const user = await User.findOne({ UserId: req.user.UserId });
    if (!user) return res.status(404).json({ message: "User not found" });
    const body = req.body || {};
    const raw = JSON.stringify(body);
    if (raw.length > 8000) {
      return res.status(400).json({ message: "Request is too large" });
    }
    const result = await runAssistantTool(user, body.tool, body.payload || {});
    let status = 200;
    if (result.ok === false) {
      if (result.status) status = result.status;
      else if (result.requiresConfirm || result.ambiguous) status = 200;
      else status = 400;
    }
    return res.status(status).json(result);
  } catch {
    res.status(500).json({ message: "Something went wrong. Please try again." });
  }
});

router.post("/assistant/chat", assistantChatLimiter, async (req, res) => {
  try {
    const user = await User.findOne({ UserId: req.user.UserId });
    if (!user) return res.status(404).json({ message: "User not found" });
    const body = req.body || {};
    const raw = JSON.stringify(body);
    if (raw.length > 8000) {
      return res.status(400).json({ message: "Request is too large" });
    }
    const result = await handleAssistantChat({
      user,
      message: body.message,
      context: body.context || {},
      reset: body.reset === true,
    });
    return res.json(result);
  } catch {
    res.status(500).json({ message: "Sorry, I couldn't complete that action. Please try again." });
  }
});

router.post("/quick", async (req, res) => {
  try {
    const text = String(req.body.text || req.body.naturalText || req.body.Title || "").trim();
    if (!text) return res.status(400).json({ message: "Type a task to add" });
    const user = await User.findOne({ UserId: req.user.UserId });
    const input = sanitizeInput(
      {
        Appointment_Id: Date.now(),
        Title: text,
        naturalText: text,
        UserId: req.user.UserId,
      },
      req.user.UserId
    );
    const normalized = automation.normalizeTaskInput(input, user);
    const todo = new Appointment(normalized);
    const saved = await todo.save();
    await automation.onTaskCreated(saved, user);
    res.status(201).json(saved);
  } catch {
    res.status(400).json({ message: "Unable to create task" });
  }
});

router.post("/catch-up", async (req, res) => {
  try {
    const user = await User.findOne({ UserId: req.user.UserId });
    if (!user) return res.status(404).json({ message: "User not found" });
    const result = await automation.catchUpOverdue(user);
    res.json({
      message:
        result.moved === 0
          ? "Nothing overdue to move"
          : `Moved ${result.moved} task${result.moved === 1 ? "" : "s"} into your next open slot`,
      moved: result.moved,
      date: result.date,
    });
  } catch {
    res.status(500).json({ message: "Something went wrong. Please try again." });
  }
});

router.post("/apply-plan", async (req, res) => {
  try {
    const user = await User.findOne({ UserId: req.user.UserId });
    if (!user) return res.status(404).json({ message: "User not found" });
    const result = await automation.applySuggestedPlan(user);
    res.json({
      message:
        result.updated === 0
          ? "No suggested times to apply"
          : `Applied times to ${result.updated} task${result.updated === 1 ? "" : "s"}`,
      updated: result.updated,
      plan: result.plan,
    });
  } catch {
    res.status(500).json({ message: "Something went wrong. Please try again." });
  }
});

router.get("/get-appointments/:userId", listTasks);
router.get("/single/:id", async (req, res) => {
  try {
    const todo = await Appointment.findOne({ Appointment_Id: Number(req.params.id) });
    if (notOwner(todo, req.user.UserId)) {
      return res.status(todo ? 403 : 404).json({ message: todo ? "Forbidden" : "Todo not found" });
    }
    res.json(todo);
  } catch {
    res.status(500).json({ message: "Something went wrong. Please try again." });
  }
});

router.put("/toggle-complete/:id", async (req, res) => {
  try {
    const todo = await Appointment.findOne({ Appointment_Id: Number(req.params.id) });
    if (notOwner(todo, req.user.UserId)) {
      return res.status(todo ? 403 : 404).json({ message: todo ? "Forbidden" : "Todo not found" });
    }
    const user = await User.findOne({ UserId: req.user.UserId });
    if (!todo.completed) {
      await automation.onTaskCompleted(todo, user);
    } else {
      await automation.onTaskReopened(todo);
    }
    res.json({
      message: todo.completed ? "Task marked as completed" : "Task marked as pending",
      completed: todo.completed,
      task: todo,
    });
  } catch {
    res.status(500).json({ message: "Something went wrong. Please try again." });
  }
});

router.put("/reschedule/:id", async (req, res) => {
  try {
    const todo = await Appointment.findOne({ Appointment_Id: Number(req.params.id) });
    if (notOwner(todo, req.user.UserId)) {
      return res.status(todo ? 403 : 404).json({ message: todo ? "Forbidden" : "Todo not found" });
    }
    if (!req.body.Date) {
      return res.status(400).json({ message: "A new date is required", suggestions: suggestReschedule(todo.Date) });
    }
    const user = await User.findOne({ UserId: req.user.UserId });
    todo.Date = new Date(req.body.Date);
    todo.completed = false;
    const normalized = automation.normalizeTaskInput(todo.toObject(), user);
    Object.assign(todo, normalized);
    todo.status = "pending";
    await todo.save();
    res.json(todo);
  } catch {
    res.status(400).json({ message: "Unable to reschedule" });
  }
});

router.get("/:id/reschedule-options", async (req, res) => {
  try {
    const todo = await Appointment.findOne({ Appointment_Id: Number(req.params.id) });
    if (notOwner(todo, req.user.UserId)) {
      return res.status(todo ? 403 : 404).json({ message: todo ? "Forbidden" : "Todo not found" });
    }
    res.json({ suggestions: suggestReschedule(todo.Date) });
  } catch {
    res.status(500).json({ message: "Something went wrong. Please try again." });
  }
});

router.put("/edit-appointment/:id", updateTask);
router.delete("/delete-appointment/:id", deleteTask);
router.get("/:userId", listTasks);
router.post("/", createTask);
router.put("/:id", updateTask);
router.delete("/:id", deleteTask);

module.exports = router;
