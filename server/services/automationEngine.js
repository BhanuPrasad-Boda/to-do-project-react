const Appointment = require("../models/Appointment");
const User = require("../models/User");
const { parseNaturalTask } = require("./taskParser");
const { spawnNextOccurrence, nextFutureOccurrence } = require("./recurrenceService");
const notificationService = require("./notificationService");
const {
  defaultPrefs,
  computeReminderAt,
  deriveStatus,
  buildDailyPlan,
  startOfDay,
  smartReminderOffset,
  nextCatchUpDate,
  leftoverTasks,
  undatedTasks,
  buildAutopilotView,
  isSnoozed,
} = require("./automationRules");

function applyParsedDefaults(payload, parsed) {
  const next = { ...payload };
  if (!next.Title && parsed.title) next.Title = parsed.title;
  if (!next.Date && parsed.dueDate) next.Date = parsed.dueDate;
  if (!next.dueTime && parsed.dueTime) next.dueTime = parsed.dueTime;
  if ((!next.Priority || next.Priority === "Medium") && parsed.priority) {
    next.Priority = parsed.priority;
  }
  if ((!next.category || next.category === "General") && parsed.category) {
    next.category = parsed.category;
  }
  if ((!next.recurrence || next.recurrence === "none") && parsed.recurrence) {
    next.recurrence = parsed.recurrence;
  }
  return next;
}

function normalizeTaskInput(raw, user) {
  const prefs = defaultPrefs(user);
  let payload = { ...raw };
  const explicitReminder = raw.reminderOffsetMinutes != null && raw.reminderOffsetMinutes !== "";

  if (payload.naturalText) {
    const parsed = parseNaturalTask(payload.naturalText);
    payload = applyParsedDefaults(payload, parsed);
    if (parsed.title) payload.Title = parsed.title;
  } else if (payload.Title) {
    payload = applyParsedDefaults(payload, parseNaturalTask(payload.Title));
  }

  if (payload.Date) payload.Date = new Date(payload.Date);
  if (payload.completed) payload.status = "completed";
  else payload.status = deriveStatus(payload);

  let offset = explicitReminder
    ? Number(payload.reminderOffsetMinutes)
    : prefs.defaultReminderMinutes ?? 30;
  if (!Number.isFinite(offset)) offset = 30;
  if (!explicitReminder && prefs.autoPilot !== false) {
    offset = smartReminderOffset(payload.Priority, offset, prefs.smartReminders !== false);
  }
  payload.reminderOffsetMinutes = offset;
  payload.reminderAt = computeReminderAt(payload.Date, offset);
  payload.reminderSent = false;
  payload.cancelledReminders = false;

  if (!payload.recurrence) payload.recurrence = "none";
  if (payload.recurrence !== "none" && !payload.recurrenceGroupId) {
    payload.recurrenceGroupId = payload.Appointment_Id;
  }

  if (!payload.category) payload.category = "General";
  if (!payload.Priority) payload.Priority = "Medium";
  if (!Array.isArray(payload.tags)) payload.tags = [];

  return payload;
}

async function safeNotify(payload) {
  try {
    return await notificationService.notify(payload);
  } catch (err) {
    console.error("Notification create failed");
    return null;
  }
}

async function onTaskCreated(task, user) {
  if (task.Date) {
    const hoursUntil = (new Date(task.Date) - Date.now()) / 36e5;
    if (hoursUntil <= 0) {
      await safeNotify({
        userId: task.UserId,
        user,
        type: "overdue",
        title: "Task overdue",
        body: `"${task.Title}" is already due.`,
        taskId: task.Appointment_Id,
      });
    } else if (hoursUntil <= 24) {
      await safeNotify({
        userId: task.UserId,
        user,
        type: "upcoming",
        title: "Upcoming task",
        body: `${task.Title} is due ${hoursUntil < 1 ? "soon" : "within 24 hours"}.`,
        taskId: task.Appointment_Id,
      });
    }
    if (task.Priority === "High" && hoursUntil > 0 && hoursUntil <= 6) {
      await safeNotify({
        userId: task.UserId,
        user,
        type: "high_priority",
        title: "High-priority task",
        body: `Your high-priority task "${task.Title}" is due soon.`,
        taskId: task.Appointment_Id,
      });
    }
  }
  return task;
}

async function onTaskCompleted(task, user) {
  task.completed = true;
  task.status = "completed";
  task.completedAt = task.completedAt || new Date();
  task.cancelledReminders = true;
  task.reminderSent = true;
  task.snoozedUntil = undefined;
  await task.save();

  if (task.recurrence && task.recurrence !== "none") {
    const next = await spawnNextOccurrence(task);
    if (next) {
    await safeNotify({
      userId: task.UserId,
      user,
      type: "recurring",
      title: "Next occurrence scheduled",
      body: `"${task.Title}" is scheduled again for ${new Date(next.Date).toLocaleString()}.`,
      taskId: next.Appointment_Id,
    });
    }
  }

  return task;
}

