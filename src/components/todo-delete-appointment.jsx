import { Link, useParams, useNavigate } from "react-router-dom";
import { useState, useEffect } from "react";
import axios from "../api/axiosConfig";

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
        headers: {
          Authorization: `Bearer ${token}`,
        },
      })
      .then((res) => {
        setAppointment(res.data);
      })
      .catch((err) => {
        alert(err.response?.data?.message || "Failed to load appointment");
        navigate("/user-dashboard");
      });
  }, [id, navigate]);

  const handleDeleteClick = async () => {
    const token = localStorage.getItem("token");

    try {
      await axios.delete(`/appointments/${id}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      navigate("/user-dashboard");
    } catch (err) {
      alert(err.response?.data?.message || "Delete failed");
    }
  };

  if (!appointment) {
    return <p className="text-center mt-4">Loading...</p>;
  }

  return (
    <div className="bg-light mt-3 w-25 text-start p-2">
      <h3>Delete Appointment</h3>
      <dl>
        <dt>Title</dt>
        <dd>{appointment.Title}</dd>
        <dt>Description</dt>
        <dd>{appointment.Description}</dd>
      </dl>
      <button onClick={handleDeleteClick} className="btn btn-danger me-2">
        Yes
      </button>
      <Link className="btn btn-warning" to="/user-dashboard">
        No
      </Link>
    </div>
  );
}
