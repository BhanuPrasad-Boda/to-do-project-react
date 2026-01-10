import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import axios from "../api/axiosConfig";
import { toast } from "react-toastify";
import "../styles/addTodo.css"; // ✅ new clean css

export function ToDoAddAppointment() {
  const navigate = useNavigate();

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();

    const user = JSON.parse(localStorage.getItem("user"));
    if (!user?.UserId) {
      toast.error("Please login first.");
      return;
    }

    if (!title.trim()) {
      toast.error("Title is required");
      return;
    }

    const todoData = {
      Appointment_Id: Date.now(), // later rename
      Title: title.trim(),
      Description: description.trim(),
      Date: dueDate ? new Date(dueDate) : null,
      UserId: user.UserId,
      completed: false, // ✅ important
    };

    try {
      setLoading(true);
      await axios.post("/appointments", todoData);
      toast.success("Task added successfully ✅");
      navigate("/user-dashboard");
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to add task ❌");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="add-todo-page">
      <div className="add-todo-card animate-up">
        <h2 className="title">Add New Task</h2>
        <p className="subtitle">Plan your task efficiently ✨</p>

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label>Title *</label>
            <input
              type="text"
              placeholder="Enter task title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
            />
          </div>

          <div className="form-group">
            <label>Description</label>
            <textarea
              rows="3"
              placeholder="Optional description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>

          <div className="form-group">
            <label>Due Date (optional)</label>
            <input
              type="datetime-local"
              value={dueDate}
              onChange={(e) => setDueDate(e.target.value)}
            />
          </div>

          <div className="btn-group">
            <button
              type="submit"
              className="btn-primary"
              disabled={loading}
            >
              {loading ? "Saving..." : "Add Task"}
            </button>

            <button
              type="button"
              className="btn-secondary"
              onClick={() => navigate("/user-dashboard")}
            >
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
