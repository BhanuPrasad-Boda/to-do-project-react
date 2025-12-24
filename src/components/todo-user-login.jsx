import React, { useState } from "react";
import { useFormik } from "formik";
import axios from "../api/axiosConfig";
import { useCookies } from "react-cookie";
import { useNavigate, Link } from "react-router-dom";

export function ToDoUserLogin() {
  const [cookies, setCookie] = useCookies(['userid', 'username']);
  const [showForgotOptions, setShowForgotOptions] = useState(false);
  const navigate = useNavigate();

  const formik = useFormik({
    initialValues: { UserId: "", Password: "" },
    onSubmit: (values) => {
      axios.post("/users/login", values)
        .then(res => {
          const { UserId, UserName } = res.data;
          setCookie("userid", UserId, { path: "/" });
          setCookie("username", UserName, { path: "/" });
          navigate("/user-dashboard");
        })
        .catch(err => {
          console.error(err.response?.data || err);
          alert("Invalid UserId or Password");
        });
    }
  });

  return (
    <div className="text-start d-flex justify-content-center">
      <form className="bg-light p-3 mt-4 w-50" onSubmit={formik.handleSubmit}>
        <h3>User Login</h3>

        <dl>
          <dt>UserId</dt>
          <dd><input type="text" name="UserId" onChange={formik.handleChange} className="form-control" /></dd>

          <dt>Password</dt>
          <dd><input type="password" name="Password" onChange={formik.handleChange} className="form-control" /></dd>
        </dl>

        <button type="submit" className="btn btn-warning w-100">Login</button>

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
              <Link to="/forgot-password" className="d-block">Forgot Password</Link>
              <Link to="/forgot-userid" className="d-block">Forgot UserID</Link>
            </div>
          )}
        </div>
      </form>
    </div>
  );
}
