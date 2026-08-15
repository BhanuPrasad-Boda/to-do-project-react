import {
  buildCompanionContext,
  companionPrefs,
  isAuthRoute,
  isWithinQuietHours,
  selectProactiveMessage,
} from "./companionEngine";
import { interpretCompanionQuery } from "./companionIntents";

test("hides companion on auth and OTP routes", () => {
  expect(isAuthRoute("/")).toBe(true);
  expect(isAuthRoute("/login")).toBe(true);
  expect(isAuthRoute("/register")).toBe(true);
  expect(isAuthRoute("/forgot-password")).toBe(true);
  expect(isAuthRoute("/reset-password/abc")).toBe(true);
  expect(isAuthRoute("/user-dashboard")).toBe(false);
  expect(isAuthRoute("/add-appointment")).toBe(false);
});

test("respects quiet hours and disabled companion", () => {
  const prefs = companionPrefs({
    quietHoursEnabled: true,
    quietHoursStart: "22:00",
    quietHoursEnd: "07:00",
    companionEnabled: false,
  });
  const quietNow = new Date("2026-08-14T23:30:00");
  expect(isWithinQuietHours(prefs, quietNow)).toBe(true);
  const ctx = buildCompanionContext({
    pathname: "/user-dashboard",
    todos: [],
    prefs,
    now: quietNow,
  });
  expect(selectProactiveMessage(ctx, {}, null)).toBe(null);
});

test("builds overdue and today counts from tasks", () => {
  const now = new Date("2026-08-14T10:00:00");
  const ctx = buildCompanionContext({
    pathname: "/user-dashboard",
    view: "tasks",
    todos: [
      { Title: "Report", Date: "2026-08-14T16:00:00", Priority: "High", completed: false },
      { Title: "Call", Date: "2026-08-13T09:00:00", Priority: "Medium", completed: false },
      { Title: "Done", Date: "2026-08-14T08:00:00", completed: true },
    ],
    now,
  });
  expect(ctx.route).toBe("dashboard");
  expect(ctx.counts.overdue).toBe(1);
  expect(ctx.counts.today).toBe(1);
  expect(ctx.counts.highToday).toBe(1);
});

test("proactive messages wait until the product tour is finished", () => {
  const ctx = buildCompanionContext({
    pathname: "/user-dashboard",
    todos: [],
    now: new Date("2026-08-14T09:00:00"),
  });
  expect(selectProactiveMessage(ctx, { onboardingCompleted: false, onboardingSkipped: false, shown: {} }, null)).toBe(null);
});

test("completed event celebrates without stacking overdue copy", () => {
  const now = new Date("2026-08-14T15:00:00");
  const ctx = buildCompanionContext({
    pathname: "/user-dashboard",
    todos: [
      { Title: "A", completed: true, completedAt: now.toISOString() },
      { Title: "B", completed: true, completedAt: now.toISOString() },
      { Title: "C", completed: true, completedAt: now.toISOString() },
    ],
    now,
  });
  const message = selectProactiveMessage(ctx, { welcomed: true, onboardingCompleted: true, shown: {} }, "completed");
  expect(message.id).toBe("progress");
  expect(message.text).toMatch(/great progress/i);
});

test("intent parser uses task data instead of an API", () => {
  const ctx = buildCompanionContext({
    pathname: "/user-dashboard",
    todos: [{ Title: "Report", Date: "2026-08-13T09:00:00", completed: false }],
    now: new Date("2026-08-14T10:00:00"),
  });
  const reply = interpretCompanionQuery("show overdue tasks", ctx);
  expect(reply.text).toMatch(/1 overdue/);
  expect(reply.actions.some((item) => item.id === "show-overdue")).toBe(true);
});
