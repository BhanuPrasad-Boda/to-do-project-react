import { useEffect, useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import axios from "../api/axiosConfig";
import { toast } from "react-toastify";
import  "../styles/dashboardStyles.css" // ✅ unique CSS

export function ToDoUserDashBoard() {
  const [appointments, setAppointments] = useState([]);
  const navigate = useNavigate();

  const userData = JSON.parse(localStorage.getItem("user")) || {};

  const formatDateTime = (date) => {
    if (!date) return "-";
    return new Date(date).toLocaleString("en-IN", {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      hour12: true,
      timeZone: "Asia/Kolkata",
    });
  };

  useEffect(() => {
    const token = localStorage.getItem("token");

    if (!userData.UserId || !token) {
      navigate("/login");
      return;
    }

    const fetchAppointments = async () => {
      try {
        const res = await axios.get(`/appointments/${userData.UserId}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        setAppointments(res.data);
      } catch (err) {
        toast.error("Failed to load appointments");
        localStorage.clear();
        navigate("/login");
      }
    };

    fetchAppointments();
  }, [navigate, userData.UserId]);

  const handleSignout = () => {
    localStorage.clear();
    navigate("/login");
  };

  const handleDelete = (id) => {
    toast(
      ({ closeToast }) => (
        <div>
          <p className="mb-2">Delete this appointment?</p>
          <div className="d-flex justify-content-end gap-2">
            <button
              className="btn btn-danger btn-sm"
              onClick={async () => {
                try {
                  const token = localStorage.getItem("token");
                  await axios.delete(`/appointments/${id}`, {
                    headers: { Authorization: `Bearer ${token}` },
                  });

                  setAppointments((prev) =>
                    prev.filter((a) => a.Appointment_Id !== id)
                  );

                  toast.success("Appointment deleted");
                } catch {
                  toast.error("Delete failed");
                }
                closeToast();
              }}
            >
              Yes
            </button>
            <button className="btn btn-secondary btn-sm" onClick={closeToast}>
              No
            </button>
          </div>
        </div>
      ),
      { autoClose: false }
    );
  };

  return (
    <div className="dashboard-page">
      <div className="container">

        {/* HEADER */}
        <div className="dashboard-header animate-down">
          <h2>Dashboard</h2>
          <button onClick={handleSignout} className="btn btn-outline-danger btn-sm">
            Sign out
          </button>
        </div>

        {/* WELCOME */}
        <div className="welcome-card animate-up">
          <h5>
            Welcome, <span>{userData.UserName || "User"}</span> 👋
          </h5>
          <Link to="/add-appointment" className="btn btn-primary btn-sm">
            + Add Appointment
          </Link>
        </div>

        {/* EMPTY */}
        {appointments.length === 0 && (
          <div className="empty-state animate-fade">
            No appointments found 😊
          </div>
        )}

        {/* APPOINTMENTS */}
        <div className="row g-4 mt-1">
          {appointments.map((app) => (
            <div
              className="col-12 col-md-6 col-lg-4 animate-card"
              key={app.Appointment_Id}
            >
              <div className="appointment-card">
                <h5>{app.Title}</h5>
                <p>{app.Description}</p>

                <div className="meta">
                  📅 {formatDateTime(app.Date)}
                </div>

                <div className="timestamps">
                  Created: {formatDateTime(app.createdAt)} <br />
                  Updated: {formatDateTime(app.updatedAt)}
                </div>

                <div className="actions">
                  <button
                    className="btn btn-outline-danger btn-sm"
                    onClick={() => handleDelete(app.Appointment_Id)}
                  >
                    Delete
                  </button>
                  <Link
                    to={`/edit-appointment/${app.Appointment_Id}`}
                    className="btn btn-outline-warning btn-sm"
                  >
                    Edit
                  </Link>
                </div>
              </div>
            </div>
          ))}
        </div>

      </div>
    </div>
  );
}
