import React, { useState } from "react";
import { useFormik } from "formik";
import axios from "../api/axiosConfig";
import { useNavigate, Link } from "react-router-dom";
import { jwtDecode } from "jwt-decode";
import { toast } from "react-toastify";
import "../styles/loginStyles.css" // ✅ unique CSS

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

        const { UserId, UserName, Email, token } = res.data;

        if (!token) {
          toast.error("Login failed. Token missing.");
          return;
        }

        // decode token
        const decoded = jwtDecode(token);
        localStorage.setItem("tokenExpiry", decoded.exp * 1000);

        // store user
        localStorage.setItem(
          "user",
          JSON.stringify({ UserId, UserName, Email })
        );
        localStorage.setItem("userid", UserId);
        localStorage.setItem("token", token);

        toast.success(`Welcome back, ${UserName} 👋`);
        navigate("/user-dashboard");
      } catch (err) {
        toast.error(err.response?.data?.message || "Invalid UserId or Password");
      } finally {
        setLoading(false);
      }
    },
  });

  return (
    <div className="login-page">
      <div className="login-card animate-login">
        <h2 className="login-title">User Login</h2>

        <form onSubmit={formik.handleSubmit}>
          <div className="mb-3">
            <label className="form-label">User ID</label>
            <input
              type="text"
              name="UserId"
              className="form-control login-input"
              value={formik.values.UserId}
              onChange={formik.handleChange}
              required
            />
          </div>

          <div className="mb-3">
            <label className="form-label">Password</label>
            <input
              type="password"
              name="Password"
              className="form-control login-input"
              value={formik.values.Password}
              onChange={formik.handleChange}
              required
            />
          </div>

          <button
            type="submit"
            className="btn btn-warning w-100 rounded-pill login-btn"
            disabled={loading}
          >
            {loading ? "Logging in..." : "Login"}
          </button>
        </form>

        {/* Links */}
        <div className="login-links">
          <Link to="/" className="btn btn-outline-secondary btn-sm">
            Home
          </Link>
          <Link to="/register" className="btn btn-outline-primary btn-sm">
            New User Register
          </Link>
        </div>

        {/* Forgot Section */}
        <div className="forgot-section">
          <button
            type="button"
            className="forgot-btn"
            onClick={() => setShowForgotOptions(!showForgotOptions)}
          >
            Forgot Credentials?
          </button>

          {showForgotOptions && (
            <div className="forgot-links animate-forgot">
              <Link to="/forgot-password">Forgot Password</Link>
              <Link to="/forgot-userid">Forgot UserID</Link>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
