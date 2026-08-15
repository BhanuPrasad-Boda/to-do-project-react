import React from "react";

export function BottomNav({ view, setView, unread }) {
  const items = [
    { id: "tasks", icon: "bi-check2-square", label: "Tasks" },
    { id: "plan", icon: "bi-sun", label: "Plan" },
    { id: "notifications", icon: "bi-bell", label: "Alerts", badge: unread },
    { id: "settings", icon: "bi-gear", label: "Settings" },
  ];

  return (
    <nav className="bottom-nav d-lg-none" aria-label="Primary">
      {items.map((item) => (
        <button
          key={item.id}
          className={`bottom-nav-btn ${view === item.id ? "active" : ""}`}
          data-guide={item.id === "notifications" ? "guide-notifications" : undefined}
          onClick={() => setView(item.id)}
          aria-current={view === item.id ? "page" : undefined}
        >
          <span className="position-relative">
            <i className={`bi ${item.icon} fs-5`}></i>
            {item.badge > 0 && <span className="unread-badge position-absolute top-0 start-100 translate-middle">{item.badge}</span>}
          </span>
          {item.label}
        </button>
      ))}
    </nav>
  );
}
