import React from "react";
import { Link } from "react-router-dom";

function dueLabel(dateString, formatDateTime) {
  if (!dateString) return "No due date";
  const d = new Date(dateString);
  if (isNaN(d.getTime())) return "Invalid date";
  const now = new Date();
  const startToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const startDue = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  const diffDays = Math.round((startDue - startToday) / 86400000);
  const time = d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  if (diffDays === 0) return `Today · ${time}`;
  if (diffDays === 1) return `Tomorrow · ${time}`;
  if (diffDays === -1) return `Yesterday · ${time}`;
  if (diffDays < 0) return `${Math.abs(diffDays)}d overdue`;
  if (diffDays < 7) return `${d.toLocaleDateString(undefined, { weekday: "short" })} · ${time}`;
  return formatDateTime(dateString);
}

export function TaskCard({ task, onToggleComplete, onDelete, formatDateTime, onOverdue }) {
  const overdue = !task.completed && task.Date && new Date(task.Date) < new Date();
  const statusLabel = overdue ? "Overdue" : task.completed ? "Done" : "Open";
  const statusChip = overdue ? "chip danger" : task.completed ? "chip success" : "chip";
  const priorityChip = task.Priority === "High" ? "chip warn" : "chip";

  return (
    <article
      className={`task-row ${task.completed ? "is-done" : ""} ${overdue ? "is-overdue" : ""} priority-${task.Priority || "Medium"}`}
    >
      <button
        type="button"
        className={`task-check ${task.completed ? "is-on" : ""}`}
        onClick={() => onToggleComplete(task.Appointment_Id)}
        aria-label={task.completed ? "Mark as pending" : "Mark as done"}
      >
        {task.completed && <i className="bi bi-check" />}
      </button>

      <div className="task-body">
        <h3 className="task-title-text">{task.Title}</h3>
        {task.Description && <p className="task-desc">{task.Description}</p>}
        <div className="task-meta">
          <span className={statusChip}>{statusLabel}</span>
          {task.Priority && <span className={priorityChip}>{task.Priority}</span>}
          {task.category && <span className="chip">{task.category}</span>}
          {task.recurrence && task.recurrence !== "none" && <span className="chip">{task.recurrence}</span>}
          {(task.tags || []).slice(0, 2).map((tag) => (
            <span key={tag} className="chip">{tag}</span>
          ))}
          <span className={`chip ${overdue ? "danger" : ""}`}>
            <i className="bi bi-calendar-event" /> {dueLabel(task.Date, formatDateTime)}
          </span>
        </div>
        {overdue && !task.completed && (
          <button type="button" className="quiet-link mt-2 p-0" onClick={() => onOverdue?.(task)}>
            Reschedule
          </button>
        )}
      </div>

      <div className="task-actions">
        <Link to={`/edit-appointment/${task.Appointment_Id}`} className="ghost-btn" aria-label="Edit task">
          <i className="bi bi-pencil" />
        </Link>
        <button type="button" className="ghost-btn danger" onClick={() => onDelete(task.Appointment_Id)} aria-label="Delete task">
          <i className="bi bi-trash" />
        </button>
      </div>
    </article>
  );
}

