import React, { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import axios from "../api/axiosConfig";
import { toast } from "react-toastify";
import "../styles/editAppointment.css" // ✅ unique css

export function ToDoEditAppointment() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [dateTime, setDateTime] = useState("");

  useEffect(() => {
    axios
      .get(`/appointments/single/${id}`)
      .then((response) => {
        const appointment = response.data;
        setTitle(appointment.Title);
        setDescription(appointment.Description);

        if (appointment.Date) {
          const dt = new Date(appointment.Date);
          setDateTime(dt.toISOString().substring(0, 16));
        }
      })
      .catch(() => toast.error("Failed to load appointment"));
  }, [id]);

  const handleSubmit = (e) => {
    e.preventDefault();

    if (!dateTime) {
      toast.error("Please select date & time");
      return;
    }

    axios
      .put(`/appointments/${id}`, {
        Title: title.trim(),
        Description: description.trim(),
        Date: new Date(dateTime),
      })
      .then(() => {
        toast.success("Appointment updated");
        navigate("/user-dashboard");
      })
      .catch(() => toast.error("Update failed"));
  };

  return (
    <div className="edit-page">
      <div className="edit-card animate-up">
        <h2>Edit Appointment</h2>

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label>Title</label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
            />
          </div>

          <div className="form-group">
            <label>Description</label>
            <textarea
              rows={3}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            ></textarea>
          </div>

          <div className="form-group">
            <label>Scheduled Date & Time</label>
            <input
              type="datetime-local"
              value={dateTime}
              onChange={(e) => setDateTime(e.target.value)}
              required
            />
          </div>

          <div className="btn-group">
            <button type="submit" className="btn-update">
              Update
            </button>
            <button
              type="button"
              className="btn-cancel"
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
