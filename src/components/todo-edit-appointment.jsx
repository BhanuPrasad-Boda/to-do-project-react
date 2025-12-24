import React, { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import axios from "../api/axiosConfig";

export function ToDoEditAppointment() {
    const { id } = useParams();  // Appointment_Id
    const navigate = useNavigate();

    const [title, setTitle] = useState("");
    const [description, setDescription] = useState("");
    const [date, setDate] = useState("");

    // Fetch existing appointment
    useEffect(() => {
        axios.get(`/appointments/single/${id}`)
 // You may need a backend route to get one appointment by Appointment_Id
            .then(response => {
                const appointment = response.data;
                setTitle(appointment.Title);
                setDescription(appointment.Description);
                setDate(new Date(appointment.Date).toISOString().split("T")[0]); // format YYYY-MM-DD
            })
            .catch(error => console.error("Failed to fetch appointment:", error));
    }, [id]);

    function handleSubmit(e) {
        e.preventDefault();
        const updatedAppointment = { Title: title, Description: description, Date: date };

        axios.put(`/appointments/${id}`, updatedAppointment)
            .then(() => navigate("/user-dashboard"))
            .catch(error => console.error("Failed to update appointment:", error));
    }

    return (
        <div className="p-4">
            <h2>Edit Appointment</h2>
            <form onSubmit={handleSubmit}>
                <div className="mb-3">
                    <label>Title</label>
                    <input type="text" className="form-control" value={title} onChange={e => setTitle(e.target.value)} required />
                </div>
                <div className="mb-3">
                    <label>Description</label>
                    <textarea className="form-control" value={description} onChange={e => setDescription(e.target.value)}></textarea>
                </div>
                <div className="mb-3">
                    <label>Date</label>
                    <input type="date" className="form-control" value={date} onChange={e => setDate(e.target.value)} required />
                </div>
                <button type="submit" className="btn btn-warning">Update Appointment</button>
            </form>
        </div>
    );
}
