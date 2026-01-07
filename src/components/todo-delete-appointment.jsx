import { Link, useParams, useNavigate } from "react-router-dom";
import { useState, useEffect } from "react";
import axios from "../api/axiosConfig";
import { toast } from "react-toastify";
import  "../styles/deleteAppointment.css" // ✅ unique css

export function ToDoDeleteAppointment() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [appointment, setAppointment] = useState(null);

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) {
      navigate("/login");
      return;
    }

    axios
      .get(`/appointments/single/${id}`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      .then((res) => setAppointment(res.data))
      .catch((err) => {
        toast.error(err.response?.data?.message || "Failed to load appointment");
        navigate("/user-dashboard");
      });
  }, [id, navigate]);

  const handleDeleteClick = async () => {
    try {
      const token = localStorage.getItem("token");
      await axios.delete(`/appointments/${id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      toast.success("Appointment deleted");
      navigate("/user-dashboard");
    } catch (err) {
      toast.error(err.response?.data?.message || "Delete failed");
    }
  };

  if (!appointment) {
    return <div className="delete-loader">Loading...</div>;
  }

  return (
    <div className="delete-page">
      <div className="delete-card animate-scale">
        <h3>Delete Appointment</h3>

        <p className="warning-text">
          Are you sure you want to delete this appointment?
        </p>

        <div className="info-box">
          <p><strong>Title:</strong> {appointment.Title}</p>
          <p><strong>Description:</strong> {appointment.Description}</p>
        </div>

        <div className="btn-group">
          <button onClick={handleDeleteClick} className="btn-delete">
            Yes, Delete
          </button>
          <Link to="/user-dashboard" className="btn-cancel">
            Cancel
          </Link>
        </div>
      </div>
    </div>
  );
}
