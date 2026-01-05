import { useEffect, useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import axios from "../api/axiosConfig";
import { startAutoLogout } from "../utils/autoLogout";

export function ToDoUserDashBoard() {
  const [appointments, setAppointments] = useState([]);
  const navigate = useNavigate();

  useEffect(() => {
    const userData = JSON.parse(localStorage.getItem("user"));
    const token = localStorage.getItem("token");
    startAutoLogout(navigate);

    if (!userData || !token) {
      navigate("/login");
      return;
    }

    const fetchAppointments = async () => {
      try {
        const res = await axios.get(`/appointments/${userData.UserId}`, {
          headers: {
            Authorization: `Bearer ${token}`
          }
        });
        setAppointments(res.data);
      } catch (err) {
        console.error("Failed to fetch appointments:", err);
        alert(err.response?.data?.message || "Failed to load appointments");
        if (err.response?.status === 401 || err.response?.status === 403) {
          localStorage.removeItem("user");
          localStorage.removeItem("token");
          navigate("/login");
        }
      }
    };

    fetchAppointments();
  }, [navigate]);

  const handleSignout = () => {
    localStorage.removeItem("user");
    localStorage.removeItem("token");
    navigate("/login");
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Are you sure you want to delete this appointment?")) return;

    try {
      const token = localStorage.getItem("token");
      await axios.delete(`/appointments/${id}`, {
        headers: {
          Authorization: `Bearer ${token}`
        }
      });
      setAppointments(prev => prev.filter(a => a.Appointment_Id !== id));
    } catch (err) {
      console.error("Failed to delete appointment:", err);
      alert(err.response?.data?.message || "Delete failed");
    }
  };

  const userData = JSON.parse(localStorage.getItem("user")) || {};

  return (
    <div className="p-2">
      <div className="h2 d-flex justify-content-center">Dashboard</div>
      <nav className="d-flex justify-content-between mt-4 p-2">
        <div className="h3 text-light">
          Welcome, {userData.UserName || "User"} 👋
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
