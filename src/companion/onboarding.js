export const ONBOARDING = {
  NOT_STARTED: "NOT_STARTED",
  IN_PROGRESS: "IN_PROGRESS",
  COMPLETED: "COMPLETED",
  SKIPPED: "SKIPPED",
};

export function isAssistantMode(status) {
  return status === ONBOARDING.COMPLETED || status === ONBOARDING.SKIPPED;
}

export function shouldAutoStartTour(status, replay = false) {
  if (replay) return true;
  return status === ONBOARDING.NOT_STARTED;
}

export function shouldOfferResume(status, step = 0) {
  return status === ONBOARDING.IN_PROGRESS && Number(step) > 0;
}

export function resumeStep(step, total) {
  const value = Number(step) || 0;
  if (value < 0) return 0;
  return Math.min(value, Math.max(0, total - 1));
}
