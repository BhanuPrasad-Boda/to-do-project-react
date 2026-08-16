import React from "react";
import { TaskCalendar } from "./TaskCalendar";

function findTask(tasks, id) {
  return (tasks || []).find((task) => Number(task.Appointment_Id) === Number(id));
}

function planTone(task, item) {
  const source = task || item || {};
  if (source.completed) return "done";
  if (!source.completed && source.Date && new Date(source.Date) < new Date()) return "overdue";
  if ((source.Priority || item?.Priority) === "High") return "high";
  return "open";
}

function formatPlanTime(value) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

function toneMeta(tone) {
  if (tone === "done") return { label: "Done", chip: "chip success" };
  if (tone === "overdue") return { label: "Overdue", chip: "chip danger" };
  if (tone === "high") return { label: "High", chip: "chip warn" };
  return { label: "Open", chip: "chip info" };
}

export function DailyPlanning({ plan, tasks = [], onClose, onApply, onToggleComplete }) {
  const hour = new Date().getHours();
  const hello = hour < 12 ? "Good morning" : hour < 18 ? "Good afternoon" : "Good evening";
  const canApply = Boolean(onApply && plan?.suggestedSchedule?.length);
  const openCount = plan?.totalToday ?? 0;
  const overdueCount = plan?.overdueCount ?? 0;
  const highCount = plan?.highPriority?.length ?? 0;
  const doneCount = tasks.filter((task) => {
    if (!task.completed || !task.Date) return false;
    const due = new Date(task.Date);
    const now = new Date();
    return due.toDateString() === now.toDateString();
  }).length;

  return (
    <div className="d-flex flex-column gap-3">
      <div className="saas-card">
        <div className="d-flex justify-content-between align-items-start gap-3 flex-wrap">
          <div>
            <div className="page-kicker">Today</div>
            <h2 className="dash-heading">{hello}</h2>
            <p className="saas-subtitle mb-0 mt-1">
              {plan ? "Your schedule for today, grouped by status." : "Your month of to-dos"}
            </p>
            {plan ? (
              <div className="plan-stats" aria-label="Plan status counts">
                <span className="plan-stat is-open">{openCount} open</span>
                <span className="plan-stat is-high">{highCount} high</span>
                <span className="plan-stat is-overdue">{overdueCount} overdue</span>
                <span className="plan-stat is-done">{doneCount} done</span>
              </div>
            ) : null}
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
          {plan.highPriority.map((item) => {
            const task = findTask(tasks, item.Appointment_Id);
            const tone = planTone(task, { ...item, Priority: "High" });
            const meta = toneMeta(tone);
            return (
              <div key={item.Appointment_Id} className={`plan-item is-${tone}`}>
                <span className="plan-time">High</span>
                <span className="plan-item-main">
                  <span className="fw-semibold">{item.Title}</span>
                  <span className={meta.chip}>{meta.label}</span>
                </span>
              </div>
            );
          })}
        </div>
      )}

      {plan?.suggestedSchedule?.length > 0 && (
        <div className="saas-card">
          <h3 className="section-label">Suggested schedule</h3>
          <p className="saas-subtitle mb-2">Times are suggestions. Use this schedule to apply them to your tasks.</p>
          {plan.suggestedSchedule.map((item) => {
            const task = findTask(tasks, item.Appointment_Id);
            const tone = planTone(task, item);
            const meta = toneMeta(tone);
            return (
              <div key={item.Appointment_Id} className={`plan-item is-${tone}`}>
                <span className="plan-time">
                  {formatPlanTime(item.suggestedAt)}
                </span>
                <span className="plan-item-main">
                  <span className="fw-semibold">{item.Title}</span>
                  <span className={meta.chip}>{meta.label}</span>
                </span>
              </div>
            );
          })}
        </div>
      )}

      <div className="saas-card" data-guide="guide-calendar">
        <TaskCalendar tasks={tasks} onToggleComplete={onToggleComplete} />
      </div>
    </div>
  );
}
