export const COMPANION_STATES = {
  IDLE: "idle",
  WELCOME: "welcome",
  THINKING: "thinking",
  HELPING: "helping",
  REMINDER: "reminder",
  WARNING: "warning",
  HAPPY: "happy",
  CELEBRATING: "celebrating",
  QUIET: "quiet",
  DISABLED: "disabled",
};

const AUTH_PREFIXES = [
  "/",
  "/login",
  "/register",
  "/forgot-password",
  "/forgot-userid",
  "/reset-password",
];

export function isAuthRoute(pathname = "") {
  const path = pathname.replace(/\/$/, "") || "/";
  if (path === "/") return true;
  return AUTH_PREFIXES.filter((item) => item !== "/").some((prefix) => path.startsWith(prefix));
}

export function companionPrefs(raw = {}) {
  return {
    companionEnabled: raw.companionEnabled !== false,
    companionProactive: raw.companionProactive !== false,
    companionCelebrations: raw.companionCelebrations !== false,
    companionGuidance: raw.companionGuidance !== false,
    overdueAlerts: raw.overdueAlerts !== false,
    dailyPlanning: raw.dailyPlanning !== false,
    endOfDay: raw.endOfDay !== false,
    taskReminders: raw.taskReminders !== false,
    quietHoursEnabled: Boolean(raw.quietHoursEnabled),
    quietHoursStart: raw.quietHoursStart || "22:00",
    quietHoursEnd: raw.quietHoursEnd || "07:00",
    defaultReminderMinutes: Number(raw.defaultReminderMinutes) || 30,
    autoRolloverOverdue: raw.autoRolloverOverdue !== false,
  };
}

function parseHm(value, fallback) {
  const match = String(value || fallback).match(/^(\d{1,2}):(\d{2})$/);
  if (!match) return { h: 22, m: 0 };
  return { h: Number(match[1]), m: Number(match[2]) };
}

