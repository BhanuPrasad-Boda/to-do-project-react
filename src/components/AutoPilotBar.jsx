import React from "react";

function formatWhen(value) {
  if (!value) return "the next open slot";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "the next open slot";
  const sameDay = date.toDateString() === new Date().toDateString();
  return sameDay
    ? date.toLocaleString([], { hour: "numeric", minute: "2-digit" })
    : date.toLocaleString([], { weekday: "short", hour: "numeric", minute: "2-digit" });
}

function phaseLabel(phase) {
  if (phase === "lineup") return "Leftovers";
  if (phase === "focus") return "Next";
  return "Clear";
}

export function AutoPilotBar({
  assistant,
  busy,
  onComplete,
  onSnooze,
  onCatchUp,
  onReschedule,
  onReview,
}) {
  if (!assistant) return null;

  const leftover = assistant.leftoverCount || 0;
  const next = assistant.nextTask;
  const phase = assistant.phase || (leftover > 0 ? "lineup" : next ? "focus" : "clear");
  const titles = assistant.leftoverTitles || [];
  const extra = Math.max(0, leftover - titles.length);
  const overdueNow = Boolean(next?.Date && new Date(next.Date) < new Date());
  const slot = formatWhen(assistant.catchUpAt);

  return (
    <section className={`autopilot-card is-${phase}`} data-guide="guide-automation" aria-busy={busy || undefined}>
      <div className="autopilot-kicker">
        <i className="bi bi-lightning-charge-fill" aria-hidden="true" />
        Autopilot
        <span className="autopilot-phase">{phaseLabel(phase)}</span>
      </div>

      {phase === "lineup" ? (
        <div className="autopilot-body">
          <div className="autopilot-copy">
            <h3>{assistant.headline}</h3>
            <p>Line these into {slot}, then Autopilot will show one next action.</p>
            {titles.length ? (
              <ul className="autopilot-list">
                {titles.map((title, index) => (
                  <li key={`${title}-${index}`}>{title}</li>
                ))}
                {extra > 0 ? <li>+{extra} more</li> : null}
              </ul>
            ) : null}
          </div>
          <div className="autopilot-actions">
            <button type="button" className="btn-new-task border-0" onClick={onCatchUp} disabled={busy}>
              {busy ? "Lining up…" : `Line up for ${slot}`}
            </button>
            {next ? (
              <button
                type="button"
                className="btn-quiet-block"
                onClick={() => onComplete(next.Appointment_Id)}
                disabled={busy}
              >
                Do this first
              </button>
            ) : null}
            <button type="button" className="btn-quiet-block" onClick={onReview} disabled={busy}>
              Review
            </button>
          </div>
        </div>
      ) : null}

      {phase === "focus" && next ? (
        <div className="autopilot-body">
          <div className="autopilot-copy">
            <h3>{next.Title}</h3>
            <p>
              {next.Date
                ? overdueNow
                  ? `Was due ${formatWhen(next.Date)}. Finish it, snooze it, or pick a new time.`
                  : `Due ${formatWhen(next.Date)}.`
                : "No due date — a good candidate to do now."}
            </p>
          </div>
          <div className="autopilot-actions">
            <button
              type="button"
              className="btn-new-task border-0"
              onClick={() => onComplete(next.Appointment_Id)}
              disabled={busy}
            >
              Mark done
            </button>
            <button type="button" className="btn-quiet-block" onClick={() => onSnooze(next.Appointment_Id)} disabled={busy}>
              Later · 1h
            </button>
            {overdueNow ? (
              <button type="button" className="btn-quiet-block" onClick={() => onReschedule(next)} disabled={busy}>
                Reschedule
              </button>
            ) : null}
          </div>
        </div>
      ) : null}

      {phase === "clear" ? (
        <div className="autopilot-body">
          <div className="autopilot-copy">
            <h3>{assistant.snoozedCount ? assistant.headline : "You're clear"}</h3>
            <p>
              {assistant.snoozedCount
                ? `Paused until ${formatWhen(assistant.snoozeUntil)}. The task stays on your list and Autopilot will show it again after that.`
                : "Autopilot will line up leftovers in the morning and keep reminders on time."}
            </p>
          </div>
        </div>
      ) : null}
    </section>
  );
}
