import React, { useState } from "react";
import { useFormik } from "formik";
import axios, { apiErrorMessage } from "../api/axiosConfig";
import { useNavigate, Link } from "react-router-dom";
import { jwtDecode } from "jwt-decode";
import { toast } from "react-toastify";
import "../styles/loginStyles.css";

export function ToDoUserLogin() {
  const [showForgotOptions, setShowForgotOptions] = useState(false);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const formik = useFormik({
    initialValues: { UserId: "", Password: "" },

    onSubmit: async (values) => {
      setLoading(true);
      try {
        const res = await axios.post("/users/login", values);
        const { UserId, UserName, Email, Avatar, token } = res.data;

        const decoded = jwtDecode(token);
        localStorage.setItem("tokenExpiry", decoded.exp * 1000);
        localStorage.setItem("user", JSON.stringify({ UserId, UserName, Email, Avatar }));
        localStorage.setItem("userid", UserId);
        localStorage.setItem("token", token);

        toast.success(`Welcome! ${UserName} 👋`);
        navigate("/user-dashboard");
      } catch (err) {
        toast.error(apiErrorMessage(err, "Invalid credentials"));
      } finally {
        setLoading(false);
      }
    },
  });

  return (
    <div className="auth-shell position-relative" style={{ background: "var(--bg-primary)" }}>
      <div className="position-absolute top-0 start-0 w-100 h-100" style={{ zIndex: 0, opacity: 0.5, overflow: "clip", pointerEvents: "none" }}>
        <div className="position-absolute bg-primary rounded-circle blur-circle" style={{ width: "300px", height: "300px", top: "10%", left: "10%", filter: "blur(60px)" }}></div>
        <div className="position-absolute bg-warning rounded-circle blur-circle" style={{ width: "250px", height: "250px", bottom: "10%", right: "10%", filter: "blur(60px)" }}></div>
      </div>

      <div className="glass-panel-glow auth-card animate-slide-up position-relative" style={{ zIndex: 1 }}>
        <div className="text-center mb-4">
          <div className="display-4 mb-2 animate-fade-in">🔐</div>
          <h2 className="fw-bold mb-1">Welcome Back!</h2>
          <p className="text-secondary small">Login to manage your tasks</p>
        </div>

        <form onSubmit={formik.handleSubmit} className="d-flex flex-column gap-3">
          <div className="floating-label-group">
            <input
              type="text"
              name="UserId"
              className="floating-input"
              placeholder="User ID"
              value={formik.values.UserId}
              onChange={formik.handleChange}
              required
            />
            <label className="floating-label">User ID</label>
          </div>

          <div className="floating-label-group">
            <input
              type="password"
              name="Password"
              className="floating-input"
              placeholder="Password"
              value={formik.values.Password}
              onChange={formik.handleChange}
              required
            />
            <label className="floating-label">Password</label>
          </div>

          <div className="mt-1 text-center">
            {!showForgotOptions ? (
              <button
                type="button"
                className="btn btn-link text-decoration-none p-0 text-muted small"
                onClick={() => setShowForgotOptions(true)}
              >
                Forgot credentials?
              </button>
            ) : (
              <div className="d-flex flex-wrap justify-content-center gap-2 animate-fade-in">
                <Link to="/forgot-userid" className="btn btn-sm btn-outline-secondary rounded-pill">
                  🆔 UserID
                </Link>
                <Link to="/forgot-password" className="btn btn-sm btn-outline-secondary rounded-pill">
                  🔑 Password
                </Link>
              </div>
            )}
          </div>

          <button
            type="submit"
            className="btn btn-premium w-100 mt-3"
            disabled={loading}
          >
            {loading ? (
              <><span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>Logging in...</>
            ) : (
              "Login"
            )}
          </button>
        </form>

        <div className="mt-4 pt-3 border-top border-secondary-subtle auth-footer">
          <Link to="/" className="text-decoration-none text-muted small hover-primary">
            <i className="bi bi-arrow-left me-1"></i> Home
          </Link>
          <Link to="/register" className="text-decoration-none text-primary small fw-semibold">
            Create Account
          </Link>
        </div>
      </div>
    </div>
  );
}
