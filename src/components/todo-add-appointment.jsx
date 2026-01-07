import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import axios from "../api/axiosConfig";
import { toast } from "react-toastify";

export function ToDoAddAppointment() {
  const navigate = useNavigate();

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [dateTime, setDateTime] = useState(""); // now stores both date + time

  const handleSubmit = async (e) => {
    e.preventDefault();

    const user = JSON.parse(localStorage.getItem("user")); // get logged-in user
    if (!user?.UserId) {
      toast.error("User not logged in. Please login first.");
      return;
    }

    if (!dateTime) {
      toast.error("Please select a date and time");
      return;
    }

    // Convert input value to JS Date object
    const selectedDate = new Date(dateTime);

    const appointmentData = {
      Appointment_Id: Date.now(),
      Title: title.trim(),
      Description: description.trim(),
      Date: selectedDate, // stores exact datetime selected by user
      UserId: user.UserId
    };

    console.log("Sending appointment:", appointmentData);

    try {
      await axios.post("/appointments", appointmentData);
      toast.success("Appointment added successfully");
      navigate("/user-dashboard");
    } catch (error) {
      console.error("Appointment add error:", error.response?.data || error);
      toast.error(error.response?.data?.message || "Failed to add appointment");
    }
  };

  return (
    <div className="container py-4">
      <h2 className="mb-4">Add Appointment</h2>
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

        <button type="submit" className="btn btn-primary">
          Add Appointment
        </button>
      </form>
    </div>
  );
}
