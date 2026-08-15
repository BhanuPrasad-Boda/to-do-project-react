function defaultPrefs(user) {
  return {
    taskReminders: true,
    overdueAlerts: true,
    dailyPlanning: true,
    weeklySummary: true,
    endOfDay: true,
    emailNotifications: false,
    browserNotifications: true,
    quietHoursEnabled: true,
    quietHoursStart: "22:00",
    quietHoursEnd: "07:00",
    defaultReminderMinutes: 30,
    autoPilot: true,
    autoRolloverOverdue: true,
    autoAdvanceRecurring: true,
    smartReminders: true,
    companionEnabled: true,
    companionProactive: true,
    companionCelebrations: true,
    companionGuidance: true,
    ...(user?.notificationPreferences?.toObject?.() || user?.notificationPreferences || {}),
  };
}

function startOfDay(date) {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
}

function smartReminderOffset(priority, defaultMinutes = 30, enabled = true) {
  const base = Number.isFinite(Number(defaultMinutes)) ? Number(defaultMinutes) : 30;
  if (!enabled) return base;
  if (priority === "High") return Math.max(base, 120);
  if (priority === "Low") return Math.min(base, 15);
  return base;
}

function nextCatchUpDate(now = new Date()) {
  const slot = new Date(now);
  if (now.getHours() < 9) {
    slot.setHours(9, 0, 0, 0);
    return slot;
  }
  if (now.getHours() < 16) {
    slot.setHours(now.getHours() + 2, 0, 0, 0);
    return slot;
  }
  slot.setDate(slot.getDate() + 1);
  slot.setHours(9, 0, 0, 0);
  return slot;
}

function pickNextTask(tasks = [], now = new Date()) {
  const open = tasks.filter((t) => !t.completed && t.status !== "cancelled");
  const rank = { High: 0, Medium: 1, Low: 2 };
  const byRankThenDue = (a, b) => {
    const pd = (rank[a.Priority] ?? 1) - (rank[b.Priority] ?? 1);
    if (pd !== 0) return pd;
    return new Date(a.Date || 0) - new Date(b.Date || 0);
  };
  const overdue = open.filter((t) => t.Date && new Date(t.Date) < now).sort(byRankThenDue);
  const todayStart = startOfDay(now);
  const tomorrow = new Date(todayStart);
  tomorrow.setDate(tomorrow.getDate() + 1);
  const today = open
    .filter((t) => t.Date && new Date(t.Date) >= now && new Date(t.Date) < tomorrow)
    .sort(byRankThenDue);
  const later = open.filter((t) => t.Date && new Date(t.Date) >= tomorrow).sort(byRankThenDue);
  const undated = open.filter((t) => !t.Date);
  return overdue[0] || today[0] || later[0] || undated[0] || null;
}

function parseHm(value, fallback) {
  const match = String(value || fallback).match(/^(\d{1,2}):(\d{2})$/);
  if (!match) return { h: 22, m: 0 };
  return { h: Number(match[1]), m: Number(match[2]) };
}

function isWithinQuietHours(prefs, now = new Date()) {
  if (!prefs?.quietHoursEnabled) return false;
  const start = parseHm(prefs.quietHoursStart, "22:00");
  const end = parseHm(prefs.quietHoursEnd, "07:00");
  const minutes = now.getHours() * 60 + now.getMinutes();
  const startMin = start.h * 60 + start.m;
  const endMin = end.h * 60 + end.m;
  if (startMin === endMin) return false;
  if (startMin < endMin) return minutes >= startMin && minutes < endMin;
  return minutes >= startMin || minutes < endMin;
}

function quietHoursEndDate(prefs, now = new Date()) {
  const end = parseHm(prefs.quietHoursEnd, "07:00");
  const result = new Date(now);
  result.setHours(end.h, end.m, 0, 0);
  if (result <= now) result.setDate(result.getDate() + 1);
  return result;
}

function isCriticalType(type) {
  return type === "overdue" || type === "high_priority";
}

function computeReminderAt(dueDate, offsetMinutes) {
  if (!dueDate) return null;
  const due = new Date(dueDate);
  if (Number.isNaN(due.getTime())) return null;
  const offset = Number.isFinite(Number(offsetMinutes)) ? Number(offsetMinutes) : 30;
  return new Date(due.getTime() - offset * 60 * 1000);
}

function deriveStatus(task, now = new Date()) {
  if (task.completed || task.status === "completed") return "completed";
  if (task.status === "cancelled") return "cancelled";
  if (task.status === "in_progress") {
    if (task.Date && new Date(task.Date) < now) return "overdue";
    return "in_progress";
  }
  if (task.Date && new Date(task.Date) < now && !task.completed) return "overdue";
  return "pending";
}

function nextOccurrenceDate(fromDate, recurrence) {
  const next = new Date(fromDate || Date.now());
  switch (recurrence) {
    case "daily":
      next.setDate(next.getDate() + 1);
      break;
    case "weekdays": {
      do {
        next.setDate(next.getDate() + 1);
      } while (next.getDay() === 0 || next.getDay() === 6);
      break;
    }
    case "weekly":
      next.setDate(next.getDate() + 7);
      break;
    case "monthly":
      next.setMonth(next.getMonth() + 1);
      break;
    default:
      return null;
  }
  return next;
}

function buildDailyPlan(tasks, now = new Date()) {
  const start = new Date(now);
  start.setHours(0, 0, 0, 0);
  const end = new Date(start);
  end.setDate(end.getDate() + 1);

  const today = tasks.filter((t) => {
    if (t.completed || t.status === "cancelled") return false;
    if (!t.Date) return false;
    const d = new Date(t.Date);
    return d >= start && d < end;
  });

  const overdue = tasks.filter(
    (t) => !t.completed && t.Date && new Date(t.Date) < start
  );

  const high = today
    .filter((t) => t.Priority === "High")
    .sort((a, b) => new Date(a.Date) - new Date(b.Date));

  const schedule = [...today].sort((a, b) => {
    const p = { High: 0, Medium: 1, Low: 2 };
    const pd = (p[a.Priority] ?? 1) - (p[b.Priority] ?? 1);
    if (pd !== 0) return pd;
    return new Date(a.Date) - new Date(b.Date);
  });

  let cursor = new Date(now);
  if (cursor.getHours() < 9) cursor.setHours(9, 0, 0, 0);
  const suggested = schedule.map((task, index) => {
    const slot = task.Date ? new Date(task.Date) : new Date(cursor.getTime() + index * 90 * 60 * 1000);
    return {
      Appointment_Id: task.Appointment_Id,
      Title: task.Title,
      Priority: task.Priority,
      suggestedAt: slot,
    };
  });

  return {
    date: start,
    totalToday: today.length,
    overdueCount: overdue.length,
    highPriority: high.map((t) => ({ Appointment_Id: t.Appointment_Id, Title: t.Title })),
    suggestedSchedule: suggested,
  };
}

module.exports = {
  defaultPrefs,
  isWithinQuietHours,
  quietHoursEndDate,
  isCriticalType,
  computeReminderAt,
  deriveStatus,
  nextOccurrenceDate,
  buildDailyPlan,
  startOfDay,
  smartReminderOffset,
  nextCatchUpDate,
  pickNextTask,
};
