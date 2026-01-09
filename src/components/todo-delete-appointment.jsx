import { useEffect, useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import axios from "../api/axiosConfig";
import { toast } from "react-toastify";
import "../styles/dashboardStyles.css";

export function ToDoUserDashBoard() {
  const [todos, setTodos] = useState([]);
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

    const fetchTodos = async () => {
      try {
        const res = await axios.get(`/todos/${userData.UserId}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        setTodos(res.data);
      } catch {
        toast.error("Failed to load To-Dos");
        localStorage.clear();
        navigate("/login");
      }
    };

    fetchTodos();
  }, [navigate, userData.UserId]);

  const handleSignout = () => {
    localStorage.clear();
    navigate("/login");
  };

  const handleDelete = (id) => {
    toast(
      ({ closeToast }) => (
        <div>
          <p className="mb-2">Delete this To-Do?</p>
          <div className="d-flex justify-content-end gap-2">
            <button
              className="btn btn-danger btn-sm"
              onClick={async () => {
                try {
                  const token = localStorage.getItem("token");
                  await axios.delete(`/todos/${id}`, {
                    headers: { Authorization: `Bearer ${token}` },
                  });
                  setTodos((prev) => prev.filter((t) => t.Appointment_Id !== id));
                  toast.success("To-Do deleted");
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

        <div className="dashboard-header animate-down">
          <h2>Dashboard</h2>
          <button onClick={handleSignout} className="btn btn-outline-danger btn-sm">
            Sign out
          </button>
        </div>

        <div className="welcome-card animate-up">
          <h5>
            Welcome, <span>{userData.UserName || "User"}</span> 👋
          </h5>
          <Link to="/add-todo" className="btn btn-success btn-sm">
            + Add To-Do
          </Link>
        </div>

        {todos.length === 0 && (
          <div className="empty-state animate-fade">No To-Dos found 😊</div>
        )}

        <div className="row g-4 mt-1">
          {todos.map((todo) => (
            <div
              className="col-12 col-md-6 col-lg-4 animate-card"
              key={todo.Appointment_Id}
            >
              <div className="todo-card">
                <h5>{todo.Title}</h5>
                <p>{todo.Description}</p>
                <div className="meta">
                  📅 {formatDateTime(todo.Date)}
                </div>
                <div className="timestamps">
                  Created: {formatDateTime(todo.createdAt)} <br />
                  Updated: {formatDateTime(todo.updatedAt)}
                </div>
                <div className="actions">
                  <button
                    className="btn btn-outline-danger btn-sm"
                    onClick={() => handleDelete(todo.Appointment_Id)}
                  >
                    Delete
                  </button>
                  <Link
                    to={`/edit-todo/${todo.Appointment_Id}`}
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
