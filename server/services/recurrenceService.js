const Appointment = require("../models/Appointment");
const { computeReminderAt, nextOccurrenceDate } = require("./automationRules");

function nextFutureOccurrence(fromDate, recurrence, now = new Date()) {
  if (!fromDate || !recurrence || recurrence === "none") return null;
  let cursor = new Date(fromDate);
  for (let i = 0; i < 60; i += 1) {
    const next = nextOccurrenceDate(cursor, recurrence);
    if (!next) return null;
    if (next > now) return next;
    cursor = next;
  }
  return null;
}

async function spawnNextOccurrence(task, options = {}) {
  if (!task?.recurrence || task.recurrence === "none") return null;

  const groupId = task.recurrenceGroupId || task.Appointment_Id;
  const nextDate =
    options.nextDate ||
    nextOccurrenceDate(task.Date || new Date(), task.recurrence);
  if (!nextDate) return null;

  const existing = await Appointment.findOne({
    UserId: task.UserId,
    recurrenceGroupId: groupId,
    completed: false,
    Appointment_Id: { $ne: task.Appointment_Id },
    Date: nextDate,
  });
  if (existing) return existing;

  if (!options.evenIfOpen) {
    const openSibling = await Appointment.findOne({
      UserId: task.UserId,
      recurrenceGroupId: groupId,
      completed: false,
      status: { $ne: "cancelled" },
      Appointment_Id: { $ne: task.Appointment_Id },
    });
    if (openSibling) return openSibling;
  }

  const next = new Appointment({
    Appointment_Id: Date.now() + Math.floor(Math.random() * 1000),
    Title: task.Title,
    Description: task.Description,
    Date: nextDate,
    UserId: task.UserId,
    completed: false,
    Priority: task.Priority || "Medium",
    status: "pending",
    category: task.category || "General",
    tags: task.tags || [],
    dueTime: task.dueTime,
    notes: task.notes,
    subtasks: (task.subtasks || []).map((s) => ({
      title: s.title,
      completed: false,
    })),
    reminderOffsetMinutes: task.reminderOffsetMinutes ?? 30,
    reminderAt: computeReminderAt(nextDate, task.reminderOffsetMinutes ?? 30),
    reminderSent: false,
    recurrence: task.recurrence,
    recurrenceCustom: task.recurrenceCustom,
    recurrenceGroupId: groupId,
    cancelledReminders: false,
  });

  await next.save();
  return next;
}

module.exports = { spawnNextOccurrence, nextFutureOccurrence };
