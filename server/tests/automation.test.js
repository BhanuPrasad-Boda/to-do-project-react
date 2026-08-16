const { describe, it } = require("node:test");
const assert = require("node:assert/strict");
const { parseNaturalTask, suggestReschedule } = require("../services/taskParser");
const {
  isWithinQuietHours,
  computeReminderAt,
  deriveStatus,
  nextOccurrenceDate,
  buildDailyPlan,
  pickNextTask,
  smartReminderOffset,
  nextCatchUpDate,
} = require("../services/automationRules");
const { nextFutureOccurrence } = require("../services/recurrenceService");
const { allow } = require("../middleware/rateLimiter");
const { generateOtp } = require("../services/otpService");
const { maskEmail, escapeHtml } = require("../utils/html");

describe("taskParser", () => {
  it("parses title, next Friday, time, and work category", () => {
    const now = new Date("2026-08-14T10:00:00");
    const parsed = parseNaturalTask("Submit project report next Friday at 5 PM", now);
    assert.equal(parsed.title.includes("Submit project report"), true);
    assert.equal(parsed.dueDate.getDay(), 5);
    assert.equal(parsed.dueDate.getHours(), 17);
    assert.equal(parsed.priority, "High");
    assert.equal(parsed.category, "Work");
    assert.equal(parsed.reminderOffsetMinutes, 30);
  });

  it("detects daily recurrence and health category", () => {
    const parsed = parseNaturalTask("Drink water every day at 10 AM");
    assert.equal(parsed.recurrence, "daily");
    assert.equal(parsed.category, "Health");
    assert.match(parsed.title, /Drink water/i);
  });

  it("suggests reschedule options", () => {
    const suggestions = suggestReschedule(new Date("2026-08-01T09:00:00"), new Date("2026-08-14T11:00:00"));
    assert.ok(suggestions.length >= 2);
    assert.ok(suggestions.every((s) => s.date instanceof Date && s.label));
  });
});

describe("automationRules", () => {
  it("detects overnight quiet hours", () => {
    const prefs = { quietHoursEnabled: true, quietHoursStart: "22:00", quietHoursEnd: "07:00" };
    const night = new Date("2026-08-14T23:30:00");
    const morning = new Date("2026-08-14T08:00:00");
    assert.equal(isWithinQuietHours(prefs, night), true);
    assert.equal(isWithinQuietHours(prefs, morning), false);
  });

  it("computes reminder time", () => {
    const due = new Date("2026-08-14T15:00:00");
    const reminder = computeReminderAt(due, 30);
    assert.equal(reminder.getHours(), 14);
    assert.equal(reminder.getMinutes(), 30);
  });

  it("marks incomplete past-due tasks overdue", () => {
    const task = { completed: false, Date: new Date("2026-01-01"), status: "pending" };
    assert.equal(deriveStatus(task, new Date("2026-08-14")), "overdue");
  });

  it("advances weekday recurrence past weekends", () => {
    const friday = new Date("2026-08-14T09:00:00");
    const next = nextOccurrenceDate(friday, "weekdays");
    assert.equal(next.getDay(), 1);
  });

  it("builds a daily plan from deadlines and priority", () => {
    const now = new Date("2026-08-14T08:00:00");
    const tasks = [
      { Appointment_Id: 1, Title: "Report", Priority: "High", Date: new Date("2026-08-14T17:00:00"), completed: false },
      { Appointment_Id: 2, Title: "Old", Priority: "Low", Date: new Date("2026-08-01T09:00:00"), completed: false },
    ];
    const plan = buildDailyPlan(tasks, now);
    assert.equal(plan.totalToday, 1);
    assert.equal(plan.overdueCount, 1);
    assert.equal(plan.highPriority[0].Title, "Report");
  });

  it("picks overdue high-priority work first", () => {
    const now = new Date("2026-08-14T10:00:00");
    const next = pickNextTask([
      { Title: "Later", Priority: "High", Date: new Date("2026-08-14T17:00:00"), completed: false },
      { Title: "Old high", Priority: "High", Date: new Date("2026-08-13T09:00:00"), completed: false },
      { Title: "Old low", Priority: "Low", Date: new Date("2026-08-01T09:00:00"), completed: false },
    ], now);
    assert.equal(next.Title, "Old high");
  });

  it("uses a 2-hour reminder for high-priority work", () => {
    assert.equal(smartReminderOffset("High", 30, true), 120);
    assert.equal(smartReminderOffset("Low", 30, true), 15);
    assert.equal(smartReminderOffset("High", 30, false), 30);
  });

  it("places leftover work in the next open slot", () => {
    const morning = nextCatchUpDate(new Date("2026-08-14T07:00:00"));
    assert.equal(morning.getHours(), 9);
    const afternoon = nextCatchUpDate(new Date("2026-08-14T13:00:00"));
    assert.equal(afternoon.getHours(), 15);
  });
});

describe("notifications", () => {
  it("accepts auto_rollover as a notification type", () => {
    const Notification = require("../models/Notification");
    const typePath = Notification.schema.path("type");
    const values = typePath.enumValues || typePath.options.enum;
    assert.ok(values.includes("auto_rollover"));
    assert.ok(values.includes("task_reminder"));
    assert.ok(values.includes("overdue"));
  });
});

describe("recurrence", () => {
  it("jumps a stale daily task to the next future day", () => {
    const next = nextFutureOccurrence(
      new Date("2026-08-10T09:00:00"),
      "daily",
      new Date("2026-08-14T10:00:00")
    );
    assert.ok(next > new Date("2026-08-14T10:00:00"));
    assert.equal(next.getHours(), 9);
  });
});

describe("security helpers", () => {
  it("generates a 6-digit OTP", () => {
    const otp = generateOtp();
    assert.match(otp, /^\d{6}$/);
  });

  it("masks email addresses", () => {
    assert.equal(maskEmail("user@example.com"), "u***@example.com");
  });

  it("escapes HTML", () => {
    assert.equal(escapeHtml("<script>"), "&lt;script&gt;");
  });

  it("rate-limits repeated keys", () => {
    const key = `test-${Date.now()}`;
    assert.equal(allow(key, 2, 60_000).ok, true);
    assert.equal(allow(key, 2, 60_000).ok, true);
    assert.equal(allow(key, 2, 60_000).ok, false);
  });
});
