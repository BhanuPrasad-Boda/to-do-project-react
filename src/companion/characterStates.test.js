import {
  CHAR,
  gestureToState,
  resolveCharacterState,
  shouldWalk,
  walkDirection,
} from "./characterStates";

test("maps tour gestures to animation states", () => {
  expect(gestureToState("wave")).toBe(CHAR.WAVE);
  expect(gestureToState("point-left")).toBe(CHAR.POINT_LEFT);
  expect(gestureToState("point-right")).toBe(CHAR.POINT_RIGHT);
  expect(gestureToState("hold-card", "task")).toBe(CHAR.HOLD_OBJECT);
  expect(gestureToState("show", "chart")).toBe(CHAR.SHOW_OBJECT);
  expect(gestureToState("celebrate")).toBe(CHAR.CELEBRATE);
});

test("walk wins over pointing while the character is traveling", () => {
  expect(
    resolveCharacterState({
      touring: true,
      walking: true,
      gesture: "point-right",
      hold: "task",
    })
  ).toBe(CHAR.WALK);
});

test("assistant mode uses listen, think, and talk", () => {
  expect(resolveCharacterState({ thinking: true })).toBe(CHAR.THINK);
  expect(resolveCharacterState({ listening: true })).toBe(CHAR.LISTEN);
  expect(resolveCharacterState({ talking: true })).toBe(CHAR.TALK);
  expect(resolveCharacterState({ mood: "celebrating" })).toBe(CHAR.CELEBRATE);
  expect(resolveCharacterState({ mood: "warning" })).toBe(CHAR.CONCERNED);
});

test("walk direction follows travel, not a static slide", () => {
  expect(shouldWalk(40, 0)).toBe(true);
  expect(shouldWalk(2, 1)).toBe(false);
  expect(walkDirection(30, 4)).toBe("right");
  expect(walkDirection(-30, 2)).toBe("left");
});

test("an explicit pose overrides mood and gesture", () => {
  expect(
    resolveCharacterState({
      touring: true,
      gesture: "wave",
      talking: true,
      pose: CHAR.POINT_LEFT,
    })
  ).toBe(CHAR.POINT_LEFT);
});
