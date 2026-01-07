import { Link } from "react-router-dom";

export function ToDoIndex() {
  return (
    <div className="min-vh-100 d-flex align-items-center bg-light">
      <div className="container text-center">
        <div className="card shadow-lg rounded-4 p-4 p-md-5 mx-auto" style={{ maxWidth: "400px" }}>
          <h1 className="mb-4 text-primary fw-bold">Welcome to ToDo App</h1>
          <p className="mb-4 text-muted">
            Organize your appointments easily and stay on top of your schedule!
          </p>

          <div className="d-grid gap-3">
            <Link to="/register" className="btn btn-dark btn-lg rounded-pill">
              📝 New User Register
            </Link>
            <Link to="/login" className="btn btn-warning btn-lg rounded-pill">
              🔑 Existing User Login
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
