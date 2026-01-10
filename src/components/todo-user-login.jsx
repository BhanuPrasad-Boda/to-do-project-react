import React, { useState } from "react";
import { useFormik } from "formik";
import axios from "../api/axiosConfig";
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
        const { UserId, UserName, Email, token } = res.data;

        const decoded = jwtDecode(token);
        localStorage.setItem("tokenExpiry", decoded.exp * 1000);
        localStorage.setItem("user", JSON.stringify({ UserId, UserName, Email }));
        localStorage.setItem("userid", UserId);
        localStorage.setItem("token", token);

        toast.success(`Welcome back, ${UserName} 👋`);
        navigate("/user-dashboard");
      } catch (err) {
        toast.error(err.response?.data?.message || "Invalid credentials");
      } finally {
        setLoading(false);
      }
    },
  });

  return (
    <div className="login-page">
      <div className="login-card animate-login">
        <div className="login-icon">🔐</div>

        <h2 className="login-title">Welcome Back</h2>
        <p className="login-subtitle">Login to manage your tasks</p>

        <form onSubmit={formik.handleSubmit}>
          <div className="mb-2">
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

          <div className="mb-2">
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

{/* Forgot credentials */}
<div className="forgot-wrapper">
  <button
    type="button"
    className="forgot-btn"
    onClick={() => setShowForgotOptions(!showForgotOptions)}
  >
    Forgot credentials?
  </button>

  {showForgotOptions && (
    <div className="forgot-row animate-forgot">
      <Link to="/forgot-password" className="forgot-chip">
        🔑 Forgot Password
      </Link>
      <Link to="/forgot-userid" className="forgot-chip">
        🆔 Forgot UserID
      </Link>
    </div>
  )}
</div>


          <button
            type="submit"
            className="login-btn primary"
            disabled={loading}
          >
            {loading ? "Logging in..." : "Login"}
          </button>
        </form>

        <div className="login-links polished-links">
  <Link to="/" className="polish-btn home-btn">
    ⬅ Home
  </Link>
  <Link to="/register" className="polish-btn register-btn">
    register
  </Link>
</div>



      </div>
    </div>
  );
}
