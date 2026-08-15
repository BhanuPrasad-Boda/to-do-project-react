import React, { useState } from "react";

export function OverduePrompt({ task, suggestions, onComplete, onReschedule, onKeep, onClose }) {
  const [custom, setCustom] = useState("");
  if (!task) return null;

  return (
    <div className="avatar-modal-overlay" role="dialog" aria-modal="true" aria-labelledby="overdue-title">
      <div className="avatar-modal text-start">
        <div className="page-kicker">Overdue</div>
        <h5 id="overdue-title" className="fw-bold mb-1">This task needs a decision</h5>
        <p className="saas-subtitle">{task.Title}</p>
        <div className="d-flex flex-column gap-2 overdue-actions">
          <button type="button" className="btn-new-task border-0 justify-content-center" onClick={() => onComplete(task.Appointment_Id)}>Mark complete</button>
          <button type="button" className="btn-quiet-block" onClick={() => onKeep(task.Appointment_Id)}>Keep for later</button>
        </div>
        <div className="mt-3">
          <div className="small fw-semibold mb-2">Reschedule</div>
          <div className="d-flex flex-wrap gap-2 mb-2">
            {(suggestions || []).map((item) => (
              <button
                key={item.label}
                type="button"
                className="chip-btn"
                onClick={() => onReschedule(task.Appointment_Id, item.date)}
              >
                {item.label}
              </button>
            ))}
          </div>
          <div className="datetime-row mt-1">
            <input
              type="datetime-local"
              className="input-premium"
              value={custom}
              onChange={(e) => setCustom(e.target.value)}
              aria-label="Custom reschedule time"
            />
            <button type="button" className="btn-new-task border-0" disabled={!custom} onClick={() => onReschedule(task.Appointment_Id, custom)}>
              Set
            </button>
          </div>
        </div>
        <button type="button" className="quiet-link mt-3" onClick={onClose}>Close</button>
      </div>
    </div>
  );
}
