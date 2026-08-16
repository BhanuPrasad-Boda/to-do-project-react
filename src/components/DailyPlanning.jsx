import React from "react";
import { TaskCalendar } from "./TaskCalendar";

function startOfToday() {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
}

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

export function DailyPlanning({
  plan,
  tasks = [],
  onClose,
  onApply,
  onCatchUp,
  onToggleComplete,
  busy,
}) {
  const hour = new Date().getHours();
  const hello = hour < 12 ? "Good morning" : hour < 18 ? "Good afternoon" : "Good evening";
  const todayStart = startOfToday();
  const leftovers = (tasks || []).filter(
    (task) =>
      !task.completed &&
      task.status !== "cancelled" &&
      task.Date &&
      new Date(task.Date) < todayStart &&
      !(task.snoozedUntil && new Date(task.snoozedUntil) > Date.now())
  );
  const undated = (tasks || []).filter(
    (task) =>
      !task.completed &&
      task.status !== "cancelled" &&
      !task.Date &&
      !(task.snoozedUntil && new Date(task.snoozedUntil) > Date.now())
  );
  const openCount = plan?.totalToday ?? 0;
  const overdueCount = leftovers.length;
  const highCount = plan?.highPriority?.length ?? 0;
  const doneCount = tasks.filter((task) => {
    if (!task.completed || !task.Date) return false;
    const due = new Date(task.Date);
    const now = new Date();
    return due.toDateString() === now.toDateString();
  }).length;
  const timeline = (plan?.suggestedSchedule || []).slice().sort((a, b) => {
    return new Date(a.suggestedAt || a.Date || 0) - new Date(b.suggestedAt || b.Date || 0);
  });

  return (
    <div className="d-flex flex-column gap-3">
      <div className="saas-card">
        <div className="d-flex justify-content-between align-items-start gap-3 flex-wrap">
          <div>
            <div className="page-kicker">Today</div>
            <h2 className="dash-heading">{hello}</h2>
            <p className="saas-subtitle mb-0 mt-1">
              Leftovers first, then today’s timeline. Untimed work can be placed into open slots.
            </p>
            <div className="plan-stats" aria-label="Plan status counts">
              <span className="plan-stat is-open">{openCount} today</span>
              <span className="plan-stat is-high">{highCount} high</span>
              <span className="plan-stat is-overdue">{overdueCount} leftover</span>
              <span className="plan-stat is-done">{doneCount} done</span>
            </div>
          </div>
          <div className="d-flex align-items-center gap-2 flex-wrap">
            {leftovers.length > 0 && onCatchUp ? (
              <button type="button" className="btn-new-task border-0" onClick={onCatchUp} disabled={busy}>
                {busy ? "Lining up…" : "Line up leftovers"}
              </button>
            ) : null}
            {undated.length > 0 && onApply ? (
              <button type="button" className="btn-quiet-block" onClick={onApply} disabled={busy}>
                Schedule {undated.length} untimed
              </button>
            ) : null}
            {onClose && (
              <button type="button" className="icon-btn" onClick={onClose} aria-label="Dismiss plan">×</button>
            )}
          </div>
        </div>
      </div>

      {leftovers.length > 0 && (
        <div className="saas-card">
          <h3 className="section-label">Leftovers from earlier days</h3>
          <p className="saas-subtitle mb-2">These stay here until you line them up or finish them.</p>
          {leftovers.slice(0, 8).map((task) => {
            const tone = planTone(task, task);
            const meta = toneMeta(tone);
            return (
              <div key={task.Appointment_Id} className={`plan-item is-${tone}`}>
                <span className="plan-time">{formatPlanTime(task.Date)}</span>
                <span className="plan-item-main">
                  <span className="fw-semibold">{task.Title}</span>
                  <span className={meta.chip}>{meta.label}</span>
                </span>
              </div>
            );
          })}
        </div>
      )}

      {timeline.length > 0 && (
        <div className="saas-card">
          <h3 className="section-label">Today’s timeline</h3>
          <p className="saas-subtitle mb-2">Existing times stay put. Autopilot does not overwrite them.</p>
          {timeline.map((item) => {
            const task = findTask(tasks, item.Appointment_Id);
            const tone = planTone(task, item);
            const meta = toneMeta(tone);
            return (
              <div key={item.Appointment_Id} className={`plan-item is-${tone}`}>
                <span className="plan-time">{formatPlanTime(item.suggestedAt || task?.Date)}</span>
                <span className="plan-item-main">
                  <span className="fw-semibold">{item.Title}</span>
                  <span className={meta.chip}>{meta.label}</span>
                </span>
              </div>
            );
          })}
        </div>
      )}

      {undated.length > 0 && (
        <div className="saas-card">
          <h3 className="section-label">Untimed</h3>
          <p className="saas-subtitle mb-2">No clock time yet. Schedule them into today’s open slots when you’re ready.</p>
          {undated.slice(0, 8).map((task) => (
            <div key={task.Appointment_Id} className="plan-item is-open">
              <span className="plan-time">—</span>
              <span className="plan-item-main">
                <span className="fw-semibold">{task.Title}</span>
                <span className="chip">{task.Priority || "Medium"}</span>
              </span>
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
