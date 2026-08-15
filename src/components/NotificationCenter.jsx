import React, { useEffect, useRef, useState } from "react";
import axios from "../api/axiosConfig";
import { useNavigate } from "react-router-dom";

const CATEGORIES = [
  { id: "all", label: "All" },
  { id: "tasks", label: "Tasks" },
  { id: "reminders", label: "Reminders" },
  { id: "overdue", label: "Overdue" },
  { id: "system", label: "System" },
  { id: "productivity", label: "Productivity" },
];

export function NotificationCenter({ open, onClose, onChanged, inline }) {
  const navigate = useNavigate();
  const [items, setItems] = useState([]);
  const [unread, setUnread] = useState(0);
  const [category, setCategory] = useState("all");
  const [loading, setLoading] = useState(false);
  const panelRef = useRef(null);

  const load = async (selected = category) => {
    setLoading(true);
    try {
      const res = await axios.get("/notifications", { params: { category: selected } });
      setItems(res.data.items || []);
      setUnread(res.data.unread || 0);
      onChanged?.(res.data.unread || 0);
    } catch {
      setItems([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (open) load(category);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, category]);

  useEffect(() => {
    const onKey = (e) => {
      if (e.key === "Escape") onClose?.();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);

  useEffect(() => {
    if (!open || inline) return;
    const onClick = (e) => {
      if (e.target.closest("[data-notif-toggle]")) return;
      if (panelRef.current && !panelRef.current.contains(e.target)) onClose?.();
    };
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, [open, inline, onClose]);

  if (!open) return null;

  const markOne = async (item) => {
    await axios.put(`/notifications/${item._id}/read`);
    load();
    if (item.taskId) {
      onClose?.();
      navigate(`/edit-appointment/${item.taskId}`);
    }
  };

  return (
    <div className={`${inline ? "saas-card" : "notification-panel"} p-3`} ref={panelRef} role="dialog" aria-label="Notifications">
      <div className="d-flex flex-wrap justify-content-between align-items-start mb-3 gap-2">
        <div className="min-width-0">
          <div className="page-kicker">Inbox</div>
          <h6 className="m-0 fw-semibold">
            Notifications {unread > 0 && <span className="unread-badge ms-1">{unread}</span>}
          </h6>
        </div>
        <div className="d-flex flex-wrap gap-2">
          <button type="button" className="quiet-link" onClick={async () => { await axios.put("/notifications/read-all"); load(); }}>Mark all read</button>
          <button type="button" className="quiet-link" onClick={async () => { await axios.delete("/notifications/clear-read"); load(); }}>Clear</button>
        </div>
      </div>
      <div className="filter-pills flex-wrap mb-3">
        {CATEGORIES.map((cat) => (
          <button
            key={cat.id}
            type="button"
            className={`filter-pill ${category === cat.id ? "active" : ""}`}
            onClick={() => setCategory(cat.id)}
          >
            {cat.label}
          </button>
        ))}
      </div>
      {loading ? (
        <div className="text-center py-4"><div className="spinner-border spinner-border-sm" role="status" /></div>
      ) : items.length === 0 ? (
        <div className="empty-board py-4">
          <i className="bi bi-bell-slash mb-2 d-block"></i>
          <p className="saas-subtitle mb-0">You&apos;re all caught up</p>
        </div>
      ) : (
        <ul className="list-unstyled mb-0">
          {items.map((item) => (
            <li key={item._id}>
              <button
                type="button"
                className={`notification-item w-100 text-start border-0 rounded-3 p-2 mb-1 ${item.read ? "" : "unread"}`}
                onClick={() => markOne(item)}
              >
                <div className="fw-semibold small">{item.title}</div>
                <div className="saas-subtitle">{item.body}</div>
                <div className="saas-subtitle" style={{ fontSize: "0.7rem" }}>
                  {new Date(item.createdAt).toLocaleString()} · {item.category}
                </div>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
