import { Link, useParams, useNavigate } from "react-router-dom";
import { useState, useEffect } from "react";
import axios from "../api/axiosConfig";
import { toast } from "react-toastify";
import { AuthLayout } from "./AuthLayout";
import "../styles/deleteAppointment.css";

export function ToDoDeleteAppointment() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [todo, setTodo] = useState(null);

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) {
      navigate("/login");
      return;
    }

    axios
      .get(`/appointments/single/${id}`)
      .then((res) => setTodo(res.data))
      .catch(() => {
        toast.error("Failed to load To-Do");
        navigate("/user-dashboard");
      });
  }, [id, navigate]);

  const handleDeleteClick = async () => {
    try {
      await axios.delete(`/appointments/${id}`);
      toast.success("To-Do deleted");
      navigate("/user-dashboard");
    } catch {
      toast.error("Delete failed");
    }
  };

  if (!todo) {
    return (
      <AuthLayout>
        <p className="text-secondary mb-0">Loading...</p>
      </AuthLayout>
    );
  }

  return (
    <AuthLayout>
      <div className="delete-card glass-panel-glow auth-card">
        <h3>Delete task</h3>
        <p className="warning-text">This cannot be undone.</p>
        <div className="info-box">
          <p><strong>Title:</strong> {todo.Title}</p>
          <p><strong>Description:</strong> {todo.Description || "—"}</p>
        </div>
        <div className="form-actions">
          <Link to="/user-dashboard" className="btn btn-outline-secondary">
            Cancel
          </Link>
          <button onClick={handleDeleteClick} className="btn btn-delete">
            Delete
          </button>
        </div>
      </div>
    </AuthLayout>
  );
}
