import React from "react";
import { useFormik } from "formik";
import axios from "../api/axiosConfig";
import { useNavigate, Link } from "react-router-dom";

export function ToDoUserRegister() {
  const navigate = useNavigate();

  const formik = useFormik({
    initialValues: {
      UserId: "",
      UserName: "",
      Password: "",
      Email: "",
      Mobile: ""
    },
    onSubmit: (values) => {
      // Send all required fields to backend
      axios.post("/users/register", values)
        .then(res => {
          alert("Registration successful! Please login.");
          navigate("/login");
        })
        .catch(err => {
          console.error(err.response?.data || err);
          alert(err.response?.data?.message || "Registration cancelled. Check unique fields.");
        });
    }
  });

  return (
    <div className="d-flex justify-content-center mt-4">
      <form className="bg-light p-3 w-50" onSubmit={formik.handleSubmit}>
        <h3>User Registration</h3>

        <dl>
          <dt>UserId</dt>
          <dd><input type="text" name="UserId" onChange={formik.handleChange} className="form-control" /></dd>

          <dt>UserName</dt>
          <dd><input type="text" name="UserName" onChange={formik.handleChange} className="form-control" /></dd>

          <dt>Password</dt>
          <dd><input type="password" name="Password" onChange={formik.handleChange} className="form-control" /></dd>

          <dt>Email</dt>
          <dd><input type="email" name="Email" onChange={formik.handleChange} className="form-control" /></dd>

          <dt>Mobile</dt>
          <dd><input type="text" name="Mobile" onChange={formik.handleChange} className="form-control" /></dd>
        </dl>

        <button type="submit" className="btn btn-success w-100">Register</button>

        <div className="mt-2 d-flex justify-content-between">
          <Link to="/login">Already have account? Login</Link>
          <Link to="/">Home</Link>
        </div>
      </form>
    </div>
  );
}
