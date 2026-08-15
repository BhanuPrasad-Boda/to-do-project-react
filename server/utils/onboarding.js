const STATUSES = ["NOT_STARTED", "IN_PROGRESS", "COMPLETED", "SKIPPED"];

function clampStep(value) {
  const step = Number(value);
  if (!Number.isFinite(step) || step < 0) return 0;
  return Math.min(40, Math.floor(step));
}

function resolveOnboarding(user = {}) {
  if (STATUSES.includes(user.onboardingStatus)) {
    return {
      onboardingStatus: user.onboardingStatus,
      currentTourStep: clampStep(user.currentTourStep),
      onboardingCompleted: user.onboardingStatus === "COMPLETED",
      onboardingSkipped: user.onboardingStatus === "SKIPPED",
    };
  }
  return {
    onboardingStatus: "COMPLETED",
    currentTourStep: 0,
    onboardingCompleted: true,
    onboardingSkipped: false,
  };
}

function applyOnboardingUpdate(user, body = {}) {
  const current = resolveOnboarding(user);
  const nextStatus = STATUSES.includes(body.status) ? body.status : null;
  const hasStep = body.currentTourStep !== undefined;
  let status = current.onboardingStatus;
  let step = current.currentTourStep;

  if (nextStatus === "COMPLETED") {
    status = "COMPLETED";
    step = 0;
  } else if (nextStatus === "SKIPPED") {
    status = current.onboardingStatus === "COMPLETED" ? "COMPLETED" : "SKIPPED";
    step = 0;
  } else if (nextStatus === "IN_PROGRESS") {
    if (current.onboardingStatus === "COMPLETED" || current.onboardingStatus === "SKIPPED") {
      return { ...current, ignored: true };
    }
    status = "IN_PROGRESS";
    if (hasStep) step = clampStep(body.currentTourStep);
  } else if (hasStep && current.onboardingStatus === "IN_PROGRESS") {
    step = clampStep(body.currentTourStep);
  }

  return {
    onboardingStatus: status,
    currentTourStep: step,
    onboardingCompleted: status === "COMPLETED",
    onboardingSkipped: status === "SKIPPED",
    ignored: false,
  };
}

module.exports = {
  STATUSES,
  clampStep,
  resolveOnboarding,
  applyOnboardingUpdate,
};
