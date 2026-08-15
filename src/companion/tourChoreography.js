import { CHAR, gestureToState } from "./characterStates";

export function lookStateFromFace(face) {
  if (face === "left") return CHAR.LOOK_LEFT;
  if (face === "right") return CHAR.LOOK_RIGHT;
  if (face === "up") return CHAR.LOOK_UP;
  if (face === "down") return CHAR.LOOK_DOWN;
  return CHAR.LOOK_RIGHT;
}

export function pointStateFromGesture(gesture) {
  const mapped = gestureToState(gesture);
  if (String(mapped).startsWith("point")) return mapped;
  return CHAR.POINT_RIGHT;
}

export function buildTourBeats(step, { face = "front", pointGesture = null } = {}) {
  if (!step) return [{ state: CHAR.IDLE, ms: 0, persist: true }];
  const look = lookStateFromFace(face);
  const point = pointStateFromGesture(pointGesture || step.gesture);

  switch (step.id) {
    case "welcome":
      return [
        { state: CHAR.IDLE, ms: 420 },
        { state: CHAR.WAVE, ms: 1600 },
        { state: CHAR.TALK, ms: 0, persist: true },
      ];
    case "dashboard":
    case "tasks":
    case "create":
    case "notifications":
      return [
        { state: look, ms: 560 },
        { state: point, ms: 1320 },
        { state: CHAR.TALK, ms: 0, persist: true },
      ];
    case "automation":
      return [
        { state: CHAR.THINK, ms: 820 },
        { state: CHAR.HOLD_OBJECT, ms: 920 },
        { state: CHAR.SHOW_OBJECT, ms: 0, persist: true },
      ];
    case "calendar":
      return [
        { state: look, ms: 480 },
        { state: CHAR.HOLD_OBJECT, ms: 820 },
        { state: CHAR.SHOW_OBJECT, ms: 0, persist: true },
      ];
    case "productivity":
      return [
        { state: CHAR.HOLD_OBJECT, ms: 700 },
        { state: CHAR.SHOW_OBJECT, ms: 0, persist: true },
      ];
    case "done":
      return [
        { state: CHAR.SUCCESS, ms: 480 },
        { state: CHAR.CELEBRATE, ms: 1400 },
        { state: CHAR.WAVE, ms: 0, persist: true },
      ];
    default:
      return [{ state: CHAR.TALK, ms: 0, persist: true }];
  }
}

export function holdForPose(stepHold, pose) {
  if (!stepHold || !pose) return null;
  if (pose === CHAR.WALK || pose === CHAR.THINK || pose === CHAR.WAVE || pose === CHAR.IDLE) return null;
  return stepHold;
}

export function talkingForPose(step, pose, walking) {
  if (walking || !step || step.talk === false) return false;
  if (String(pose).startsWith("look")) return false;
  return pose !== CHAR.THINK && pose !== CHAR.WALK && pose !== CHAR.IDLE;
}
