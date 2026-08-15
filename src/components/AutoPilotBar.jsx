import React from "react";

export function AutoPilotBar({ assistant, onComplete, onSnooze, onCatchUp }) {
  if (!assistant) return null;

  const next = assistant.nextTask;
  const overdue = assistant.overdueCount || 0;

  return (
    <section className="autopilot-card" data-guide="guide-automation">
      <div className="autopilot-kicker">
        <i className="bi bi-lightning-charge-fill" aria-hidden="true" />
        Autopilot
      </div>
      <div className="autopilot-body">
        <div className="autopilot-copy">
          <h3>{assistant.headline}</h3>
          <p>{assistant.detail}</p>
        </div>
        <div className="autopilot-actions">
          {next ? (
            <button type="button" className="btn-new-task border-0" onClick={() => onComplete(next.Appointment_Id)}>
              Mark done
            </button>
          ) : null}
          {next ? (
            <button type="button" className="btn-quiet-block" onClick={() => onSnooze(next.Appointment_Id)}>
              Snooze 1h
            </button>
          ) : null}
          {overdue > 0 ? (
            <button type="button" className="btn-quiet-block" onClick={onCatchUp}>
              Catch up {overdue}
            </button>
          ) : null}
        </div>
      </div>
    </section>
  );
}
