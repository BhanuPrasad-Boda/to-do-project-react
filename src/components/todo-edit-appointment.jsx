import React, { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import axios from "../api/axiosConfig";
import { toast } from "react-toastify";

export function ToDoEditAppointment() {
  const { id } = useParams(); // Appointment_Id
  const navigate = useNavigate();

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [dateTime, setDateTime] = useState(""); // date + time

  // Fetch existing appointment
  useEffect(() => {
    axios
      .get(`/appointments/single/${id}`) // backend route must return one appointment
      .then((response) => {
        const appointment = response.data;
        setTitle(appointment.Title);
        setDescription(appointment.Description);

        // Convert stored Date to input datetime-local format: YYYY-MM-DDTHH:mm
        if (appointment.Date) {
          const dt = new Date(appointment.Date);
          const isoString = dt.toISOString(); // UTC
          setDateTime(isoString.substring(0, 16)); // YYYY-MM-DDTHH:mm
        }
      })
      .catch((error) => console.error("Failed to fetch appointment:", error));
  }, [id]);

  const handleSubmit = (e) => {
    e.preventDefault();

    if (!dateTime) {
      toast.error("Please select date & time");
      return;
    }

    const updatedAppointment = {
      Title: title.trim(),
      Description: description.trim(),
      Date: new Date(dateTime), // store exact date + time selected
    };

    axios
      .put(`/appointments/${id}`, updatedAppointment)
      .then(() => {
        toast.success("Appointment updated successfully");
        navigate("/user-dashboard");
      })
      .catch((error) => {
        console.error("Failed to update appointment:", error);
        toast.error("Failed to update appointment");
      });
  };

  return (
    <div className="container py-4">
      <h2 className="mb-4">Edit Appointment</h2>
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
          <label className="form-label">Scheduled Date & Time</label>
          <input
            type="datetime-local"
            className="form-control"
            value={dateTime}
            onChange={(e) => setDateTime(e.target.value)}
            required
          />
        </div>

        <button type="submit" className="btn btn-warning">
          Update Appointment
        </button>
        <button
          type="button"
          className="btn btn-secondary ms-2"
          onClick={() => navigate("/user-dashboard")}
        >
          Cancel
        </button>
      </form>
    </div>
  );
}
