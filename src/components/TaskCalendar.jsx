import { useMemo, useState } from "react";
import { Link } from "react-router-dom";

const WEEKDAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

function dateKey(value) {
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return null;
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function startOfDay(value) {
  const d = new Date(value);
  d.setHours(0, 0, 0, 0);
  return d;
}

function isSameDay(a, b) {
  return dateKey(a) === dateKey(b);
}

function buildMonthCells(year, month) {
  const first = new Date(year, month, 1);
  const pad = (first.getDay() + 6) % 7;
  const lastDate = new Date(year, month + 1, 0).getDate();
  const cells = [];
  for (let i = 0; i < pad; i += 1) {
    cells.push({ date: new Date(year, month, 1 - (pad - i)), outside: true });
  }
  for (let day = 1; day <= lastDate; day += 1) {
    cells.push({ date: new Date(year, month, day), outside: false });
  }
  while (cells.length % 7 !== 0) {
    const last = cells[cells.length - 1].date;
    cells.push({
      date: new Date(last.getFullYear(), last.getMonth(), last.getDate() + 1),
      outside: true,
    });
  }
  return cells;
}

function groupByDay(tasks) {
  const map = new Map();
  tasks.forEach((task) => {
    if (task.status === "cancelled" || !task.Date) return;
    const key = dateKey(task.Date);
    if (!key) return;
    const list = map.get(key) || [];
    list.push(task);
    map.set(key, list);
  });
  map.forEach((list) => {
    list.sort((a, b) => {
      if (Boolean(a.completed) !== Boolean(b.completed)) return a.completed ? 1 : -1;
      return new Date(a.Date) - new Date(b.Date);
    });
  });
  return map;
}

export function TaskCalendar({ tasks = [], onToggleComplete }) {
  const today = startOfDay(new Date());
  const [cursor, setCursor] = useState(() => new Date(today.getFullYear(), today.getMonth(), 1));
  const [selectedKey, setSelectedKey] = useState(() => dateKey(today));

  const byDay = useMemo(() => groupByDay(tasks), [tasks]);
  const cells = useMemo(
    () => buildMonthCells(cursor.getFullYear(), cursor.getMonth()),
    [cursor]
  );
  const selectedTasks = byDay.get(selectedKey) || [];
  const selectedDate = selectedKey ? new Date(`${selectedKey}T12:00:00`) : today;
  const undated = tasks.filter((t) => !t.completed && t.status !== "cancelled" && !t.Date);

  const goMonth = (delta) => {
    setCursor((prev) => new Date(prev.getFullYear(), prev.getMonth() + delta, 1));
  };

  const selectDay = (date) => {
    setCursor(new Date(date.getFullYear(), date.getMonth(), 1));
    setSelectedKey(dateKey(date));
  };

  return (
    <div className="task-calendar-wrap">
      <div className="task-calendar-toolbar">
        <h3 className="section-label mb-0">Calendar</h3>
        <div className="task-calendar-nav">
          <button type="button" className="icon-btn" onClick={() => goMonth(-1)} aria-label="Previous month">
            <i className="bi bi-chevron-left" />
          </button>
          <div className="task-calendar-month">
            {cursor.toLocaleDateString(undefined, { month: "long", year: "numeric" })}
          </div>
          <button type="button" className="icon-btn" onClick={() => goMonth(1)} aria-label="Next month">
            <i className="bi bi-chevron-right" />
          </button>
          <button type="button" className="chip-btn" onClick={() => selectDay(today)}>
            Today
          </button>
        </div>
      </div>

      <div className="task-calendar" role="grid" aria-label="Task calendar">
        {WEEKDAYS.map((day) => (
          <div className="cal-weekday" key={day} role="columnheader">{day}</div>
        ))}
        {cells.map((cell) => {
          const key = dateKey(cell.date);
          const dayTasks = byDay.get(key) || [];
          const open = dayTasks.filter((t) => !t.completed);
          const high = open.some((t) => t.Priority === "High");
          const overdue = open.some((t) => new Date(t.Date) < today);
          const selected = key === selectedKey;
          const isToday = isSameDay(cell.date, today);
          const label = `${cell.date.toLocaleDateString(undefined, { month: "long", day: "numeric" })}, ${dayTasks.length} task${dayTasks.length === 1 ? "" : "s"}`;
          return (
            <button
              key={key}
              type="button"
              role="gridcell"
              aria-label={label}
              aria-pressed={selected}
              className={[
                "cal-day",
                cell.outside ? "is-outside" : "",
                isToday ? "is-today" : "",
                selected ? "is-selected" : "",
                open.length ? "has-tasks" : "",
                overdue ? "is-overdue" : "",
              ].filter(Boolean).join(" ")}
              onClick={() => selectDay(cell.date)}
            >
              <span className="cal-num">{cell.date.getDate()}</span>
              {dayTasks.length > 0 && (
                <span className={`cal-count${high ? " is-high" : ""}`}>{dayTasks.length}</span>
              )}
              <div className="cal-previews">
                {open.slice(0, 2).map((task) => (
                  <span
                    key={task.Appointment_Id}
                    className={`cal-preview priority-${task.Priority || "Medium"}`}
                  >
                    {task.Title}
                  </span>
                ))}
              </div>
            </button>
          );
        })}
      </div>

      <div className="cal-legend">
        <span><i className="cal-dot high" /> High</span>
        <span><i className="cal-dot medium" /> Open</span>
        <span><i className="cal-dot overdue" /> Overdue</span>
      </div>

      <div className="cal-agenda">
        <h3 className="section-label">
          {selectedDate.toLocaleDateString(undefined, { weekday: "long", month: "long", day: "numeric" })}
        </h3>
        {selectedTasks.length === 0 ? (
          <p className="saas-subtitle mb-0">No to-dos on this day.</p>
        ) : (
          selectedTasks.map((task) => {
            const overdue = !task.completed && new Date(task.Date) < today;
            return (
              <div key={task.Appointment_Id} className={`cal-agenda-row${task.completed ? " is-done" : ""}`}>
                <button
                  type="button"
                  className={`task-check${task.completed ? " is-on" : ""}`}
                  onClick={() => onToggleComplete?.(task.Appointment_Id)}
                  aria-label={task.completed ? "Mark as pending" : "Mark as done"}
                >
                  {task.completed && <i className="bi bi-check" />}
                </button>
                <div className="min-width-0">
                  <div className="fw-semibold">{task.Title}</div>
                  <div className="task-meta">
                    <span className="chip">{new Date(task.Date).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</span>
                    {task.Priority && <span className={`chip${task.Priority === "High" ? " warn" : ""}`}>{task.Priority}</span>}
                    {overdue && <span className="chip danger">Overdue</span>}
                    {task.completed && <span className="chip success">Done</span>}
                  </div>
                </div>
                <Link to={`/edit-appointment/${task.Appointment_Id}`} className="ghost-btn" aria-label="Edit task">
                  <i className="bi bi-pencil" />
                </Link>
              </div>
            );
          })
        )}
      </div>

      {undated.length > 0 && (
        <p className="saas-subtitle mb-0">{undated.length} open task{undated.length === 1 ? "" : "s"} with no due date.</p>
      )}
    </div>
  );
}
