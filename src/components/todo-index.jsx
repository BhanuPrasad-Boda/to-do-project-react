import { Link } from "react-router-dom";
import "../styles/todoIndex.css";

export function ToDoIndex() {
  return (
    <div className="todo-index-page">
      <div className="todo-card">
        {/* Icon */}
        <div className="todo-icon">📝</div>

        <h1 className="todo-title">To-Do App</h1>
        <p className="todo-subtitle">
          Organize your tasks, track progress, and stay productive every day.
        </p>

        <div className="todo-divider"></div>

        <div className="todo-actions">
          <Link to="/register" className="todo-btn primary">
            Create Account
          </Link>

          <Link to="/login" className="todo-btn secondary">
            Login to Continue
          </Link>
        </div>
      </div>
    </div>
  );
}
