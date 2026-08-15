import { placeGuide } from "./guidePositioner";
import { TOUR_STEPS } from "./guideTour";

test("tour has a start, feature walkthrough, and finish", () => {
  expect(TOUR_STEPS[0].id).toBe("welcome");
  expect(TOUR_STEPS.some((step) => step.target === "guide-add-task")).toBe(true);
  expect(TOUR_STEPS.some((step) => step.view === "plan")).toBe(true);
  expect(TOUR_STEPS[TOUR_STEPS.length - 1].id).toBe("done");
});

test("places the guide to the right of a target when space exists", () => {
  const result = placeGuide({
    targetRect: { left: 80, top: 120, right: 240, width: 160, height: 80, bottom: 200 },
    viewport: { width: 1280, height: 800 },
    char: { w: 64, h: 88 },
    bubble: { w: 280, h: 148 },
    safe: { top: 12, right: 12, bottom: 16, left: 12 },
  });
  expect(result.char.left).toBeGreaterThanOrEqual(240);
  expect(result.char.left + 64).toBeLessThanOrEqual(1280);
  expect(result.highlight.width).toBeGreaterThan(0);
  expect(result.bubble.left).toBeGreaterThanOrEqual(12);
  expect(result.bubble.left + result.bubble.width).toBeLessThanOrEqual(1280);
});

test("keeps the character inside a 320px viewport", () => {
  const result = placeGuide({
    targetRect: { left: 8, top: 400, right: 312, width: 304, height: 120, bottom: 520 },
    viewport: { width: 320, height: 640 },
    char: { w: 44, h: 62 },
    bubble: { w: 240, h: 148 },
    safe: { top: 12, right: 12, bottom: 96, left: 12 },
  });
  expect(result.char.left).toBeGreaterThanOrEqual(12);
  expect(result.char.left + 44).toBeLessThanOrEqual(320);
  expect(result.char.top + 62).toBeLessThanOrEqual(640 - 96 + 1);
  expect(result.bubble.left).toBeGreaterThanOrEqual(12);
  expect(result.bubble.left + result.bubble.width).toBeLessThanOrEqual(308);
});
