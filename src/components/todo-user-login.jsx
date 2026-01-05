import React, { useState } from "react";
import { useFormik } from "formik";
import axios from "../api/axiosConfig";
import { useNavigate, Link } from "react-router-dom";
import jwtDecode from "jwt-decode";


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
        console.log("Login response:", res.data);

        const { UserId, UserName, Email, token } = res.data;

        if (!token) {
          alert("Login failed: Token missing from server response");
          setLoading(false);
          return;
        }
        

// decode token
const decoded = jwtDecode(token);

// save expiry time (milliseconds)
localStorage.setItem("tokenExpiry", decoded.exp * 1000);

localStorage.setItem(
  "user",
  JSON.stringify({ UserId, UserName, Email })
);
localStorage.setItem("token", token);

navigate("/user-dashboard");


     // Store user info and JWT in localStorage
localStorage.setItem(
  "user",
  JSON.stringify({ UserId, UserName, Email })
);
localStorage.setItem("userid", UserId); // <-- ADD THIS LINE
localStorage.setItem("token", token);


        navigate("/user-dashboard");
      } catch (err) {
        console.error(err.response?.data || err);
        alert(err.response?.data?.message || "Invalid UserId or Password");
      } finally {
        setLoading(false);
      }
    },
  });

  return (
    <div className="text-start d-flex justify-content-center">
      <form className="bg-light p-3 mt-4 w-50" onSubmit={formik.handleSubmit}>
        <h3>User Login</h3>

        <dl>
          <dt>UserId</dt>
          <dd>
            <input
              type="text"
              name="UserId"
              onChange={formik.handleChange}
              value={formik.values.UserId}
              className="form-control"
              required
            />
          </dd>

          <dt>Password</dt>
          <dd>
            <input
              type="password"
              name="Password"
              onChange={formik.handleChange}
              value={formik.values.Password}
              className="form-control"
              required
            />
          </dd>
        </dl>

        <button
          type="submit"
          className="btn btn-warning w-100"
          disabled={loading}
        >
          {loading ? "Logging in..." : "Login"}
        </button>

        <div className="mt-2 d-flex justify-content-between">
          <Link to="/">Home</Link>
          <Link to="/register">New User Register</Link>
        </div>

        <div className="mt-2">
          <button
            type="button"
            className="btn btn-link p-0"
            onClick={() => setShowForgotOptions(!showForgotOptions)}
          >
            Forgot?
          </button>

          {showForgotOptions && (
            <div className="mt-1">
              <Link to="/forgot-password" className="d-block">
                Forgot Password
              </Link>
              <Link to="/forgot-userid" className="d-block">
                Forgot UserID
              </Link>
            </div>
          )}
        </div>
      </form>
    </div>
  );
}
