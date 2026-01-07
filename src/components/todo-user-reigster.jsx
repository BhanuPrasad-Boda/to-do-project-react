import React from "react";
import { useFormik } from "formik";
import axios from "../api/axiosConfig";
import { useNavigate, Link } from "react-router-dom";
import { toast } from "react-toastify";
import "./todoregisterStyles.css"

export function ToDoUserRegister() {
  const navigate = useNavigate();

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
          if (res.status === 201) {
            toast.success(res.data.message);
            navigate("/login");
          } else {
            toast.error("Something went wrong");
          }
        })
        .catch((err) => {
          toast.error(
            err.response?.data?.message || "Registration cancelled. Check unique fields."
          );
        });
    },
  });

  return (
    <div className="register-page">
      <div className="container">
        <div className="register-card animate-card">
          <h2 className="text-center text-primary mb-4 fw-bold animate-title">
            User Registration
          </h2>

          <form onSubmit={formik.handleSubmit}>
            <div className="mb-3">
              <label className="form-label">User ID</label>
              <input
                type="text"
                name="UserId"
                onChange={formik.handleChange}
                value={formik.values.UserId}
                className="form-control animate-input"
                placeholder="Enter unique User ID"
                required
              />
            </div>

            <div className="mb-3">
              <label className="form-label">User Name</label>
              <input
                type="text"
                name="UserName"
                onChange={formik.handleChange}
                value={formik.values.UserName}
                className="form-control animate-input"
                placeholder="Enter your name"
                required
              />
            </div>

            <div className="mb-3">
              <label className="form-label">Password</label>
              <input
                type="password"
                name="Password"
                onChange={formik.handleChange}
                value={formik.values.Password}
                className="form-control animate-input"
                placeholder="Enter password"
                required
              />
            </div>

            <div className="mb-3">
              <label className="form-label">Email</label>
              <input
                type="email"
                name="Email"
                onChange={formik.handleChange}
                value={formik.values.Email}
                className="form-control animate-input"
                placeholder="Enter email"
                required
              />
            </div>

            <div className="mb-3">
              <label className="form-label">Mobile</label>
              <input
                type="text"
                name="Mobile"
                onChange={formik.handleChange}
                value={formik.values.Mobile}
                className="form-control animate-input"
                placeholder="Enter mobile number"
                required
              />
            </div>

            <button
              type="submit"
              className="btn btn-success w-100 rounded-pill animate-button"
            >
              Register
            </button>
          </form>

          <div className="d-flex justify-content-between mt-3">
           
            <Link to="/" className="btn btn-outline-secondary btn-sm animate-button">
              Home
            </Link>
             <Link to="/login" className="btn btn-outline-primary btn-sm animate-button">
              Already have an account? Login
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
