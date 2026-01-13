import React from "react";
import { useFormik } from "formik";
import axios from "../api/axiosConfig";
import { useNavigate, Link } from "react-router-dom";
import { toast } from "react-toastify";
import "../styles/todoregisterStyles.css";
import { useState } from "react";




  
export function ToDoUserRegister() {
  const navigate = useNavigate();
  
  const [passwordStrength, setPasswordStrength] = useState("");
const [passwordMessage, setPasswordMessage] = useState("");

      const checkPasswordStrength = (password) => {
  if (password.length === 0) {
    setPasswordStrength("");
    setPasswordMessage("");
    return;
  }

  if (password.length < 6) {
    setPasswordStrength("weak");
    setPasswordMessage("Minimum 6 characters required");
    return;
  }

  if (!/[A-Za-z]/.test(password)) {
    setPasswordStrength("weak");
    setPasswordMessage("Include at least one letter");
    return;
  }

  if (!/[0-9]/.test(password)) {
    setPasswordStrength("medium");
    setPasswordMessage("Add at least one number for stronger password");
    return;
  }

  setPasswordStrength("strong");
  setPasswordMessage("Strong password");
};


  const formik = useFormik({
    initialValues: {
      UserId: "",
      UserName: "",
      Password: "",
      Email: "",
      Mobile: "",
    },
    onSubmit: (values) => {
      axios
        .post("/users/register", values)
        .then((res) => {
          toast.success(res.data.message || "Registration successful");
          navigate("/login");
        })
        .catch((err) => {
          toast.error(
            err.response?.data?.message ||
              "Registration failed. Check unique fields."
          );
        });
    },
  });

  return (
    <div className="register-page">
      <div className="register-card">
        <h3>User Registration</h3>

        <form onSubmit={formik.handleSubmit}>
          <div className="mb-3 text-start">
            <label className="form-label">User ID</label>
            <input
              type="text"
              name="UserId"
              className="form-control"
              placeholder="Enter unique User ID"
              onChange={formik.handleChange}
              value={formik.values.UserId}
              required
            />
          </div>

          <div className="mb-3 text-start">
            <label className="form-label">User Name</label>
            <input
              type="text"
              name="UserName"
              className="form-control"
              placeholder="Enter your name"
              onChange={formik.handleChange}
              value={formik.values.UserName}
              required
            />
          </div>

        <div className="mb-2 text-start">
  <label className="form-label">Password</label>

  <input
    type="password"
    name="Password"
    className={`form-control register-input ${passwordStrength}`}
    value={formik.values.Password}
    placeholder="Enter your password"
    onChange={(e) => {
      formik.handleChange(e);
      checkPasswordStrength(e.target.value);
    }}
    required
  />

  {passwordMessage && (
    <small className={`strength-text ${passwordStrength}`}>
      {passwordMessage}
    </small>
  )}
</div>



          <div className="mb-3 text-start">
            <label className="form-label">Email</label>
            <input
              type="email"
              name="Email"
              className="form-control"
              placeholder="Enter email"
              onChange={formik.handleChange}
              value={formik.values.Email}
              required
            />
          </div>

          <div className="mb-3 text-start">
            <label className="form-label">Mobile</label>
            <input
              type="text"
              name="Mobile"
              className="form-control"
              placeholder="Enter mobile number"
              onChange={formik.handleChange}
              value={formik.values.Mobile}
              required
            />
          </div>

          <button type="submit" className="btn btn-success w-100">
            Register
          </button>
        </form>

        <div className="register-links">
          <Link to="/">Home</Link>
          <Link to="/login">Already have account? Login</Link>
        </div>
      </div>
    </div>
  );
}
