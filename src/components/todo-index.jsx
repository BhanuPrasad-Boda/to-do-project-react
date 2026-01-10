import { Link } from "react-router-dom";
import "../styles/todoIndex.css";

export function ToDoIndex() {
  return (
    <div className="todo-index-page">
      <div className="todo-card">
        <h1 className="todo-title">Welcome to To-Do App</h1>
        <p className="todo-subtitle">
          Organize your appointments and never miss a schedule.
        </p>

        <div className="todo-actions">
          <Link to="/register" className="todo-btn primary">
            New User Register
          </Link>

          <Link to="/login" className="todo-btn secondary">
            Existing User Login
          </Link>
        </div>
      </div>
    </div>
  );
}