async function onTaskReopened(task) {
  task.completed = false;
  task.completedAt = undefined;
  task.cancelledReminders = false;
  task.reminderSent = false;
  task.snoozedUntil = undefined;
  task.status = deriveStatus(task);
  task.reminderAt = computeReminderAt(task.Date, task.reminderOffsetMinutes);
  await task.save();
  return task;
}

async function snoozeTask(task, minutes = 60, now = new Date()) {
  const mins = Number.isFinite(Number(minutes)) ? Number(minutes) : 60;
  task.snoozedUntil = new Date(now.getTime() + Math.max(15, mins) * 60 * 1000);
  await task.save();
  return task;
}

async function processReminders(now = new Date()) {
  const due = await Appointment.find({
    completed: false,
    cancelledReminders: { $ne: true },
    reminderSent: { $ne: true },
    status: { $ne: "cancelled" },
    Date: { $ne: null },
    $or: [
      { reminderAt: { $lte: now, $ne: null } },
      { reminderAt: { $exists: false } },
      { reminderAt: null },
    ],
  }).limit(200);

  let count = 0;
  for (const task of due) {
    try {
      if (!task.reminderAt) {
        task.reminderAt = computeReminderAt(task.Date, task.reminderOffsetMinutes ?? 30);
        if (task.reminderAt && task.reminderAt > now) {
          await task.save();
          continue;
        }
      }
      if (!task.reminderAt || task.reminderAt > now) continue;
      if (isSnoozed(task, now)) continue;

      const user = await User.findOne({ UserId: task.UserId });
      const mins = Math.max(0, Math.round((new Date(task.Date) - now) / 60000));
      const when =
        mins <= 1
          ? "now"
          : mins < 60
            ? `in ${mins} minutes`
            : `in ${Math.round(mins / 60)} hour${mins >= 90 ? "s" : ""}`;

      await safeNotify({
        userId: task.UserId,
        user,
        type: task.Priority === "High" ? "high_priority" : "task_reminder",
        title: "Task reminder",
        body: `Your task "${task.Title}" is due ${when}.`,
        taskId: task.Appointment_Id,
      });

      task.reminderSent = true;
      await task.save();
      count += 1;
    } catch {
      console.error("Reminder job item failed");
    }
  }
  return count;
}

async function processOverdue(now = new Date()) {
  const tasks = await Appointment.find({
    completed: false,
    Date: { $lt: now, $ne: null },
    status: { $nin: ["completed", "cancelled", "overdue"] },
  }).limit(200);

  const byUser = new Map();
  for (const task of tasks) {
    task.status = "overdue";
    await task.save();
    const list = byUser.get(task.UserId) || [];
    list.push(task);
    byUser.set(task.UserId, list);
  }

  for (const [userId, list] of byUser.entries()) {
    const user = await User.findOne({ UserId: userId });
    const count = list.length;
    await safeNotify({
      userId,
      user,
      type: "overdue",
      title: count === 1 ? "Task overdue" : "Overdue tasks",
      body:
        count === 1
          ? `"${list[0].Title}" is overdue.`
          : `You have ${count} overdue tasks.`,
      taskId: count === 1 ? list[0].Appointment_Id : null,
    });
  }

  return tasks.length;
}

async function rolloverTask(task, when, now = new Date()) {
  task.Date = when;
  task.status = "pending";
  task.reminderSent = false;
  task.cancelledReminders = false;
  task.reminderAt = computeReminderAt(when, task.reminderOffsetMinutes);
  task.lastAutoRolledAt = now;
  await task.save();
  return task;
}

async function processRollover(now = new Date()) {
  const todayStart = startOfDay(now);
  const tasks = await Appointment.find({
    completed: false,
    status: { $ne: "cancelled" },
    Date: { $lt: todayStart, $ne: null },
    Priority: { $ne: "High" },
    $or: [{ lastAutoRolledAt: { $exists: false } }, { lastAutoRolledAt: { $lt: todayStart } }],
  }).limit(200);

  const byUser = new Map();
  for (const task of tasks) {
    const list = byUser.get(task.UserId) || [];
    list.push(task);
    byUser.set(task.UserId, list);
  }

  let moved = 0;
  for (const [userId, list] of byUser.entries()) {
    const user = await User.findOne({ UserId: userId });
    const prefs = defaultPrefs(user);
    if (prefs.autoPilot === false || prefs.autoRolloverOverdue === false) continue;

    const when = nextCatchUpDate(now);
    for (const task of list) {
      await rolloverTask(task, when, now);
      moved += 1;
    }

    await safeNotify({
      userId,
      user,
      type: "auto_rollover",
      title: "Leftover work lined up",
      body:
        list.length === 1
          ? `"${list[0].Title}" was moved into today’s schedule.`
          : `${list.length} leftover tasks were moved into today’s schedule.`,
      taskId: list.length === 1 ? list[0].Appointment_Id : null,
    });
  }
  return moved;
}

