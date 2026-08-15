import { ONBOARDING, isAssistantMode, shouldAutoStartTour, shouldOfferResume, resumeStep } from "./onboarding";
import { interpretCompanionQuery } from "./companionIntents";
import { breakdownTask } from "./taskBreakdown";
import { buildCompanionContext } from "./companionEngine";

test("first login starts the tour; later logins stay in assistant mode", () => {
  expect(shouldAutoStartTour(ONBOARDING.NOT_STARTED)).toBe(true);
  expect(shouldAutoStartTour(ONBOARDING.COMPLETED)).toBe(false);
  expect(shouldAutoStartTour(ONBOARDING.SKIPPED)).toBe(false);
  expect(shouldAutoStartTour(ONBOARDING.COMPLETED, true)).toBe(true);
  expect(isAssistantMode(ONBOARDING.COMPLETED)).toBe(true);
  expect(isAssistantMode(ONBOARDING.SKIPPED)).toBe(true);
  expect(isAssistantMode(ONBOARDING.NOT_STARTED)).toBe(false);
});

test("interrupted tours resume instead of restarting", () => {
  expect(shouldOfferResume(ONBOARDING.IN_PROGRESS, 4)).toBe(true);
  expect(shouldOfferResume(ONBOARDING.IN_PROGRESS, 0)).toBe(false);
  expect(shouldOfferResume(ONBOARDING.COMPLETED, 4)).toBe(false);
  expect(resumeStep(4, 9)).toBe(4);
});

test("create and delete intents require confirmation", () => {
  const ctx = buildCompanionContext({
    pathname: "/user-dashboard",
    todos: [{ Appointment_Id: 1, Title: "Project report", Date: "2026-08-14T17:00:00", completed: false }],
    now: new Date("2026-08-14T10:00:00"),
  });
  const created = interpretCompanionQuery("Create a task to submit the report tomorrow at 5 PM", ctx);
  expect(created.tool.name).toBe("createTask");
  expect(created.tool.needsConfirm).toBe(true);
  expect(created.actions.some((item) => item.id === "confirm-tool")).toBe(true);

  const deleted = interpretCompanionQuery("Delete project report", ctx);
  expect(deleted.tool.name).toBe("deleteTask");
  expect(deleted.tool.needsConfirm).toBe(true);
});

test("website launch breaks into confirmable subtasks", () => {
  const plan = breakdownTask("I need to launch the website");
  expect(plan.items.some((item) => /hosting/i.test(item.title))).toBe(true);
  const ctx = buildCompanionContext({ pathname: "/user-dashboard", todos: [], now: new Date("2026-08-14T10:00:00") });
  const reply = interpretCompanionQuery("I need to launch the website", ctx);
  expect(reply.tool.name).toBe("createSubtasks");
  expect(reply.items.length).toBeGreaterThan(3);
});
