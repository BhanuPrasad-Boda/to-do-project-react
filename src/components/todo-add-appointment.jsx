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

    const userId = localStorage.getItem("user")?.UserId; // fix to get correct user
    if (!userId) {
        toast.error("User not logged in. Please login first.");
        return;
    }

    // Convert input date to local midnight in IST
    const [year, month, day] = date.split("-"); // yyyy-mm-dd
    const localDate = new Date(year, month - 1, day); // month is 0-indexed

    const appointmentData = {
        Appointment_Id: Date.now(),
        Title: title.trim(),
        Description: description.trim(),
        Date: localDate, // store as local midnight
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
