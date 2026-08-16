export const TOUR_STEPS = [
  {
    id: "welcome",
    view: "tasks",
    target: null,
    gesture: "wave",
    hold: null,
    talk: true,
    text: "Welcome! I'm your productivity guide. Let me show you around.",
    primary: "Start tour",
  },
  {
    id: "dashboard",
    view: "tasks",
    target: "guide-overview",
    fallback: "guide-tasks",
    gesture: "point",
    hold: null,
    talk: true,
    text: "This is your dashboard. You'll find your tasks, progress, reminders, and productivity information here.",
  },
  {
    id: "tasks",
    view: "tasks",
    target: "guide-tasks",
    fallback: "guide-overview",
    gesture: "point",
    hold: null,
    talk: true,
    text: "Here you can manage your tasks and organize them by priority and status.",
  },
  {
    id: "create",
    view: "tasks",
    target: "guide-add-task",
    fallback: "guide-capture",
    gesture: "point",
    hold: null,
    talk: true,
    text: "Let's create your first task.",
  },
  {
    id: "automation",
    view: "tasks",
    target: "guide-automation",
    fallback: "guide-overview",
    gesture: "hold-card",
    hold: "task",
    talk: true,
    text: "Autopilot lines up leftover work first, then shows one next action. Finish it, snooze it, or move leftovers into today.",
  },
  {
    id: "notifications",
    view: "tasks",
    target: "guide-notifications",
    fallback: "guide-overview",
    gesture: "point",
    hold: "bell",
    talk: true,
    text: "I'll keep you informed when important tasks need your attention.",
  },
  {
    id: "calendar",
    view: "plan",
    target: "guide-calendar",
    fallback: null,
    gesture: "hold-card",
    hold: "calendar",
    talk: true,
    text: "The calendar gives you a clear view of your schedule and upcoming tasks.",
  },
  {
    id: "productivity",
    view: "tasks",
    target: "guide-productivity",
    fallback: "guide-overview",
    gesture: "show",
    hold: "chart",
    talk: true,
    text: "You can also track your productivity and progress over time.",
  },
  {
    id: "done",
    view: "tasks",
    target: null,
    gesture: "celebrate",
    hold: null,
    talk: true,
    text: "You're all set! I'll be here whenever you need me.",
    primary: "Get started",
  },
];

export function isVisibleTarget(el) {
  if (!el || typeof window === "undefined") return false;
  const style = window.getComputedStyle(el);
  if (style.display === "none" || style.visibility === "hidden" || Number(style.opacity) === 0) return false;
  const rect = el.getBoundingClientRect();
  return rect.width >= 2 && rect.height >= 2;
}

export function findGuideTarget(id) {
  if (!id || typeof document === "undefined") return null;
  const nodes = document.querySelectorAll(`[data-guide="${id}"]`);
  return [...nodes].find(isVisibleTarget) || null;
}

export function prefersReducedMotion() {
  return typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

export function tourCharSize(viewportWidth = 1280) {
  if (viewportWidth < 480) return { w: 52, h: 80 };
  if (viewportWidth < 992) return { w: 58, h: 90 };
  return { w: 66, h: 102 };
}

export function tourBubbleSize(viewportWidth = 1280) {
  const w = Math.min(300, Math.max(200, viewportWidth - 24));
  return { w, h: 148 };
}

export function viewportSafeInsets(viewportWidth = 1280) {
  const mobile = viewportWidth < 992;
  return {
    top: 12,
    right: 12,
    left: 12,
    bottom: mobile ? 96 : 16,
  };
}
