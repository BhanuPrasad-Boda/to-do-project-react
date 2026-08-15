const Appointment = require("../models/Appointment");

function startOfDay(date) {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
}

function percent(part, whole) {
  if (!whole) return 0;
  return Math.round((part / whole) * 100);
}

async function getProductivity(userId, now = new Date()) {
  const tasks = await Appointment.find({
    UserId: userId,
    status: { $ne: "cancelled" },
  }).lean();

  const todayStart = startOfDay(now);
  const tomorrow = new Date(todayStart);
  tomorrow.setDate(tomorrow.getDate() + 1);
  const weekStart = new Date(todayStart);
  weekStart.setDate(weekStart.getDate() - weekStart.getDay());
  const monthStart = new Date(todayStart.getFullYear(), todayStart.getMonth(), 1);

  const inRange = (t, start, end) => {
    const d = t.Date ? new Date(t.Date) : t.createdAt ? new Date(t.createdAt) : null;
    if (!d) return false;
    return d >= start && d < end;
  };

  const todayTasks = tasks.filter((t) => inRange(t, todayStart, tomorrow));
  const weekTasks = tasks.filter((t) => inRange(t, weekStart, tomorrow));
  const monthTasks = tasks.filter((t) => inRange(t, monthStart, tomorrow));

  const completedToday = todayTasks.filter((t) => t.completed).length;
  const overdue = tasks.filter(
    (t) => !t.completed && t.Date && new Date(t.Date) < now
  );
  const upcoming = tasks
    .filter((t) => !t.completed && t.Date && new Date(t.Date) >= now)
    .sort((a, b) => new Date(a.Date) - new Date(b.Date))
    .slice(0, 8);

  const byPriority = {
    High: tasks.filter((t) => !t.completed && t.Priority === "High").length,
    Medium: tasks.filter((t) => !t.completed && t.Priority === "Medium").length,
    Low: tasks.filter((t) => !t.completed && t.Priority === "Low").length,
  };

  const dayNames = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  const completedByDay = [0, 0, 0, 0, 0, 0, 0];
  tasks.forEach((t) => {
    if (!t.completed) return;
    const d = new Date(t.completedAt || t.updatedAt || t.Date);
    if (!Number.isNaN(d.getTime())) completedByDay[d.getDay()] += 1;
  });
  const mostProductiveDay = dayNames[completedByDay.indexOf(Math.max(...completedByDay))];

  const trend = [];
  for (let i = 6; i >= 0; i -= 1) {
    const day = new Date(todayStart);
    day.setDate(day.getDate() - i);
    const next = new Date(day);
    next.setDate(next.getDate() + 1);
    const dayTasks = tasks.filter((t) => inRange(t, day, next));
    trend.push({
      date: day.toISOString().slice(0, 10),
      completed: dayTasks.filter((t) => t.completed).length,
      total: dayTasks.length,
    });
  }

  let streak = 0;
  for (let i = 0; i < 60; i += 1) {
    const day = new Date(todayStart);
    day.setDate(day.getDate() - i);
    const next = new Date(day);
    next.setDate(next.getDate() + 1);
    const done = tasks.some(
      (t) => t.completed && inRange({ Date: t.completedAt || t.Date }, day, next)
    );
    if (done) streak += 1;
    else if (i > 0) break;
  }

  return {
    today: {
      remaining: todayTasks.filter((t) => !t.completed).length,
      completed: completedToday,
      overdue: overdue.length,
      upcoming: upcoming.length,
      total: todayTasks.length,
    },
    progress: {
      daily: percent(completedToday, todayTasks.length),
      weekly: percent(weekTasks.filter((t) => t.completed).length, weekTasks.length),
      monthly: percent(monthTasks.filter((t) => t.completed).length, monthTasks.length),
    },
    productivity: {
      completedTotal: tasks.filter((t) => t.completed).length,
      streak,
      mostProductiveDay,
      trend,
    },
    priority: byPriority,
    overdueTasks: overdue.slice(0, 10),
    upcomingTasks: upcoming,
  };
}

module.exports = { getProductivity };
