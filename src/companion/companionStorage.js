const KEY = "tf_companion_memory";
const COOLDOWN_MS = 4 * 60 * 1000;

function dateKey(now = new Date()) {
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
}

function emptyMemory() {
  return {
    welcomed: false,
    shown: {},
    lastShownAt: 0,
    lastTaskCount: null,
    lastCompletedCount: null,
    onboardingCompleted: false,
    onboardingSkipped: false,
    currentOnboardingStep: 0,
  };
}

export function loadCompanionMemory() {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return emptyMemory();
    return { ...emptyMemory(), ...JSON.parse(raw) };
  } catch {
    return emptyMemory();
  }
}

export function saveCompanionMemory(memory) {
  try {
    localStorage.setItem(KEY, JSON.stringify(memory));
  } catch {
    /* ignore quota */
  }
}

export function wasShownToday(id, now = new Date()) {
  const memory = loadCompanionMemory();
  return memory.shown?.[id] === dateKey(now);
}

export function markShown(id, now = new Date()) {
  const memory = loadCompanionMemory();
  memory.shown = { ...memory.shown, [id]: dateKey(now) };
  memory.lastShownAt = now.getTime();
  saveCompanionMemory(memory);
  return memory;
}

export function markWelcomed() {
  const memory = loadCompanionMemory();
  memory.welcomed = true;
  saveCompanionMemory(memory);
}

export function isCoolingDown(now = new Date(), ms = COOLDOWN_MS) {
  const memory = loadCompanionMemory();
  return now.getTime() - (memory.lastShownAt || 0) < ms;
}

export function rememberCounts({ total, completedToday }) {
  const memory = loadCompanionMemory();
  if (typeof total === "number") memory.lastTaskCount = total;
  if (typeof completedToday === "number") memory.lastCompletedCount = completedToday;
  saveCompanionMemory(memory);
  return memory;
}

export function getOnboardingState() {
  const memory = loadCompanionMemory();
  return {
    completed: Boolean(memory.onboardingCompleted),
    skipped: Boolean(memory.onboardingSkipped),
    step: Number(memory.currentOnboardingStep) || 0,
  };
}

export function saveOnboardingStep(step) {
  const memory = loadCompanionMemory();
  memory.currentOnboardingStep = step;
  saveCompanionMemory(memory);
}

export function completeOnboarding() {
  const memory = loadCompanionMemory();
  memory.onboardingCompleted = true;
  memory.onboardingSkipped = false;
  memory.currentOnboardingStep = 0;
  memory.welcomed = true;
  saveCompanionMemory(memory);
}

export function skipOnboarding() {
  const memory = loadCompanionMemory();
  memory.onboardingSkipped = true;
  memory.onboardingCompleted = false;
  memory.currentOnboardingStep = 0;
  memory.welcomed = true;
  saveCompanionMemory(memory);
}

export function resetOnboarding() {
  const memory = loadCompanionMemory();
  memory.onboardingCompleted = false;
  memory.onboardingSkipped = false;
  memory.currentOnboardingStep = 0;
  saveCompanionMemory(memory);
}
