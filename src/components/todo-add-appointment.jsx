import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import axios from "../api/axiosConfig";
import { toast } from "react-toastify";
import { useSmartPreview } from "../utils/useSmartPreview";
import { generateAiSuggestions, toDatetimeLocal } from "../utils/aiSuggestions";
import { SmartSuggestion } from "./SmartSuggestion";
import { AuthLayout } from "./AuthLayout";
import { useCompanion } from "../companion/CompanionContext";
import "../styles/addTodo.css";
import "../styles/appExtras.css";

export function ToDoAddAppointment() {
  const navigate = useNavigate();
  const { publishSnapshot, emitEvent } = useCompanion();

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [priority, setPriority] = useState("Medium");
  const [category, setCategory] = useState("General");
  const [tags, setTags] = useState("");
  const [recurrence, setRecurrence] = useState("none");
  const [reminderOffsetMinutes, setReminderOffsetMinutes] = useState(30);
  const [notes, setNotes] = useState("");
  const [subtasks, setSubtasks] = useState("");
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [loading, setLoading] = useState(false);
  const [dueTouched, setDueTouched] = useState(false);
  const [priorityTouched, setPriorityTouched] = useState(false);
  const [categoryTouched, setCategoryTouched] = useState(false);
  const [recurrenceTouched, setRecurrenceTouched] = useState(false);
  const [appliedPreview, setAppliedPreview] = useState(null);
  const [dismissed, setDismissed] = useState(false);
  const [activeSuggestion, setActiveSuggestion] = useState(0);
  const livePreview = useSmartPreview(title);
  const suggestions = useMemo(
    () => (appliedPreview || dismissed ? [] : generateAiSuggestions(livePreview)),
    [livePreview, appliedPreview, dismissed]
  );

  useEffect(() => {
    publishSnapshot({ pathname: "/add-appointment", view: "create" });
  }, [publishSnapshot]);

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) {
      toast.error("Please login first.");
      navigate("/login");
    }
  }, [navigate]);

  useEffect(() => {
    if (appliedPreview) return;
    if (!title.trim()) {
      if (!dueTouched) setDueDate("");
      if (!priorityTouched) setPriority("Medium");
      if (!categoryTouched) setCategory("General");
      if (!recurrenceTouched) setRecurrence("none");
      return;
    }
    if (!livePreview) return;
    if (!dueTouched) setDueDate(toDatetimeLocal(livePreview.dueDate));
    if (!priorityTouched && livePreview.priority) setPriority(livePreview.priority);
    if (!categoryTouched && livePreview.category) setCategory(livePreview.category);
    if (!recurrenceTouched && livePreview.recurrence && livePreview.recurrence !== "none") {
      setRecurrence(livePreview.recurrence);
      setShowAdvanced(true);
    }
    if (livePreview.reminderOffsetMinutes) {
      setReminderOffsetMinutes(livePreview.reminderOffsetMinutes);
    }
  }, [
    appliedPreview,
    title,
    livePreview,
    dueTouched,
    priorityTouched,
    categoryTouched,
    recurrenceTouched,
  ]);

  const applyPreview = (item) => {
    const next = item || livePreview;
    if (!next) return;
    setAppliedPreview(next);
    setDismissed(false);
    if (next.title) setTitle(next.title);
    if (next.dueDate) {
      setDueDate(toDatetimeLocal(next.dueDate));
      setDueTouched(true);
    }
    if (next.priority) {
      setPriority(next.priority);
      setPriorityTouched(true);
    }
    if (next.category) {
      setCategory(next.category);
      setCategoryTouched(true);
    }
    if (next.recurrence && next.recurrence !== "none") {
      setRecurrence(next.recurrence);
      setRecurrenceTouched(true);
      setShowAdvanced(true);
    }
    if (next.reminderOffsetMinutes) {
      setReminderOffsetMinutes(next.reminderOffsetMinutes);
    }
  };

  const onTitleKeyDown = (event) => {
    if (event.key === "Escape") {
      setDismissed(true);
      return;
    }
    if (!suggestions.length) return;
    if (event.key === "ArrowDown") {
      event.preventDefault();
      setActiveSuggestion((index) => Math.min(suggestions.length - 1, index + 1));
    } else if (event.key === "ArrowUp") {
      event.preventDefault();
      setActiveSuggestion((index) => Math.max(0, index - 1));
    } else if (event.key === "Tab") {
      event.preventDefault();
      applyPreview(suggestions[activeSuggestion] || suggestions[0]);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const user = JSON.parse(localStorage.getItem("user") || "{}");
    if (!user?.UserId) {
      toast.error("Please login first.");
      return;
    }
    if (!title.trim()) {
      toast.error("Title is required");
      return;
    }

    const todoData = {
      Appointment_Id: Date.now(),
      Title: title.trim(),
      Description: description.trim(),
      Date: dueDate ? new Date(dueDate) : null,
      UserId: user.UserId,
      completed: false,
      Priority: priority,
      category,
      tags: tags.split(",").map((t) => t.trim()).filter(Boolean),
      recurrence,
      reminderOffsetMinutes: Number(reminderOffsetMinutes),
      notes,
      naturalText: title,
      subtasks: subtasks.split("\n").map((t) => t.trim()).filter(Boolean).map((t) => ({ title: t, completed: false })),
    };

    try {
      setLoading(true);
      await axios.post("/appointments", todoData);
      emitEvent("created");
      toast.success("Task added successfully");
      navigate("/user-dashboard");
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to add task");
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthLayout>
      <div className="glass-panel-glow auth-card animate-slide-up">
        <div className="text-center mb-4">
          <h2 className="fw-bold mb-1">Add New Task</h2>
          <p className="text-secondary small">Try: “Submit project report next Friday at 5 PM”</p>
        </div>

        <form onSubmit={handleSubmit} className="d-flex flex-column gap-3">
          <div className="floating-label-group mb-0">
            <input
              type="text"
              className="floating-input"
              placeholder="Task Title"
              value={title}
              onChange={(e) => {
                setAppliedPreview(null);
                setDismissed(false);
                setActiveSuggestion(0);
                setTitle(e.target.value);
              }}
              onKeyDown={onTitleKeyDown}
              autoComplete="off"
              required
            />
            <label className="floating-label">Title *</label>
          </div>

          <SmartSuggestion
            suggestions={suggestions}
            activeIndex={activeSuggestion}
            onHover={setActiveSuggestion}
            onSelect={applyPreview}
          />

          <div className="floating-label-group mb-0">
            <textarea className="floating-input" rows="3" placeholder="Optional description" value={description} onChange={(e) => setDescription(e.target.value)} style={{ minHeight: "90px" }} />
            <label className="floating-label">Description</label>
          </div>

          <div className="floating-label-group mb-0">
            <input type="datetime-local" className="floating-input" value={dueDate} onChange={(e) => { setDueTouched(true); setDueDate(e.target.value); }} />
            <label className="floating-label">Due Date (optional)</label>
          </div>

          <div className="row g-2">
            <div className="col-12 col-sm-6">
              <label className="small fw-semibold" htmlFor="priority">
                Priority
                {!priorityTouched && livePreview?.priority && livePreview.priority !== "Medium" ? <span className="ai-filled">AI</span> : null}
              </label>
              <select id="priority" className="input-premium" value={priority} onChange={(e) => { setPriorityTouched(true); setPriority(e.target.value); }}>
                <option>Low</option>
                <option>Medium</option>
                <option>High</option>
              </select>
            </div>
            <div className="col-12 col-sm-6">
              <label className="small fw-semibold" htmlFor="category">
                Category
                {!categoryTouched && livePreview?.category && livePreview.category !== "General" ? <span className="ai-filled">AI</span> : null}
              </label>
              <select id="category" className="input-premium" value={category} onChange={(e) => { setCategoryTouched(true); setCategory(e.target.value); }}>
                <option>General</option>
                <option>Work</option>
                <option>Personal</option>
                <option>Health</option>
                <option>Shopping</option>
                <option>Finance</option>
                <option>Learning</option>
              </select>
            </div>
          </div>

          <button type="button" className="btn btn-link text-start p-0" onClick={() => setShowAdvanced((v) => !v)}>
            {showAdvanced ? "Hide" : "Show"} reminders, recurrence & notes
          </button>

          {showAdvanced && (
            <div className="d-flex flex-column gap-3">
              <div>
                <label className="small fw-semibold" htmlFor="reminder">Reminder</label>
                <select id="reminder" className="input-premium" value={reminderOffsetMinutes} onChange={(e) => setReminderOffsetMinutes(Number(e.target.value))}>
                  <option value={15}>15 minutes before</option>
                  <option value={30}>30 minutes before</option>
                  <option value={60}>1 hour before</option>
                  <option value={1440}>1 day before</option>
                </select>
              </div>
              <div>
                <label className="small fw-semibold" htmlFor="recurrence">Repeat</label>
                <select id="recurrence" className="input-premium" value={recurrence} onChange={(e) => { setRecurrenceTouched(true); setRecurrence(e.target.value); }}>
                  <option value="none">Does not repeat</option>
                  <option value="daily">Every day</option>
                  <option value="weekdays">Every weekday</option>
                  <option value="weekly">Every week</option>
                  <option value="monthly">Every month</option>
                </select>
              </div>
              <div className="floating-label-group mb-0">
                <input className="floating-input" placeholder="Tags" value={tags} onChange={(e) => setTags(e.target.value)} />
                <label className="floating-label">Tags (comma separated)</label>
              </div>
              <div className="floating-label-group mb-0">
                <textarea className="floating-input" placeholder="Notes" value={notes} onChange={(e) => setNotes(e.target.value)} />
                <label className="floating-label">Notes</label>
              </div>
              <div className="floating-label-group mb-0">
                <textarea className="floating-input" placeholder="Subtasks" value={subtasks} onChange={(e) => setSubtasks(e.target.value)} />
                <label className="floating-label">Subtasks (one per line)</label>
              </div>
            </div>
          )}

          <div className="form-actions mt-2">
            <button type="button" className="btn btn-outline-secondary rounded-pill fw-bold" onClick={() => navigate("/user-dashboard")}>Cancel</button>
            <button type="submit" className="btn btn-premium" disabled={loading}>{loading ? "Saving..." : "Add Task"}</button>
          </div>
        </form>
      </div>
    </AuthLayout>
  );
}
