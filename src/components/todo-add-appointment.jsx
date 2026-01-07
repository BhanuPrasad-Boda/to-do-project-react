import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import axios from "../api/axiosConfig";
import { toast } from "react-toastify";

export function ToDoAddAppointment() {
    const navigate = useNavigate();

    const [title, setTitle] = useState("");
    const [description, setDescription] = useState("");
    const [date, setDate] = useState("");

    const handleSubmit = async (e) => {
        e.preventDefault();

        const userId = localStorage.getItem("userid"); // get logged-in user ID
        if (!userId) {
            toast.error("User not logged in. Please login first.");
            return;
        }

        const appointmentData = {
            Appointment_Id: Date.now(),
            Title: title.trim(),
            Description: description.trim(),
            Date: new Date(date), // ensure Date object
            UserId: userId
        };

        console.log("Sending appointment:", appointmentData);

        try {
            await axios.post("/appointments", appointmentData);
            navigate("/user-dashboard"); // redirect to dashboard
        } catch (error) {
            console.error("Appointment add error:", error.response?.data || error);
            toast.error(error.response?.data?.message || "Failed to add appointment");
        }
    };

    return (
        <div className="p-4">
            <h2>Add Appointment</h2>
            <form onSubmit={handleSubmit}>
                <div className="mb-3">
                    <label>Title</label>
                    <input
                        type="text"
                        className="form-control"
                        value={title}
                        onChange={(e) => setTitle(e.target.value)}
                        required
                    />
                </div>

                <div className="mb-3">
                    <label>Description</label>
                    <textarea
                        className="form-control"
                        value={description}
                        onChange={(e) => setDescription(e.target.value)}
                    ></textarea>
                </div>

                <div className="mb-3">
                    <label>Date</label>
                    <input
                        type="date"
                        className="form-control"
                        value={date}
                        onChange={(e) => setDate(e.target.value)}
                        required
                    />
                </div>

                <button type="submit" className="btn btn-primary">Add Appointment</button>
            </form>
        </div>
    );
}
