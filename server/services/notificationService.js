const Notification = require("../models/Notification");
const User = require("../models/User");
const { sendNotificationEmail } = require("./emailService");
const {
  defaultPrefs,
  isWithinQuietHours,
  quietHoursEndDate,
  isCriticalType,
} = require("./automationRules");

const TYPE_CATEGORY = {
  task_reminder: "reminders",
  overdue: "overdue",
  upcoming: "tasks",
  recurring: "reminders",
  daily_planning: "productivity",
  end_of_day: "productivity",
  high_priority: "tasks",
  weekly_summary: "productivity",
  auto_rollover: "productivity",
  system: "system",
};

const TYPE_PREF = {
  task_reminder: "taskReminders",
  overdue: "overdueAlerts",
  upcoming: "taskReminders",
  recurring: "taskReminders",
  daily_planning: "dailyPlanning",
  end_of_day: "endOfDay",
  high_priority: "taskReminders",
  weekly_summary: "weeklySummary",
  auto_rollover: "autoPilot",
  system: null,
};

async function notify({
  userId,
  user,
  type,
  title,
  body,
  taskId = null,
  meta = null,
}) {
  const owner = user || (await User.findOne({ UserId: userId }).lean());
  if (!owner) return null;

  const prefs = defaultPrefs(owner);
  const prefKey = TYPE_PREF[type];
  if (prefKey && prefs[prefKey] === false) return null;

  const quiet = isWithinQuietHours(prefs);
  const critical = isCriticalType(type);
  const queued = quiet && !critical;

  const doc = await Notification.create({
    userId: owner.UserId,
    type,
    category: TYPE_CATEGORY[type] || "tasks",
    title,
    body,
    taskId,
    read: false,
    queued,
    queuedUntil: queued ? quietHoursEndDate(prefs) : null,
    deliveredAt: queued ? null : new Date(),
    channels: {
      inApp: true,
      email: Boolean(prefs.emailNotifications && !queued),
      webPush: Boolean(prefs.browserNotifications && !queued),
    },
    meta,
  });

  if (!queued && prefs.emailNotifications && owner.Email) {
    try {
      await sendNotificationEmail(owner.Email, title, body);
    } catch {
      console.error("Notification email failed");
    }
  }

  return doc;
}

async function flushQueued(now = new Date()) {
  const queued = await Notification.find({
    queued: true,
    queuedUntil: { $lte: now },
  }).limit(100);

  for (const item of queued) {
    item.queued = false;
    item.deliveredAt = now;
    await item.save();

    const owner = await User.findOne({ UserId: item.userId }).lean();
    const prefs = defaultPrefs(owner);
    if (prefs.emailNotifications && owner?.Email) {
      try {
        await sendNotificationEmail(owner.Email, item.title, item.body);
      } catch {
        console.error("Queued notification email failed");
      }
    }
  }

  return queued.length;
}

async function listForUser(userId, { category, unreadOnly } = {}) {
  const query = { userId };
  if (category && category !== "all") query.category = category;
  if (unreadOnly) query.read = false;
  return Notification.find(query).sort({ createdAt: -1 }).limit(100);
}

async function unreadCount(userId) {
  return Notification.countDocuments({ userId, read: false });
}

async function markRead(userId, id) {
  return Notification.findOneAndUpdate(
    { _id: id, userId },
    { $set: { read: true, readAt: new Date() } },
    { new: true }
  );
}

async function markAllRead(userId) {
  const result = await Notification.updateMany(
    { userId, read: false },
    { $set: { read: true, readAt: new Date() } }
  );
  return result.modifiedCount;
}

async function clearRead(userId) {
  const result = await Notification.deleteMany({ userId, read: true });
  return result.deletedCount;
}

module.exports = {
  notify,
  flushQueued,
  listForUser,
  unreadCount,
  markRead,
  markAllRead,
  clearRead,
};
