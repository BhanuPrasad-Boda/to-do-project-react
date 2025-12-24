import React, { useState } from "react";
import { useCookies } from "react-cookie";
import { useNavigate } from "react-router-dom";
import axios from "../api/axiosConfig";

export function ToDoAddAppointment() {
    const [cookies] = useCookies(['userid']);
    const navigate = useNavigate();

    const [title, setTitle] = useState("");
    const [description, setDescription] = useState("");
    const [date, setDate] = useState("");

    function handleSubmit(e) {
    e.preventDefault();

    const appointmentData = {
        Appointment_Id: Date.now(),
        Title: title,
        Description: description,
        Date: date,
        UserId: cookies['userid']
    };

    axios.post("/appointments", appointmentData)
         .then(() => navigate("/user-dashboard")) // redirect to dashboard
         .catch(error => console.error(error));
}


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
