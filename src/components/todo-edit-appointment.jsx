import React, { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import axios from "../api/axiosConfig";
import { toast } from "react-toastify";
import "../styles/editAppointment.css";

export function ToDoEditAppointment() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [dueDate, setDueDate] = useState("");

  // 🔹 LOAD TODO
      useEffect(() => {
  const token = localStorage.getItem("token");

  if (!token) {
    toast.error("Please login again");
    navigate("/login");
    return;
  }

  axios
    .get(`/appointments/single/${id}`, {
      headers: { Authorization: `Bearer ${token}` },
    })
    .then((res) => {
      const todo = res.data;
      setTitle(todo.Title);
      setDescription(todo.Description || "");

      if (todo.Date) {
        const d = new Date(todo.Date);
        const offset = d.getTimezoneOffset() * 60000;
        const localTime = new Date(d - offset)
          .toISOString()
          .slice(0, 16);

        setDueDate(localTime);
      }
    })
    .catch(() => toast.error("Failed to load To-Do"));
}, [id, navigate]);


  // 🔹 UPDATE TODO
  const handleSubmit = async (e) => {
    e.preventDefault();

    try {
      const token = localStorage.getItem("token");

      await axios.put(
        `/appointments/${id}`,
        {
          Title: title.trim(),
          Description: description.trim(),
          Date: dueDate ? new Date(dueDate) : null,
        },
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      toast.success("To-Do updated");
      navigate("/user-dashboard");
    } catch (err) {
      toast.error("Update failed");
    }
  };

  return (
  <div className="edit-page">
    <div className="edit-card">
      <h2 className="edit-title">✏️ Edit To-Do</h2>
      <p className="edit-subtitle">Update your task details</p>

      <form onSubmit={handleSubmit}>
        <div className="form-group">
          <label>Title</label>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Enter task title"
            required
          />
        </div>

        <div className="form-group">
          <label>Description</label>
          <textarea
            rows="3"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Optional description"
          />
        </div>

        <div className="form-group">
          <label>Due Date</label>
          <input
            type="datetime-local"
            value={dueDate}
            onChange={(e) => setDueDate(e.target.value)}
          />
        </div>

        <div className="btn-row">
          <button type="submit" className="btn-primary">
            Update To-Do
          </button>
          <button
            type="button"
            className="btn-outline"
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
