export function GuideHighlight({ rect, ready = false }) {
  if (!rect) return null;
  return (
    <div
      className={`guide-highlight${ready ? " is-ready" : ""}`}
      style={{
        left: rect.left,
        top: rect.top,
        width: rect.width,
        height: rect.height,
      }}
      aria-hidden="true"
    />
  );
}
