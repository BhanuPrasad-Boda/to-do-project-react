import { CHAR } from "./characterStates";
import { TOUR_STEPS } from "./guideTour";
import { buildTourBeats, holdForPose, lookStateFromFace, talkingForPose } from "./tourChoreography";

test("welcome arrives with a wave, then talks", () => {
  const beats = buildTourBeats(TOUR_STEPS[0]);
  expect(beats.map((beat) => beat.state)).toEqual([CHAR.IDLE, CHAR.WAVE, CHAR.TALK]);
});

test("dashboard looks at the target before pointing", () => {
  const beats = buildTourBeats(TOUR_STEPS[1], { face: "left", pointGesture: "point-left" });
  expect(beats[0].state).toBe(CHAR.LOOK_LEFT);
  expect(beats[1].state).toBe(CHAR.POINT_LEFT);
  expect(beats[2].state).toBe(CHAR.TALK);
});

test("automation thinks, then holds and shows a task card", () => {
  const beats = buildTourBeats(TOUR_STEPS.find((step) => step.id === "automation"));
  expect(beats.map((beat) => beat.state)).toEqual([CHAR.THINK, CHAR.HOLD_OBJECT, CHAR.SHOW_OBJECT]);
  expect(holdForPose("task", CHAR.THINK)).toBeNull();
  expect(holdForPose("task", CHAR.HOLD_OBJECT)).toBe("task");
  expect(holdForPose("task", CHAR.TALK)).toBe("task");
  expect(talkingForPose({ talk: true }, CHAR.THINK, false)).toBe(false);
  expect(talkingForPose({ talk: true }, CHAR.SHOW_OBJECT, false)).toBe(true);
});

test("look direction follows the target, not a mirrored sprite", () => {
  expect(lookStateFromFace("up")).toBe(CHAR.LOOK_UP);
  expect(lookStateFromFace("right")).toBe(CHAR.LOOK_RIGHT);
});
