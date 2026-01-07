import { useEffect, useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import axios from "../api/axiosConfig";
import { toast } from "react-toastify";

export function ToDoUserDashBoard() {
  const [appointments, setAppointments] = useState([]);
  const navigate = useNavigate();

  const userData = JSON.parse(localStorage.getItem("user")) || {};

  // Format date & time in IST
  const formatDateTime = (date) => {
    if (!date) return "-";
    return new Date(date).toLocaleString("en-IN", {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      hour12: true,
      timeZone: "Asia/Kolkata", // ensures IST
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
        toast.error(err.response?.data?.message || "Failed to load appointments");

        if ([401, 403].includes(err.response?.status)) {
          localStorage.clear();
          navigate("/login");
        }
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
          <p className="mb-2">Are you sure you want to delete this appointment?</p>
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

                  toast.success("Appointment deleted successfully");
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
      { autoClose: false, closeOnClick: false }
    );
  };

  return (
    <div className="min-vh-100 bg-light py-4">
      <div className="container">
        {/* HEADER */}
        <div className="d-flex flex-column flex-md-row justify-content-between align-items-md-center mb-4">
          <h2 className="fw-bold text-primary mb-2 mb-md-0">
            Dashboard
          </h2>
          <button onClick={handleSignout} className="btn btn-outline-danger btn-sm">
            Sign out
          </button>
        </div>

        {/* WELCOME CARD */}
        <div className="card shadow-sm border-0 rounded-4 mb-4">
          <div className="card-body d-flex flex-column flex-md-row justify-content-between align-items-md-center">
            <h5 className="mb-2 mb-md-0">
              Welcome, <strong>{userData.UserName || "User"}</strong> 👋
            </h5>
            <Link to="/add-appointment" className="btn btn-primary btn-sm">
              + Add Appointment
            </Link>
          </div>
        </div>

        {/* EMPTY STATE */}
        {appointments.length === 0 && (
          <div className="alert alert-info text-center">
            No appointments found 😊
          </div>
        )}

        {/* APPOINTMENT LIST */}
        <div className="row g-4">
          {appointments.map((app) => (
            <div className="col-12 col-md-6 col-lg-4" key={app.Appointment_Id}>
              <div className="card h-100 shadow-sm border-0 rounded-4">
                <div className="card-body d-flex flex-column">
                  <h5 className="fw-bold text-success">{app.Title}</h5>
                  <p className="text-muted small">{app.Description}</p>

                  <div className="small mb-2">
                    📅 <strong>Scheduled:</strong> {formatDateTime(app.Date)}
                  </div>
                  <div className="small text-muted">
                    Created: {formatDateTime(app.createdAt)} <br />
                    Updated: {formatDateTime(app.updatedAt)}
                  </div>

                  <div className="mt-auto pt-3 d-flex justify-content-between">
                    <button
                      onClick={() => handleDelete(app.Appointment_Id)}
                      className="btn btn-outline-danger btn-sm"
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
            </div>
          ))}
        </div>

      </div>
    </div>
  );
}
