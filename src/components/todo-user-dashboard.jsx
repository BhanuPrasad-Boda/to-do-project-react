import { useEffect, useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import axios from "../api/axiosConfig";
import { toast } from "react-toastify";
import "../styles/dashboardStyles.css"; // ✅ unique CSS

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

  // Fetch todos from backend
  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!userData.UserId || !token) {
      navigate("/login");
      return;
    }

    const fetchTodos = async () => {
      try {
        const res = await axios.get(`/appointments/${userData.UserId}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        setTodos(res.data);
      } catch (err) {
        toast.error("Failed to load todos");
        localStorage.clear();
        navigate("/login");
      }
    };

    fetchTodos();
  }, [navigate, userData.UserId]);

  // Sign out
  const handleSignout = () => {
    localStorage.clear();
    navigate("/login");
  };

  // Delete todo
  const handleDelete = (id) => {
    toast(
      ({ closeToast }) => (
        <div>
          <p className="mb-2">Delete this to-do?</p>
          <div className="d-flex justify-content-end gap-2">
            <button
              className="btn btn-danger btn-sm"
              onClick={async () => {
                try {
                  const token = localStorage.getItem("token");
                  await axios.delete(`/appointments/${id}`, {
                    headers: { Authorization: `Bearer ${token}` },
                  });
                  setTodos((prev) => prev.filter((t) => t.Appointment_Id !== id));
                  toast.success("To-do deleted");
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

  // Toggle completed status (optimistic UI)
  const handleToggleComplete = async (id) => {
    // Optimistic update
    setTodos((prev) =>
      prev.map((t) =>
        t.Appointment_Id === id ? { ...t, completed: !t.completed } : t
      )
    );

    try {
      const token = localStorage.getItem("token");
      const res = await axios.put(`/appointments/toggle-complete/${id}`, null, {
        headers: { Authorization: `Bearer ${token}` },
      });

      // Ensure DB status is synced
      setTodos((prev) =>
        prev.map((t) =>
          t.Appointment_Id === id ? { ...t, completed: res.data.completed } : t
        )
      );

      toast.success(res.data.message);
    } catch (err) {
      toast.error("Failed to update status");
      // rollback if API fails
      setTodos((prev) =>
        prev.map((t) =>
          t.Appointment_Id === id ? { ...t, completed: !t.completed } : t
        )
      );
    }
  };

  return (
    <div className="dashboard-page">
      <div className="container">

        {/* HEADER */}
        <div className="dashboard-header animate-down">
          <h2>Dashboard</h2>
          <button
            onClick={handleSignout}
            className="btn btn-outline-danger btn-sm"
          >
            Sign out
          </button>
        </div>

        {/* WELCOME */}
        <div className="welcome-card animate-up">
          <h5>
            Welcome, <span>{userData.UserName || "User"}</span> 👋
          </h5>
          <Link to="/add-appointment" className="btn btn-primary btn-sm">
            + Add To-Do
          </Link>
        </div>

        {/* EMPTY STATE */}
        {todos.length === 0 && (
          <div className="empty-state animate-fade">No to-dos found 😊</div>
        )}

        {/* TODOS LIST */}
        <div className="row g-4 mt-1">
          {todos.map((todo) => (
            <div
              className="col-12 col-md-6 col-lg-4 animate-card"
              key={todo.Appointment_Id}
            >
              <div
                className={`appointment-card ${
                  todo.completed ? "completed-card" : ""
                }`}
              >
                <h5>{todo.Title}</h5>
                <p>{todo.Description}</p>
                {/* STATUS */}
                    {!todo.completed && (
                      <p className="text-primary fw-bold">⏳ Pending</p>
                              )}

                <div className="meta">📅 {formatDateTime(todo.Date)}</div>
                <div className="timestamps">
                  Created: {formatDateTime(todo.createdAt)} <br />
                  Updated: {formatDateTime(todo.updatedAt)}
                </div>

                <div className="actions d-flex gap-2 flex-wrap">
                  <button
                    className={`btn btn-sm ${
                      todo.completed ? "btn-success" : "btn-outline-secondary"
                    }`}
                    onClick={() => handleToggleComplete(todo.Appointment_Id)}
                  >
                    {todo.completed ? "Completed ✅" : "mark as Done ✔️"}
                  </button>

                  <Link
                    to={`/edit-appointment/${todo.Appointment_Id}`}
                    className="btn btn-outline-warning btn-sm"
                  >
                    Edit
                  </Link>

                  <button
                    className="btn btn-outline-danger btn-sm"
                    onClick={() => handleDelete(todo.Appointment_Id)}
                  >
                    Delete
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>

      </div>
    </div>
  );
}