export function isWithinQuietHours(prefs, now = new Date()) {
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

function startOfDay(date) {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
}

function isSameDay(value, now) {
  if (!value) return false;
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return false;
  return startOfDay(d).getTime() === startOfDay(now).getTime();
}

export function resolveRoute(pathname = "", view = "tasks", filter = "all") {
  const path = pathname || "";
  if (path.includes("add-appointment")) return "create";
  if (path.includes("edit-appointment")) return "edit";
  if (path.includes("delete-appointment")) return "delete";
  if (path.includes("user-dashboard")) {
    if (view === "plan") return "plan";
    if (view === "settings") return "settings";
    if (view === "notifications") return "notifications";
    if (filter === "overdue") return "overdue";
    return "dashboard";
  }
  return "other";
}

export function buildCompanionContext({
  pathname = "",
  view = "tasks",
  filter = "all",
  todos = [],
  stats = null,
  prefs = {},
  now = new Date(),
  unread = 0,
  onboardingStatus = "NOT_STARTED",
} = {}) {
  const open = todos.filter((task) => !task.completed);
  const overdue = open.filter((task) => task.Date && new Date(task.Date) < now);
  const todayStart = startOfDay(now);
  const tomorrow = new Date(todayStart);
  tomorrow.setDate(tomorrow.getDate() + 1);
  const today = open.filter((task) => {
    if (!task.Date) return false;
    const due = new Date(task.Date);
    return due >= todayStart && due < tomorrow;
  });
  const dueSoon = open.filter((task) => {
    if (!task.Date) return false;
    const ms = new Date(task.Date) - now;
    return ms > 0 && ms <= 2 * 60 * 60 * 1000;
  }).sort((a, b) => new Date(a.Date) - new Date(b.Date));
  const highToday = [...today, ...open.filter((task) => !task.Date && task.Priority === "High")]
    .filter((task) => task.Priority === "High");
  const completedToday = todos.filter(
    (task) => task.completed && isSameDay(task.completedAt || task.updatedAt || task.Date, now)
  );
  const weekly = Number(stats?.progress?.weekly || 0);
  const daily = Number(stats?.progress?.daily || 0);

  return {
    route: resolveRoute(pathname, view, filter),
    view,
    filter,
    todos,
    stats,
    prefs: companionPrefs(prefs),
    now,
    overdue,
    today,
    unread: Number(unread) || 0,
    onboardingStatus,
    counts: {
      total: todos.length,
      open: open.length,
      overdue: overdue.length,
      today: today.length,
      highToday: highToday.length,
      completedToday: completedToday.length,
      dueSoon: dueSoon.length,
    },
    nextDueSoon: dueSoon[0] || null,
    firstOverdue: overdue[0] || null,
    weekly,
    daily,
  };
}

function shown(memory, id, now) {
  const today = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
  return memory?.shown?.[id] === today;
}

export { panelGreeting } from "./assistantVoice";

export function selectProactiveMessage(ctx, memory = {}, event = null) {
  const prefs = ctx.prefs || companionPrefs();
  if (!prefs.companionEnabled) return null;
  const boarded =
    memory.onboardingCompleted ||
    memory.onboardingSkipped ||
    ctx.onboardingStatus === "COMPLETED" ||
    ctx.onboardingStatus === "SKIPPED";
  if (!boarded) return null;
  if (!prefs.companionProactive) return null;
  if (isWithinQuietHours(prefs, ctx.now)) return null;

  const cooling = ctx.now.getTime() - (memory.lastShownAt || 0) < 4 * 60 * 1000;

  if (event === "created" && prefs.companionGuidance && !shown(memory, "first-task", ctx.now)) {
    const isFirst = ctx.counts.total === 1 || memory.lastTaskCount === 0;
    if (isFirst) {
      return {
        id: "first-task",
        mood: COMPANION_STATES.HAPPY,
        text: "Your first task is in. I’ll keep it on your radar and remind you before it’s due.",
        actions: [{ id: "dismiss", label: "Thanks" }],
      };
    }
  }

  if (event === "completed" && prefs.companionCelebrations) {
    if (ctx.counts.completedToday >= 3 && !shown(memory, "progress", ctx.now)) {
      return {
        id: "progress",
        mood: COMPANION_STATES.CELEBRATING,
        text: "You are making great progress today.",
        actions: [{ id: "dismiss", label: "Keep going" }],
      };
    }
    if (!shown(memory, "completed", ctx.now) && ctx.counts.completedToday >= 1) {
      return {
        id: "completed",
        mood: COMPANION_STATES.HAPPY,
        text: "Nice work. That's completed.",
        actions: [{ id: "dismiss", label: "Thanks" }],
      };
    }
  }

  if (cooling) return null;

  if (ctx.route === "notifications" && !shown(memory, "feature-notifications", ctx.now)) {
    return {
      id: "feature-notifications",
      mood: COMPANION_STATES.HELPING,
      text: "This is your notification center. Here you will find reminders and alerts.",
      actions: [{ id: "dismiss", label: "Got it" }],
    };
  }

  if (prefs.companionGuidance && prefs.overdueAlerts && ctx.counts.overdue > 0 && !shown(memory, "overdue", ctx.now)) {
    return {
      id: "overdue",
      mood: COMPANION_STATES.WARNING,
      text: `You have ${ctx.counts.overdue} overdue task${ctx.counts.overdue === 1 ? "" : "s"}. Would you like me to help reschedule them?`,
      taskId: ctx.firstOverdue?.Appointment_Id,
      actions: [
        { id: "catch-up", label: "Reschedule" },
        { id: "show-overdue", label: "View tasks" },
        { id: "dismiss", label: "Not now" },
      ],
    };
  }

  if (prefs.companionGuidance && prefs.taskReminders && ctx.nextDueSoon && !shown(memory, "deadline", ctx.now)) {
    const ms = new Date(ctx.nextDueSoon.Date) - ctx.now;
    const hours = Math.max(1, Math.round(ms / 36e5));
    return {
      id: "deadline",
      mood: COMPANION_STATES.REMINDER,
      text: `“${ctx.nextDueSoon.Title}” is due in ${hours} hour${hours === 1 ? "" : "s"}.`,
      taskId: ctx.nextDueSoon.Appointment_Id,
      actions: [
        { id: "view-soon", label: "View task" },
        { id: "complete-soon", label: "Complete" },
        { id: "dismiss", label: "Later" },
      ],
    };
  }

  const hour = ctx.now.getHours();
  if (
    prefs.companionGuidance &&
    prefs.dailyPlanning &&
    hour >= 6 &&
    hour < 11 &&
    ctx.counts.today > 0 &&
    (ctx.route === "dashboard" || ctx.route === "plan") &&
    !shown(memory, "morning", ctx.now)
  ) {
    return {
      id: "morning",
      mood: COMPANION_STATES.HELPING,
      text: `You have ${ctx.counts.today} task${ctx.counts.today === 1 ? "" : "s"} today. Want me to help prioritize them?`,
      actions: [
        { id: "plan", label: "Plan my day" },
        { id: "view-tasks", label: "View tasks" },
        { id: "dismiss", label: "Dismiss" },
      ],
    };
  }

  if (
    prefs.companionGuidance &&
    prefs.endOfDay &&
    hour >= 18 &&
    ctx.counts.today > 0 &&
    (ctx.route === "dashboard" || ctx.route === "plan") &&
    !shown(memory, "eod", ctx.now)
  ) {
    return {
      id: "eod",
      mood: COMPANION_STATES.REMINDER,
      text: `You still have ${ctx.counts.today} task${ctx.counts.today === 1 ? "" : "s"} left today. We can move them to tomorrow if you would like.`,
      actions: [
        { id: "catch-up", label: "Move to tomorrow" },
        { id: "plan", label: "Review plan" },
        { id: "dismiss", label: "Keep them" },
      ],
    };
  }

  if (ctx.route === "create" && prefs.companionGuidance && !shown(memory, "create-hint", ctx.now)) {
    return {
      id: "create-hint",
      mood: COMPANION_STATES.HELPING,
      text: "Need help deciding a priority? Use High only for work that cannot wait.",
      actions: [{ id: "dismiss", label: "Got it" }],
    };
  }

  if (ctx.route === "overdue" && ctx.counts.overdue > 0 && prefs.companionGuidance && !shown(memory, "overdue-view", ctx.now)) {
    return {
      id: "overdue-view",
      mood: COMPANION_STATES.HELPING,
      text: "Would you like help rescheduling these?",
      actions: [
        { id: "catch-up", label: "Catch up" },
        { id: "reschedule", label: "Reschedule" },
        { id: "dismiss", label: "Not now" },
      ],
    };
  }

  if (ctx.route === "dashboard" && ctx.weekly >= 50 && ctx.counts.completedToday > 0 && !shown(memory, "stats", ctx.now)) {
    return {
      id: "stats",
      mood: COMPANION_STATES.HAPPY,
      text: "Your completion rate improved this week.",
      actions: [{ id: "dismiss", label: "Nice" }],
    };
  }

  return null;
}

export function moodFromMessage(message, { panelOpen, quiet, enabled }) {
  if (!enabled) return COMPANION_STATES.DISABLED;
  if (quiet && !panelOpen) return COMPANION_STATES.QUIET;
  if (panelOpen) return COMPANION_STATES.HELPING;
  return message?.mood || COMPANION_STATES.IDLE;
}
