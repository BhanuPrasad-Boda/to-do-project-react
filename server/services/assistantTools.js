const Appointment = require("../models/Appointment");
const automation = require("./automationEngine");
const { getProductivity } = require("./analyticsService");
const { deriveStatus } = require("./automationRules");
const notificationService = require("./notificationService");

const TOOLS = [
  "createTask",
  "completeTask",
  "deleteTask",
  "updateTask",
  "rescheduleTask",
  "setPriority",
  "getTasks",
  "getOverdueTasks",
  "getTodayTasks",
  "getUpcomingTasks",
  "searchTasks",
  "getProductivityStats",
  "scheduleReminder",
  "createSubtasks",
  "catchUpOverdue",
  "applyPlan",
  "getDailySummary",
  "getNotifications",
  "markNotificationRead",
];

const CONFIRM_TOOLS = new Set([
  "createTask",
  "deleteTask",
  "rescheduleTask",
  "setPriority",
  "createSubtasks",
  "catchUpOverdue",
  "applyPlan",
  "updateTask",
]);

function escapeRegex(value) {
  return String(value).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function summarize(task) {
  if (!task) return null;
  return {
    Appointment_Id: task.Appointment_Id,
    Title: task.Title,
    Date: task.Date,
    Priority: task.Priority,
    completed: task.completed,
    status: task.status,
    category: task.category,
  };
}

function requireConfirm(tool, payload = {}) {
  if (!CONFIRM_TOOLS.has(tool)) return null;
  if (payload.confirm === true) return null;
  return {
    ok: false,
    requiresConfirm: true,
    tool,
    message: "Please confirm this action before I change your tasks.",
  };
}

async function findOwned(userId, { id, query } = {}) {
  if (id != null && id !== "") {
    const task = await Appointment.findOne({
      Appointment_Id: Number(id),
      UserId: userId,
    });
    return { task, matches: task ? [task] : [] };
  }
  const q = String(query || "").trim();
  if (!q) return { task: null, matches: [] };
  const rx = new RegExp(escapeRegex(q), "i");
  const matches = await Appointment.find({
    UserId: userId,
    status: { $ne: "cancelled" },
    $or: [{ Title: rx }, { Description: rx }, { notes: rx }],
  }).limit(8);
  return {
    task: matches.length === 1 ? matches[0] : null,
    matches,
  };
}

function startOfDay(date) {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
}

async function runAssistantTool(user, tool, payload = {}, now = new Date()) {
  if (!TOOLS.includes(tool)) {
    return { ok: false, status: 400, message: "Unknown assistant action" };
  }

  const blocked = requireConfirm(tool, payload);
  if (blocked) return blocked;

  const userId = user.UserId;

  switch (tool) {
    case "createTask": {
      const text = String(payload.text || payload.Title || "").trim();
      if (!text) return { ok: false, status: 400, message: "Type a task to add" };
      const input = {
        Appointment_Id: Date.now(),
        Title: text,
        naturalText: text,
        UserId: userId,
      };
      if (payload.Date) input.Date = payload.Date;
      if (payload.Priority) input.Priority = payload.Priority;
      if (payload.category) input.category = payload.category;
      const normalized = automation.normalizeTaskInput(input, user);
      const saved = await new Appointment(normalized).save();
      await automation.onTaskCreated(saved, user);
      return { ok: true, message: `Created “${saved.Title}”.`, task: summarize(saved) };
    }

    case "completeTask": {
      const found = await findOwned(userId, payload);
      if (found.matches.length > 1) {
        return {
          ok: false,
          ambiguous: found.matches.map(summarize),
          message: "I found more than one matching task. Which should I complete?",
        };
      }
      const task = found.task;
      if (!task) return { ok: false, status: 404, message: "I could not find a task you own with that name." };
      if (task.completed) return { ok: true, message: `“${task.Title}” is already completed.`, task: summarize(task) };
      await automation.onTaskCompleted(task, user);
      return { ok: true, message: `Nice work. “${task.Title}” is completed.`, task: summarize(task) };
    }

    case "deleteTask": {
      const found = await findOwned(userId, payload);
      if (found.matches.length > 1) {
        return {
          ok: false,
          ambiguous: found.matches.map(summarize),
          message: "I found more than one matching task. Which should I delete?",
        };
      }
      const task = found.task;
      if (!task) return { ok: false, status: 404, message: "I could not find a task you own with that name." };
      await Appointment.deleteOne({ Appointment_Id: task.Appointment_Id, UserId: userId });
      return { ok: true, message: `Deleted “${task.Title}”.`, task: summarize(task) };
    }

    case "updateTask": {
      const found = await findOwned(userId, payload);
      const task = found.task;
      if (!task) return { ok: false, status: 404, message: "I could not find a task you own with that name." };
      const input = automation.normalizeTaskInput(
        {
          ...task.toObject(),
          Title: payload.Title || task.Title,
          Date: payload.Date || task.Date,
          Priority: payload.Priority || task.Priority,
          category: payload.category || task.category,
          UserId: userId,
        },
        user
      );
      Object.assign(task, input);
      await task.save();
      return { ok: true, message: `Updated “${task.Title}”.`, task: summarize(task) };
    }

    case "rescheduleTask": {
      const found = await findOwned(userId, payload);
      const task = found.task;
      if (!task) return { ok: false, status: 404, message: "I could not find a task you own with that name." };
      if (!payload.Date) return { ok: false, status: 400, message: "A new date is required" };
      task.Date = new Date(payload.Date);
      task.completed = false;
      const normalized = automation.normalizeTaskInput(task.toObject(), user);
      Object.assign(task, normalized);
      task.status = "pending";
      await task.save();
      return { ok: true, message: `Moved “${task.Title}” to the new time.`, task: summarize(task) };
    }

    case "setPriority": {
      const found = await findOwned(userId, payload);
      const task = found.task;
      if (!task) return { ok: false, status: 404, message: "I could not find a task you own with that name." };
      const next = payload.Priority;
      if (!["Low", "Medium", "High"].includes(next)) {
        return { ok: false, status: 400, message: "Priority must be Low, Medium, or High." };
      }
      task.Priority = next;
      task.status = deriveStatus(task, now);
      await task.save();
      return { ok: true, message: `Set “${task.Title}” to ${next} priority.`, task: summarize(task) };
    }

    case "getTasks":
    case "searchTasks": {
      const query = { UserId: userId, status: { $ne: "cancelled" } };
      if (payload.completed === false) query.completed = false;
      if (payload.completed === true) query.completed = true;
      if (payload.priority) query.Priority = payload.priority;
      if (payload.search) {
        const rx = new RegExp(escapeRegex(payload.search), "i");
        query.$or = [{ Title: rx }, { Description: rx }, { notes: rx }];
      }
      const tasks = await Appointment.find(query).sort({ Date: 1 }).limit(12);
      return {
        ok: true,
        message: tasks.length ? `Here are ${tasks.length} matching task${tasks.length === 1 ? "" : "s"}.` : "No matching tasks.",
        tasks: tasks.map(summarize),
      };
    }

    case "getOverdueTasks": {
      const tasks = await Appointment.find({
        UserId: userId,
        completed: false,
        status: { $ne: "cancelled" },
        Date: { $lt: now },
      })
        .sort({ Date: 1 })
        .limit(12);
      return {
        ok: true,
        message: tasks.length
          ? `You have ${tasks.length} overdue task${tasks.length === 1 ? "" : "s"}.`
          : "Nothing is overdue right now.",
        tasks: tasks.map(summarize),
      };
    }

    case "getTodayTasks": {
      const from = startOfDay(now);
      const to = new Date(from);
      to.setDate(to.getDate() + 1);
      const tasks = await Appointment.find({
        UserId: userId,
        completed: false,
        status: { $ne: "cancelled" },
        Date: { $gte: from, $lt: to },
      }).sort({ Date: 1 });
      return {
        ok: true,
        message: tasks.length
          ? `You have ${tasks.length} task${tasks.length === 1 ? "" : "s"} today.`
          : "No dated tasks for today.",
        tasks: tasks.map(summarize),
      };
    }

    case "getUpcomingTasks": {
      const tasks = await Appointment.find({
        UserId: userId,
        completed: false,
        status: { $ne: "cancelled" },
        Date: { $gte: now },
      })
        .sort({ Date: 1 })
        .limit(8);
      return {
        ok: true,
        message: tasks.length ? "Here are your next upcoming tasks." : "No upcoming dated tasks.",
        tasks: tasks.map(summarize),
      };
    }

    case "getProductivityStats": {
      const stats = await getProductivity(userId, now);
      const weekly = stats.progress?.weekly || 0;
      const monthDone = stats.productivity?.completedTotal || 0;
      const day = stats.productivity?.mostProductiveDay;
      return {
        ok: true,
        stats,
        message: `This week you are ${weekly}% complete. You have finished ${monthDone} task${
          monthDone === 1 ? "" : "s"
        } in total${day ? `, and ${day} is your most productive day` : ""}.`,
      };
    }

    case "scheduleReminder": {
      const minutes = Number(payload.minutes);
      if (!Number.isFinite(minutes) || minutes < 0 || minutes > 10080) {
        return { ok: false, status: 400, message: "Reminder lead time must be between 0 and 7 days." };
      }
      user.notificationPreferences = user.notificationPreferences || {};
      user.notificationPreferences.defaultReminderMinutes = minutes;
      user.markModified("notificationPreferences");
      await user.save();
      const hours = minutes >= 60 && minutes % 60 === 0 ? minutes / 60 : null;
      const label = minutes === 1440 ? "one day" : hours ? `${hours} hour${hours === 1 ? "" : "s"}` : `${minutes} minutes`;
      return {
        ok: true,
        message: `Done. I will remind you ${label} before important tasks.`,
        defaultReminderMinutes: minutes,
      };
    }

    case "createSubtasks": {
      const titles = Array.isArray(payload.tasks)
        ? payload.tasks.map((item) => String(item.title || item || "").trim()).filter(Boolean).slice(0, 8)
        : [];
      if (!titles.length) return { ok: false, status: 400, message: "No subtasks to create" };
      const created = [];
      for (const title of titles) {
        const input = automation.normalizeTaskInput(
          {
            Appointment_Id: Date.now() + created.length,
            Title: title,
            naturalText: title,
            UserId: userId,
            category: payload.category || "General",
          },
          user
        );
        const saved = await new Appointment(input).save();
        await automation.onTaskCreated(saved, user);
        created.push(summarize(saved));
      }
      return {
        ok: true,
        message: `Created ${created.length} task${created.length === 1 ? "" : "s"}.`,
        tasks: created,
      };
    }

    case "catchUpOverdue": {
      const result = await automation.catchUpOverdue(user, now);
      return {
        ok: true,
        message:
          result.moved === 0
            ? "No leftover tasks from earlier days to move."
            : `Lined up ${result.moved} leftover task${result.moved === 1 ? "" : "s"} into the next open slots.`,
        moved: result.moved,
      };
    }

    case "applyPlan": {
      const result = await automation.applySuggestedPlan(user, now);
      return {
        ok: true,
        message:
          result.updated === 0
            ? "No untimed tasks to place on today’s calendar."
            : `Scheduled ${result.updated} untimed task${result.updated === 1 ? "" : "s"} into today.`,
        updated: result.updated,
      };
    }

    case "getDailySummary": {
      const data = await automation.buildAssistant(user, now);
      const tasks = (data.plan?.suggestedSchedule || []).slice(0, 8).map(summarize);
      return {
        ok: true,
        message: `${data.headline}. ${data.detail}`,
        summary: {
          headline: data.headline,
          detail: data.detail,
          overdueCount: data.overdueCount,
          todayRemaining: data.todayRemaining,
        },
        tasks: tasks.length ? tasks : data.nextTask ? [data.nextTask] : [],
      };
    }

    case "getNotifications": {
      const items = await notificationService.listForUser(userId, {
        unreadOnly: payload.unreadOnly === true,
      });
      const list = items.slice(0, 8).map((item) => ({
        id: String(item._id),
        title: item.title,
        body: item.body,
        read: Boolean(item.read),
        type: item.type,
      }));
      return {
        ok: true,
        message: list.length
          ? `You have ${list.length} recent notification${list.length === 1 ? "" : "s"}.`
          : "No notifications right now.",
        notifications: list,
        tasks: list.map((item) => ({ Title: item.title })),
      };
    }

    case "markNotificationRead": {
      const id = payload.id;
      if (!id) return { ok: false, status: 400, message: "Which notification should I mark as read?" };
      const item = await notificationService.markRead(userId, id);
      if (!item) return { ok: false, status: 404, message: "I could not find a notification you own." };
      return { ok: true, message: "Marked that notification as read." };
    }

    default:
      return { ok: false, status: 400, message: "Unknown assistant action" };
  }
}

module.exports = {
  TOOLS,
  CONFIRM_TOOLS,
  requireConfirm,
  summarize,
  runAssistantTool,
};
