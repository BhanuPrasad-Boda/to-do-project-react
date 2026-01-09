import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import axios from "../api/axiosConfig";
import { toast } from "react-toastify";

export function ToDoAdd() {
  const navigate = useNavigate();
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [dueDate, setDueDate] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();
    const user = JSON.parse(localStorage.getItem("user"));
    if (!user?.UserId) {
      toast.error("Please login first.");
      return;
    }

    const todoData = {
      Appointment_Id: Date.now(), // later rename to Todo_Id
      Title: title.trim(),
      Description: description.trim(),
      Date: dueDate ? new Date(dueDate) : null,
      UserId: user.UserId,
    };

    try {
      await axios.post("/todos", todoData);
      toast.success("To-Do added successfully");
      navigate("/user-dashboard");
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to add To-Do");
    }
  };

  return (
    <div className="container py-4">
      <div className="card p-4 shadow animate-up">
        <h2 className="mb-4">Add To-Do</h2>
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
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
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

          <button type="submit" className="btn btn-success w-100">
            Add To-Do
          </button>
        </form>
      </div>
    </div>
  );
}
