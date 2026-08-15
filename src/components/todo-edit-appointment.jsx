import React, { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import axios from "../api/axiosConfig";
import { toast } from "react-toastify";
import { AuthLayout } from "./AuthLayout";
import "../styles/editAppointment.css";

export function ToDoEditAppointment() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [priority, setPriority] = useState("Medium");
  const [category, setCategory] = useState("General");
  const [recurrence, setRecurrence] = useState("none");
  const [reminderOffsetMinutes, setReminderOffsetMinutes] = useState(30);
  const [notes, setNotes] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) {
      toast.error("Please login again");
      navigate("/login");
      return;
    }

    axios
      .get(`/appointments/single/${id}`)
      .then((res) => {
        const todo = res.data;
        setTitle(todo.Title);
        setDescription(todo.Description || "");
        setPriority(todo.Priority || "Medium");
        setCategory(todo.category || "General");
        setRecurrence(todo.recurrence || "none");
        setReminderOffsetMinutes(todo.reminderOffsetMinutes ?? 30);
        setNotes(todo.notes || "");
        if (todo.Date) {
          const d = new Date(todo.Date);
          const offset = d.getTimezoneOffset() * 60000;
          setDueDate(new Date(d - offset).toISOString().slice(0, 16));
        }
      })
      .catch(() => toast.error("Failed to load Task"))
      .finally(() => setLoading(false));
  }, [id, navigate]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await axios.put(`/appointments/${id}`, {
        Title: title.trim(),
        Description: description.trim(),
        Date: dueDate ? new Date(dueDate) : null,
        Priority: priority,
        category,
        recurrence,
        reminderOffsetMinutes: Number(reminderOffsetMinutes),
        notes,
      });
      toast.success("Task updated");
      navigate("/user-dashboard");
    } catch {
      toast.error("Update failed");
    }
  };

  if (loading) {
    return (
      <AuthLayout>
        <p className="text-secondary mb-0">Loading...</p>
      </AuthLayout>
    );
  }

  return (
    <AuthLayout>
      <div className="glass-panel-glow auth-card animate-slide-up">
        <div className="text-center mb-4">
          <h2 className="fw-bold mb-1">Edit Task</h2>
          <p className="text-secondary small">Update your task details</p>
        </div>

        <form onSubmit={handleSubmit} className="d-flex flex-column gap-3">
          <div className="floating-label-group mb-0">
            <input type="text" className="floating-input" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Task Title" required />
            <label className="floating-label">Title</label>
          </div>
          <div className="floating-label-group mb-0">
            <textarea className="floating-input" rows="3" value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Optional description" style={{ minHeight: "100px" }} />
            <label className="floating-label">Description</label>
          </div>
          <div className="floating-label-group mb-0">
            <input type="datetime-local" className="floating-input" value={dueDate} onChange={(e) => setDueDate(e.target.value)} />
            <label className="floating-label">Due Date</label>
          </div>
          <div className="row g-2">
            <div className="col-12 col-sm-6">
              <label className="small fw-semibold" htmlFor="edit-priority">Priority</label>
              <select id="edit-priority" className="input-premium" value={priority} onChange={(e) => setPriority(e.target.value)}>
                <option>Low</option>
                <option>Medium</option>
                <option>High</option>
              </select>
            </div>
            <div className="col-12 col-sm-6">
              <label className="small fw-semibold" htmlFor="edit-category">Category</label>
              <select id="edit-category" className="input-premium" value={category} onChange={(e) => setCategory(e.target.value)}>
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
          <div>
            <label className="small fw-semibold" htmlFor="edit-reminder">Reminder</label>
            <select id="edit-reminder" className="input-premium" value={reminderOffsetMinutes} onChange={(e) => setReminderOffsetMinutes(Number(e.target.value))}>
              <option value={15}>15 minutes before</option>
              <option value={30}>30 minutes before</option>
              <option value={60}>1 hour before</option>
              <option value={1440}>1 day before</option>
            </select>
          </div>
          <div>
            <label className="small fw-semibold" htmlFor="edit-recurrence">Repeat</label>
            <select id="edit-recurrence" className="input-premium" value={recurrence} onChange={(e) => setRecurrence(e.target.value)}>
              <option value="none">Does not repeat</option>
              <option value="daily">Every day</option>
              <option value="weekdays">Every weekday</option>
              <option value="weekly">Every week</option>
              <option value="monthly">Every month</option>
            </select>
          </div>
          <div className="floating-label-group mb-0">
            <textarea className="floating-input" value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Notes" />
            <label className="floating-label">Notes</label>
          </div>
          <div className="form-actions mt-3">
            <button type="button" className="btn btn-outline-secondary rounded-pill fw-bold" onClick={() => navigate("/user-dashboard")}>Cancel</button>
            <button type="submit" className="btn btn-premium">Update Task</button>
          </div>
        </form>
      </div>
    </AuthLayout>
  );
}