async function processRecurringAdvance(now = new Date()) {
  const tasks = await Appointment.find({
    completed: false,
    recurrence: { $nin: ["none", null] },
    Date: { $lt: now, $ne: null },
    status: { $ne: "cancelled" },
  }).limit(80);

  const byUser = new Map();
  for (const task of tasks) {
    const list = byUser.get(task.UserId) || [];
    list.push(task);
    byUser.set(task.UserId, list);
  }

  let spawned = 0;
  for (const [userId, list] of byUser.entries()) {
    const user = await User.findOne({ UserId: userId });
    const prefs = defaultPrefs(user);
    if (prefs.autoPilot === false || prefs.autoAdvanceRecurring === false) continue;

    let createdForUser = 0;
    for (const task of list) {
      const nextDate = nextFutureOccurrence(task.Date, task.recurrence, now);
      if (!nextDate) continue;
      const next = await spawnNextOccurrence(task, { evenIfOpen: true, nextDate });
      if (next && String(next.Appointment_Id) !== String(task.Appointment_Id)) {
        spawned += 1;
        createdForUser += 1;
      }
    }

    if (createdForUser > 0) {
      await safeNotify({
        userId,
        user,
        type: "recurring",
        title: "Repeating tasks updated",
        body:
          createdForUser === 1
            ? "Your next repeating task is on the calendar."
            : `${createdForUser} repeating tasks were scheduled ahead.`,
      });
    }
  }
  return spawned;
}

async function catchUpOverdue(user, now = new Date()) {
  const open = await Appointment.find({
    UserId: user.UserId,
    completed: false,
    status: { $ne: "cancelled" },
    Date: { $ne: null },
  }).limit(200);

  const leftover = leftoverTasks(open, now);
  let when = nextCatchUpDate(now);
  for (const task of leftover) {
    await rolloverTask(task, when, now);
    when = new Date(when.getTime() + 30 * 60 * 1000);
  }
  return {
    moved: leftover.length,
    date: leftover.length ? leftover[0].Date : nextCatchUpDate(now),
    tasks: leftover,
  };
}

async function applySuggestedPlan(user, now = new Date()) {
  const tasks = await Appointment.find({
    UserId: user.UserId,
    status: { $ne: "cancelled" },
  });
  const todayStart = startOfDay(now);
  const tomorrow = new Date(todayStart);
  tomorrow.setDate(tomorrow.getDate() + 1);
  const occupied = new Set(
    tasks
      .filter((task) => !task.completed && task.Date && new Date(task.Date) >= todayStart && new Date(task.Date) < tomorrow)
      .map((task) => new Date(task.Date).getTime())
  );

  let cursor = nextCatchUpDate(now);
  let updated = 0;
  for (const task of undatedTasks(tasks)) {
    while (occupied.has(cursor.getTime())) {
      cursor = new Date(cursor.getTime() + 90 * 60 * 1000);
    }
    task.Date = new Date(cursor);
    task.status = deriveStatus(task, now);
    task.reminderSent = false;
    task.reminderAt = computeReminderAt(task.Date, task.reminderOffsetMinutes);
    await task.save();
    occupied.add(cursor.getTime());
    cursor = new Date(cursor.getTime() + 90 * 60 * 1000);
    updated += 1;
  }
  return { updated, plan: buildDailyPlan(tasks, now) };
}

async function buildAssistant(user, now = new Date()) {
  const prefs = defaultPrefs(user);
  const tasks = await Appointment.find({
    UserId: user.UserId,
    status: { $ne: "cancelled" },
  }).lean();
  return {
    autoPilot: prefs.autoPilot !== false,
    ...buildAutopilotView(tasks, now),
  };
}

