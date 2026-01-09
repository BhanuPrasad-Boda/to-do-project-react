import React, { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import axios from "../api/axiosConfig";
import { toast } from "react-toastify";

export function ToDoEdit() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [dueDate, setDueDate] = useState("");

  useEffect(() => {
    axios
      .get(`/todos/single/${id}`)
      .then((res) => {
        const todo = res.data;
        setTitle(todo.Title);
        setDescription(todo.Description);
        if (todo.Date) {
          setDueDate(new Date(todo.Date).toISOString().substring(0, 16));
        }
      })
      .catch(() => toast.error("Failed to load To-Do"));
  }, [id]);

  const handleSubmit = (e) => {
    e.preventDefault();

    axios
      .put(`/todos/${id}`, {
        Title: title.trim(),
        Description: description.trim(),
        Date: dueDate ? new Date(dueDate) : null,
      })
      .then(() => {
        toast.success("To-Do updated");
        navigate("/user-dashboard");
      })
      .catch(() => toast.error("Update failed"));
  };

  return (
    <div className="container py-4">
      <div className="card p-4 shadow animate-up">
        <h2>Edit To-Do</h2>
        <form onSubmit={handleSubmit}>
          <div className="mb-3">
            <label className="form-label">Title</label>
            <input
              type="text"
              className="form-control"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
            />
          </div>

          <div className="mb-3">
            <label className="form-label">Description</label>
            <textarea
              className="form-control"
              rows={3}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            ></textarea>
          </div>

          <div className="mb-3">
            <label className="form-label">Due Date (optional)</label>
            <input
              type="datetime-local"
              className="form-control"
              value={dueDate}
              onChange={(e) => setDueDate(e.target.value)}
            />
          </div>

          <div className="d-flex gap-2">
            <button type="submit" className="btn btn-success w-50">
              Update
            </button>
            <button
              type="button"
              className="btn btn-secondary w-50"
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
