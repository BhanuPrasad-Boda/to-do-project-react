import { useEffect, useState } from "react";
import { Link } from "react-router-dom";

const ITEMS = [
  { id: "tasks", icon: "bi-check2-square", label: "Tasks", angle: -16 },
  { id: "plan", icon: "bi-calendar3", label: "Plan", angle: -38 },
  { id: "add", icon: "bi-plus-lg", label: "Add", angle: -60, href: "/add-appointment" },
  { id: "notifications", icon: "bi-bell", label: "Alerts", angle: -82 },
  { id: "settings", icon: "bi-gear", label: "Settings", angle: -104 },
];

export function MobileTabBar({ view, setView, unread = 0 }) {
  const [open, setOpen] = useState(false);
  const current = ITEMS.find((item) => item.id === view) || ITEMS[0];

  useEffect(() => {
    if (!open) return undefined;
    const onKey = (event) => {
      if (event.key === "Escape") setOpen(false);
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open]);

  const choose = (item) => {
    if (item.id !== "add") setView(item.id);
    setOpen(false);
  };

  return (
    <div className={`rudder d-lg-none${open ? " is-open" : ""}`}>
      {open ? (
        <button type="button" className="rudder-backdrop" aria-label="Close menu" onClick={() => setOpen(false)} />
      ) : null}

      <nav className="rudder-wheel" aria-label="Primary">
        {ITEMS.map((item) => {
          const active = view === item.id;
          const className = `rudder-spoke${active ? " active" : ""}`;
          const style = { "--rudder-angle": `${item.angle}deg` };
          const inner = (
            <span className="rudder-spoke-icon">
              <i className={`bi ${item.icon}`} aria-hidden="true"></i>
              {item.id === "notifications" && unread > 0 ? <span className="unread-badge">{unread}</span> : null}
            </span>
          );

          if (item.href) {
            return (
              <Link
                key={item.id}
                to={item.href}
                className={className}
                style={style}
                data-guide="guide-add-task"
                aria-label={item.label}
                onClick={() => setOpen(false)}
              >
                {inner}
              </Link>
            );
          }

          return (
            <button
              key={item.id}
              type="button"
              className={className}
              style={style}
              data-guide={item.id === "notifications" ? "guide-notifications" : undefined}
              aria-label={item.label}
              aria-current={active ? "page" : undefined}
              onClick={() => choose(item)}
            >
              {inner}
            </button>
          );
        })}

        <button
          type="button"
          className="rudder-hub"
          aria-label={open ? "Close menu" : "Open menu"}
          aria-expanded={open}
          onClick={() => setOpen((value) => !value)}
        >
          <span className="rudder-hub-ring" aria-hidden="true" />
          <i className={`bi ${open ? "bi-x-lg" : current.icon}`}></i>
          {!open && unread > 0 ? <span className="unread-badge rudder-hub-badge">{unread}</span> : null}
        </button>
      </nav>
    </div>
  );
}
