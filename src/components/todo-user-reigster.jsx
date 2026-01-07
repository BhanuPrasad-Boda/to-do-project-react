import React from "react";
import { useFormik } from "formik";
import axios from "../api/axiosConfig";
import { useNavigate, Link } from "react-router-dom";
import { toast } from "react-toastify";

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
      console.log("Sending values:", values);

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
    <div className="min-vh-100 d-flex align-items-center bg-light py-4">
      <div className="container">
        <div
          className="card shadow-lg rounded-4 mx-auto p-4 p-md-5"
          style={{ maxWidth: "450px" }}
        >
          <h2 className="text-center text-primary mb-4 fw-bold">User Registration</h2>

          <form onSubmit={formik.handleSubmit}>
            {/* UserId */}
            <div className="mb-3">
              <label className="form-label">User ID</label>
              <input
                type="text"
                name="UserId"
                onChange={formik.handleChange}
                value={formik.values.UserId}
                className="form-control"
                placeholder="Enter unique User ID"
                required
              />
            </div>

            {/* UserName */}
            <div className="mb-3">
              <label className="form-label">User Name</label>
              <input
                type="text"
                name="UserName"
                onChange={formik.handleChange}
                value={formik.values.UserName}
                className="form-control"
                placeholder="Enter your name"
                required
              />
            </div>

            {/* Password */}
            <div className="mb-3">
              <label className="form-label">Password</label>
              <input
                type="password"
                name="Password"
                onChange={formik.handleChange}
                value={formik.values.Password}
                className="form-control"
                placeholder="Enter password"
                required
              />
            </div>

            {/* Email */}
            <div className="mb-3">
              <label className="form-label">Email</label>
              <input
                type="email"
                name="Email"
                onChange={formik.handleChange}
                value={formik.values.Email}
                className="form-control"
                placeholder="Enter email"
                required
              />
            </div>

            {/* Mobile */}
            <div className="mb-3">
              <label className="form-label">Mobile</label>
              <input
                type="text"
                name="Mobile"
                onChange={formik.handleChange}
                value={formik.values.Mobile}
                className="form-control"
                placeholder="Enter mobile number"
                required
              />
            </div>

            {/* Submit */}
            <button type="submit" className="btn btn-success w-100 rounded-pill mb-3">
              Register
            </button>
          </form>

          {/* Links */}
          <div className="d-flex justify-content-between">
            <Link to="/login" className="text-decoration-none">
              Already have an account? Login
            </Link>
            <Link to="/" className="text-decoration-none">
              Home
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
