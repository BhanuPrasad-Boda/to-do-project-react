import React, { useState } from "react";
import { useFormik } from "formik";
import axios, { apiErrorMessage } from "../api/axiosConfig";
import { useNavigate, Link } from "react-router-dom";
import { jwtDecode } from "jwt-decode";
import { toast } from "react-toastify";
import { saveAuthSession } from "../utils/authSession";
import { AuthLayout } from "./AuthLayout";
import { AuthWaitCover } from "./AuthWaiter";
import "../styles/loginStyles.css";

function loginErrorMessage(error) {
  return apiErrorMessage(error, "Invalid credentials");
}

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
        saveAuthSession({ UserId, UserName, Email, Avatar, token });

        toast.success(`Welcome! ${UserName} 👋`);
        navigate("/user-dashboard");
      } catch (err) {
        toast.error(loginErrorMessage(err));
      } finally {
        setLoading(false);
      }
    },
  });

  return (
    <AuthLayout>
      <div className="glass-panel-glow auth-card animate-slide-up">
        <AuthWaitCover active={loading} kind="login">
        <div className="text-center mb-4">
          <h2 className="fw-bold mb-1">Welcome back</h2>
          <p className="text-secondary small mb-0">Sign in to pick up your tasks</p>
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
            {loading ? "Working…" : "Login"}
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
        </AuthWaitCover>
      </div>
    </AuthLayout>
  );
}
