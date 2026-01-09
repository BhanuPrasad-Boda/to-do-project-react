import { Link, useParams, useNavigate } from "react-router-dom";
import { useState, useEffect } from "react";
import axios from "../api/axiosConfig";
import { toast } from "react-toastify";
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
      .get(`/todos/single/${id}`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      .then((res) => setTodo(res.data))
      .catch(() => {
        toast.error("Failed to load To-Do");
        navigate("/user-dashboard");
      });
  }, [id, navigate]);

  const handleDeleteClick = async () => {
    try {
      const token = localStorage.getItem("token");
      await axios.delete(`/todos/${id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      toast.success("To-Do deleted");
      navigate("/user-dashboard");
    } catch {
      toast.error("Delete failed");
    }
  };

  if (!todo) return <div className="delete-loader">Loading...</div>;

  return (
    <div className="delete-page">
      <div className="delete-card animate-scale">
        <h3>Delete To-Do</h3>

        <p className="warning-text">
          Are you sure you want to delete this To-Do?
        </p>

        <div className="info-box">
          <p><strong>Title:</strong> {todo.Title}</p>
          <p><strong>Description:</strong> {todo.Description}</p>
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
