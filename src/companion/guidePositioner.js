function clamp(value, min, max) {
  if (max < min) return min;
  return Math.min(Math.max(value, min), max);
}

export function placeGuide({
  targetRect = null,
  viewport = { width: 1280, height: 800 },
  char = { w: 64, h: 88 },
  bubble = { w: 280, h: 148 },
  gap = 10,
  safe = { top: 12, right: 12, bottom: 16, left: 12 },
} = {}) {
  const vw = viewport.width;
  const vh = viewport.height;
  const maxCharLeft = vw - char.w - safe.right;
  const maxCharTop = vh - char.h - safe.bottom;
  const clampChar = (left, top) => ({
    left: clamp(left, safe.left, Math.max(safe.left, maxCharLeft)),
    top: clamp(top, safe.top, Math.max(safe.top, maxCharTop)),
  });

  if (!targetRect) {
    const mobile = vw < 992;
    const home = clampChar(mobile ? safe.left : maxCharLeft, maxCharTop);
    const bubbleWidth = Math.min(bubble.w, vw - safe.left - safe.right);
    const bubbleBox = {
      left: clamp(mobile ? home.left + char.w + 8 : home.left - 8 - bubbleWidth, safe.left, vw - bubbleWidth - safe.right),
      top: clamp(home.top - 24, safe.top, vh - 140 - safe.bottom),
      width: bubbleWidth,
    };
    return {
      char: home,
      bubble: bubbleBox,
      bubbleSide: mobile ? "right" : "left",
      face: mobile ? "right" : "left",
      gesture: "idle",
      highlight: null,
    };
  }

  const t = targetRect;
  const spaceRight = vw - t.right - safe.right;
  const spaceLeft = t.left - safe.left;
  const spaceBelow = vh - t.bottom - safe.bottom;
  const spaceAbove = t.top - safe.top;
  const needW = char.w + gap;
  const needH = char.h + gap;

  let left;
  let top;
  let face = "left";
  let bubbleSide = "left";
  let gesture = "point-left";

  if (spaceRight >= needW) {
    left = t.right + gap;
    top = t.top + t.height / 2 - char.h / 2;
    face = "left";
    bubbleSide = spaceLeft >= bubble.w ? "left" : "top";
    gesture = "point-left";
  } else if (spaceLeft >= needW) {
    left = t.left - gap - char.w;
    top = t.top + t.height / 2 - char.h / 2;
    face = "right";
    bubbleSide = spaceRight >= bubble.w ? "right" : "top";
    gesture = "point-right";
  } else if (spaceBelow >= needH) {
    left = t.left + t.width / 2 - char.w / 2;
    top = t.bottom + gap;
    face = "up";
    bubbleSide = "top";
    gesture = "point-up";
  } else if (spaceAbove >= needH) {
    left = t.left - gap - char.w;
    if (left < safe.left) left = t.right + gap;
    top = t.top - gap - char.h;
    face = "down";
    bubbleSide = "bottom";
    gesture = "point-down";
  } else {
    left = t.right + gap;
    top = t.bottom + gap;
    face = "left";
    bubbleSide = "top";
    gesture = "point-up";
  }

  const charPos = clampChar(left, top);

  if (bubbleSide === "left" && charPos.left < bubble.w + safe.left) bubbleSide = "top";
  if (bubbleSide === "right" && vw - (charPos.left + char.w) < bubble.w + safe.right) bubbleSide = "top";
  if (bubbleSide === "top" && charPos.top < 96 + safe.top) bubbleSide = "bottom";
  if (bubbleSide === "bottom" && vh - (charPos.top + char.h) < 96 + safe.bottom) {
    bubbleSide = charPos.left > vw / 2 ? "left" : "right";
  }

  const bubbleWidth = Math.min(bubble.w, vw - safe.left - safe.right);
  const bubbleHeight = Math.min(bubble.h, Math.max(120, vh * 0.36));
  let bubbleLeft = charPos.left;
  let bubbleTop = charPos.top;
  if (bubbleSide === "left") {
    bubbleLeft = charPos.left - 8 - bubbleWidth;
    bubbleTop = charPos.top;
  } else if (bubbleSide === "right") {
    bubbleLeft = charPos.left + char.w + 8;
    bubbleTop = charPos.top;
  } else if (bubbleSide === "bottom") {
    bubbleLeft = charPos.left + char.w / 2 - bubbleWidth / 2;
    bubbleTop = charPos.top + char.h + 8;
  } else {
    bubbleLeft = charPos.left + char.w / 2 - bubbleWidth / 2;
    bubbleTop = charPos.top - 8 - bubbleHeight;
  }
  const bubbleBox = {
    left: clamp(bubbleLeft, safe.left, Math.max(safe.left, vw - bubbleWidth - safe.right)),
    top: clamp(bubbleTop, safe.top, Math.max(safe.top, vh - Math.min(bubbleHeight, 140) - safe.bottom)),
    width: bubbleWidth,
  };

  const highlight = {
    left: Math.max(8, t.left - 6),
    top: Math.max(8, t.top - 6),
    width: Math.min(vw - 16, Math.max(24, t.width + 12)),
    height: Math.min(vh - 16, Math.max(24, t.height + 12)),
  };

  return {
    char: charPos,
    bubble: bubbleBox,
    bubbleSide,
    face,
    gesture,
    highlight,
  };
}
