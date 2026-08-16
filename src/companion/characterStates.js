export const CHAR = {
  IDLE: "idle",
  WALK: "walk",
  WAVE: "wave",
  TALK: "talk",
  LISTEN: "listen",
  POINT_LEFT: "point-left",
  POINT_RIGHT: "point-right",
  POINT_UP: "point-up",
  POINT_DOWN: "point-down",
  LOOK_LEFT: "look-left",
  LOOK_RIGHT: "look-right",
  LOOK_UP: "look-up",
  LOOK_DOWN: "look-down",
  THINK: "think",
  HOLD_OBJECT: "hold",
  SHOW_OBJECT: "show",
  CELEBRATE: "celebrate",
  SUCCESS: "success",
  CONCERNED: "concerned",
  SURPRISED: "surprised",
  GOODBYE: "goodbye",
};

const GESTURE_MAP = {
  idle: CHAR.IDLE,
  wave: CHAR.WAVE,
  welcome: CHAR.WAVE,
  talk: CHAR.TALK,
  listen: CHAR.LISTEN,
  think: CHAR.THINK,
  thinking: CHAR.THINK,
  point: CHAR.POINT_RIGHT,
  "point-left": CHAR.POINT_LEFT,
  "point-right": CHAR.POINT_RIGHT,
  "point-up": CHAR.POINT_UP,
  "point-down": CHAR.POINT_DOWN,
  "hold-card": CHAR.HOLD_OBJECT,
  hold: CHAR.HOLD_OBJECT,
  show: CHAR.SHOW_OBJECT,
  celebrate: CHAR.CELEBRATE,
  celebrating: CHAR.CELEBRATE,
  happy: CHAR.SUCCESS,
  success: CHAR.SUCCESS,
  warning: CHAR.CONCERNED,
  reminder: CHAR.CONCERNED,
  concerned: CHAR.CONCERNED,
  surprised: CHAR.SURPRISED,
  goodbye: CHAR.GOODBYE,
  helping: CHAR.TALK,
  quiet: CHAR.IDLE,
  speaking: CHAR.TALK,
  listening: CHAR.LISTEN,
  working: CHAR.HOLD_OBJECT,
  guiding: CHAR.TALK,
  asking_confirmation: CHAR.SURPRISED,
  error: CHAR.CONCERNED,
};

export function gestureToState(gesture, hold) {
  if (hold && (gesture === "hold-card" || gesture === "hold" || !gesture)) return CHAR.HOLD_OBJECT;
  return GESTURE_MAP[gesture] || CHAR.IDLE;
}

export function moodToState(mood, extras = {}) {
  if (extras.walking) return CHAR.WALK;
  if (extras.burst) return GESTURE_MAP[extras.burst] || extras.burst;
  if (extras.thinking) return CHAR.THINK;
  if (extras.listening) return CHAR.LISTEN;
  if (extras.talking) return CHAR.TALK;
  return GESTURE_MAP[mood] || CHAR.IDLE;
}

export const EVENT_TO_BURST = {
  completed: CHAR.CELEBRATE,
  created: CHAR.SUCCESS,
  overdue: CHAR.CONCERNED,
  reminder: CHAR.CONCERNED,
  "tour-started": CHAR.WAVE,
  "tour-completed": CHAR.CELEBRATE,
  "assistant-open": CHAR.WAVE,
};

export function resolveCharacterState({
  touring = false,
  walking = false,
  gesture = "idle",
  hold = null,
  mood = "idle",
  thinking = false,
  listening = false,
  talking = false,
  burst = null,
  pose = null,
} = {}) {
  if (walking) return CHAR.WALK;
  if (pose) return pose;
  if (burst) return GESTURE_MAP[burst] || EVENT_TO_BURST[burst] || burst;
  if (touring) return gestureToState(gesture, hold);
  return moodToState(mood, { thinking, listening, talking });
}

export function walkDirection(dx, dy, fallback = "right") {
  if (Math.abs(dx) >= Math.abs(dy)) {
    if (dx < -2) return "left";
    if (dx > 2) return "right";
  } else {
    if (dy < -2) return "up";
    if (dy > 2) return "down";
  }
  return fallback;
}

export function shouldWalk(dx, dy, threshold = 12) {
  return Math.hypot(dx, dy) >= threshold;
}

export const WALK_MS = 1120;
export const TRANSITION_MS = 280;
export const SETTLE_MS = 260;
