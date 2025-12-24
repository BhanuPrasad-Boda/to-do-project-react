import React, { useEffect, useState } from "react";
import { useCookies } from "react-cookie";
import { useNavigate, Link } from "react-router-dom";
import axios from "../api/axiosConfig"; // import the axios instance

export function ToDoUserDashBoard() {

    const [cookies, , removeCookie] = useCookies(['userid', 'username']);


    // Use regular JS array state, no TypeScript typing
    const [appointments, setAppointments] = useState([]);

    const navigate = useNavigate();

    useEffect(() => {
        axios.get(`/appointments/${cookies['userid']}`)
            .then(response => setAppointments(response.data))
            .catch(error => console.error("Failed to fetch appointments:", error));
    }, [cookies]);

    function handleSignout() {
        removeCookie('userid', { path: '/' });
        removeCookie('username', { path: '/' });
        navigate('/login');

    }

    function handleDelete(id) {
    if (window.confirm("Are you sure you want to delete this appointment?")) {
        axios.delete(`/appointments/${id}`)
            .then(() => {
                // Remove the deleted appointment from state
                setAppointments(prev => prev.filter(app => app.Appointment_Id !== id));
            })
            .catch(error => console.error("Failed to delete appointment:", error));
    }
}


    return (
        <div className="p-2">
            <div className="h2 d-flex justify-content-center">Dashboard</div>
            <nav className="d-flex justify-content-between mt-4 p-2">
                <div className="h3 text-light">
    Welcome, {cookies.username} 👋
</div>

                <div className="ms-4">
                    <button onClick={handleSignout} className="btn btn-danger">Signout</button>
                </div>
            </nav>

            <section className="text-start" style={{ height: '100vh' }}>
                <div>
                    <Link to="/add-appointment" className="bi bi-calendar-date btn btn-dark"> Add Appointment</Link>
                </div>

                <div>
                    {appointments.map(appointment =>
                        <div className="alert w-50 my-4 alert-success" key={appointment.Appointment_Id}>
                            <h2>{appointment.Title}</h2>
                            <p>{appointment.Description}</p>
                            <div className="bi bi-calendar-date">
                                {new Date(appointment.Date).toLocaleDateString()}
                            </div>
                            <div className="mt-2">
                                <button onClick={() => handleDelete(appointment.Appointment_Id)} className="bi bi-trash btn btn-danger me-2"> Remove </button>
                                <Link to={`/edit-appointment/${appointment.Appointment_Id}`} className="bi bi-pen-fill btn btn-warning"> Edit </Link>
                            </div>
                        </div>
                    )}
                </div>
            </section>
        </div>
    );
}
