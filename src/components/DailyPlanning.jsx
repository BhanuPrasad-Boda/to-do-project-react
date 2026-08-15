import React from "react";
import { TaskCalendar } from "./TaskCalendar";

export function DailyPlanning({ plan, tasks = [], onClose, onApply, onToggleComplete }) {
  const hour = new Date().getHours();
  const hello = hour < 12 ? "Good morning" : hour < 18 ? "Good afternoon" : "Good evening";
  const canApply = Boolean(onApply && plan?.suggestedSchedule?.length);

  return (
    <div className="d-flex flex-column gap-3">
      <div className="saas-card">
        <div className="d-flex justify-content-between align-items-start gap-3 flex-wrap">
          <div>
            <div className="page-kicker">Today</div>
            <h2 className="dash-heading">{hello}</h2>
            <p className="saas-subtitle mb-0 mt-1">
              {plan
                ? `${plan.totalToday} task${plan.totalToday === 1 ? "" : "s"} scheduled${plan.overdueCount ? ` · ${plan.overdueCount} overdue` : ""}`
                : "Your month of to-dos"}
            </p>
          </div>
          <div className="d-flex align-items-center gap-2">
            {canApply ? (
              <button type="button" className="btn-new-task border-0" onClick={onApply}>
                Use this schedule
              </button>
            ) : null}
            {onClose && (
              <button type="button" className="icon-btn" onClick={onClose} aria-label="Dismiss plan">×</button>
            )}
          </div>
        </div>
      </div>

      {plan?.highPriority?.length > 0 && (
        <div className="saas-card">
          <h3 className="section-label">High priority</h3>
          <ol className="mb-0 ps-3">
            {plan.highPriority.map((item) => (
              <li key={item.Appointment_Id} className="py-2">{item.Title}</li>
            ))}
          </ol>
        </div>
      )}

      {plan?.suggestedSchedule?.length > 0 && (
        <div className="saas-card">
          <h3 className="section-label">Suggested schedule</h3>
          <p className="saas-subtitle mb-2">Times are suggestions. Use this schedule to apply them to your tasks.</p>
          {plan.suggestedSchedule.map((item) => (
            <div key={item.Appointment_Id} className="plan-item">
              <span className="plan-time">
                {new Date(item.suggestedAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
              </span>
              <span className="fw-semibold">{item.Title}</span>
            </div>
          ))}
        </div>
      )}

      <div className="saas-card" data-guide="guide-calendar">
        <TaskCalendar tasks={tasks} onToggleComplete={onToggleComplete} />
      </div>
    </div>
  );
}
