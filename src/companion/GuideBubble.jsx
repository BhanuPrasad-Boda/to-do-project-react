export function GuideBubble({
  step,
  index,
  total,
  busy = false,
  onNext,
  onBack,
  onSkip,
  onClose,
}) {
  if (!step) return null;
  const last = index === total - 1;
  const first = index === 0;

  return (
    <div className="guide-bubble" role="dialog" aria-labelledby="guide-bubble-title" aria-busy={busy}>
      <div className="guide-bubble-kicker">
        <span>Guide</span>
        <span>
          {index + 1}/{total}
        </span>
        <button type="button" className="companion-close" onClick={onClose} aria-label="Close tour">
          ×
        </button>
      </div>
      <p key={step.id || index} id="guide-bubble-title" className="companion-copy guide-bubble-copy">
        {step.text}
      </p>
      <div className="companion-actions">
        {first ? (
          <button type="button" className="companion-chip is-quiet" onClick={onSkip} disabled={busy}>
            Skip tour
          </button>
        ) : (
          <button type="button" className="companion-chip is-quiet" onClick={onBack} disabled={busy}>
            Back
          </button>
        )}
        <button type="button" className="companion-chip is-primary" onClick={onNext} disabled={busy}>
          {step.primary || (last ? "Get started" : "Next")}
        </button>
      </div>
    </div>
  );
}
