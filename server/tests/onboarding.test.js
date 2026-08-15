const { describe, it } = require("node:test");
const assert = require("node:assert/strict");
const { resolveOnboarding, applyOnboardingUpdate } = require("../utils/onboarding");
const { requireConfirm } = require("../services/assistantTools");

describe("onboarding account state", () => {
  it("treats legacy users without a status as completed", () => {
    const resolved = resolveOnboarding({});
    assert.equal(resolved.onboardingStatus, "COMPLETED");
    assert.equal(resolved.onboardingCompleted, true);
  });

  it("keeps new users on NOT_STARTED", () => {
    const resolved = resolveOnboarding({ onboardingStatus: "NOT_STARTED", currentTourStep: 0 });
    assert.equal(resolved.onboardingStatus, "NOT_STARTED");
    assert.equal(resolved.onboardingCompleted, false);
  });

  it("does not reopen a completed tour into IN_PROGRESS", () => {
    const next = applyOnboardingUpdate(
      { onboardingStatus: "COMPLETED", currentTourStep: 0 },
      { status: "IN_PROGRESS", currentTourStep: 2 }
    );
    assert.equal(next.onboardingStatus, "COMPLETED");
    assert.equal(next.ignored, true);
  });

  it("records skip without clearing a completed account", () => {
    const skipped = applyOnboardingUpdate(
      { onboardingStatus: "IN_PROGRESS", currentTourStep: 4 },
      { status: "SKIPPED" }
    );
    assert.equal(skipped.onboardingStatus, "SKIPPED");
    const completed = applyOnboardingUpdate(
      { onboardingStatus: "COMPLETED", currentTourStep: 0 },
      { status: "SKIPPED" }
    );
    assert.equal(completed.onboardingStatus, "COMPLETED");
  });
});

describe("assistant tool confirmation", () => {
  it("blocks destructive tools until confirm is true", () => {
    const blocked = requireConfirm("deleteTask", {});
    assert.equal(blocked.requiresConfirm, true);
    assert.equal(requireConfirm("deleteTask", { confirm: true }), null);
    assert.equal(requireConfirm("getOverdueTasks", {}), null);
  });
});