async function processDailyPlanning(now = new Date()) {
  if (now.getHours() > 10) return 0;
  const users = await User.find({ isActive: { $ne: false } }).limit(200);
  let sent = 0;

  for (const user of users) {
    const prefs = defaultPrefs(user);
    if (!prefs.dailyPlanning) continue;

    const last = user.lastDailyPlanAt ? new Date(user.lastDailyPlanAt) : null;
    if (last && last.toDateString() === now.toDateString()) continue;

    const tasks = await Appointment.find({
      UserId: user.UserId,
      status: { $ne: "cancelled" },
    });
    const plan = buildDailyPlan(tasks, now);
    if (plan.totalToday === 0 && plan.overdueCount === 0) continue;

    const high = plan.highPriority.map((t) => t.Title).slice(0, 3);
    const bodyParts = [`You have ${plan.totalToday} task${plan.totalToday === 1 ? "" : "s"} today.`];
    if (high.length) bodyParts.push(`High priority: ${high.join(", ")}.`);
    if (plan.overdueCount) bodyParts.push(`${plan.overdueCount} overdue.`);

    await safeNotify({
      userId: user.UserId,
      user,
      type: "daily_planning",
      title: "Good morning",
      body: bodyParts.join(" "),
      meta: plan,
    });

    user.lastDailyPlanAt = now;
    await user.save();
    sent += 1;
  }
  return sent;
}

async function processEndOfDay(now = new Date()) {
  if (now.getHours() < 18) return 0;
  const users = await User.find({ isActive: { $ne: false } }).limit(200);
  let sent = 0;

  const start = new Date(now);
  start.setHours(0, 0, 0, 0);
  const end = new Date(start);
  end.setDate(end.getDate() + 1);

  for (const user of users) {
    const prefs = defaultPrefs(user);
    if (!prefs.endOfDay) continue;
    const last = user.lastEndOfDayAt ? new Date(user.lastEndOfDayAt) : null;
    if (last && last.toDateString() === now.toDateString()) continue;

    const unfinished = await Appointment.countDocuments({
      UserId: user.UserId,
      completed: false,
      status: { $ne: "cancelled" },
      Date: { $gte: start, $lt: end },
    });
    if (unfinished === 0) continue;

    await safeNotify({
      userId: user.UserId,
      user,
      type: "end_of_day",
      title: "End of day",
      body: `You still have ${unfinished} unfinished task${unfinished === 1 ? "" : "s"}.`,
    });
    user.lastEndOfDayAt = now;
    await user.save();
    sent += 1;
  }
  return sent;
}

async function processWeeklySummary(now = new Date()) {
  if (now.getDay() !== 0 || now.getHours() < 17) return 0;
  const users = await User.find({ isActive: { $ne: false } }).limit(200);
  let sent = 0;
  const weekStart = new Date(now);
  weekStart.setDate(weekStart.getDate() - 7);

  for (const user of users) {
    const prefs = defaultPrefs(user);
    if (!prefs.weeklySummary) continue;
    if (user.lastWeeklySummaryAt && now - user.lastWeeklySummaryAt < 6 * 24 * 36e5) {
      continue;
    }

    const due = await Appointment.find({
      UserId: user.UserId,
      Date: { $gte: weekStart, $lte: now },
    });
    if (due.length === 0) continue;
    const completed = due.filter((t) => t.completed).length;
    const pct = Math.round((completed / due.length) * 100);

    await safeNotify({
      userId: user.UserId,
      user,
      type: "weekly_summary",
      title: "Weekly summary",
      body: `You completed ${pct}% of your tasks this week (${completed} of ${due.length}).`,
    });
    user.lastWeeklySummaryAt = now;
    await user.save();
    sent += 1;
  }
  return sent;
}

async function runOne(name, fn) {
  try {
    return await fn();
  } catch (err) {
    console.error(`Scheduled job ${name} failed`);
    return 0;
  }
}

async function runScheduledJobs(now = new Date()) {
  const reminders = await runOne("reminders", () => processReminders(now));
  const overdue = await runOne("overdue", () => processOverdue(now));
  const rolled = await runOne("rollover", () => processRollover(now));
  const recurring = await runOne("recurring", () => processRecurringAdvance(now));
  const flushed = await runOne("flush", () => notificationService.flushQueued(now));
  const daily = await runOne("daily", () => processDailyPlanning(now));
  const eod = await runOne("endOfDay", () => processEndOfDay(now));
  const weekly = await runOne("weekly", () => processWeeklySummary(now));
  return { reminders, overdue, rolled, recurring, flushed, daily, eod, weekly };
}

module.exports = {
  normalizeTaskInput,
  onTaskCreated,
  onTaskCompleted,
  onTaskReopened,
  snoozeTask,
  processReminders,
  processOverdue,
  processRollover,
  processRecurringAdvance,
  processDailyPlanning,
  processEndOfDay,
  processWeeklySummary,
  runScheduledJobs,
  applyParsedDefaults,
  catchUpOverdue,
  applySuggestedPlan,
  buildAssistant,
};
