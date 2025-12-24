import  { useEffect, useState } from "react";
import { useCookies } from "react-cookie";
import { useNavigate, Link } from "react-router-dom";
import axios from "../api/axiosConfig";

export function ToDoUserDashBoard() {
  const [cookies, removeCookie] = useCookies(['userid', 'username']);
  const [appointments, setAppointments] = useState([]);
  const navigate = useNavigate();

  useEffect(() => {
    console.log("Dashboard cookies:", cookies);
  }, [cookies]);

  useEffect(() => {
    if (!cookies.userid) {
      navigate("/login");
      return;
    }

    axios.get(`/appointments/${cookies.userid}`)
      .then(res => setAppointments(res.data))
      .catch(err => console.error("Failed to fetch appointments:", err));
  }, [cookies, navigate]);

  function handleSignout() {
    removeCookie('userid', { path: '/' });
    removeCookie('username', { path: '/' });
    navigate('/login');
  }

  function handleDelete(id) {
    if (window.confirm("Are you sure you want to delete this appointment?")) {
      axios.delete(`/appointments/${id}`)
        .then(() => setAppointments(prev => prev.filter(a => a.Appointment_Id !== id)))
        .catch(err => console.error("Failed to delete appointment:", err));
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
          {appointments.map(app => (
            <div className="alert w-50 my-4 alert-success" key={app.Appointment_Id}>
              <h2>{app.Title}</h2>
              <p>{app.Description}</p>
              <div className="bi bi-calendar-date">{new Date(app.Date).toLocaleDateString()}</div>
              <div className="mt-2">
                <button onClick={() => handleDelete(app.Appointment_Id)} className="bi bi-trash btn btn-danger me-2">Remove</button>
                <Link to={`/edit-appointment/${app.Appointment_Id}`} className="bi bi-pen-fill btn btn-warning">Edit</Link>
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
