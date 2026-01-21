import React from "react";
import { useFormik } from "formik";
import axios from "../api/axiosConfig";
import { useNavigate, Link } from "react-router-dom";
import { toast } from "react-toastify";
import "../styles/todoregisterStyles.css";

export function ToDoUserRegister() {
  const navigate = useNavigate();

  // ================= PASSWORD VALIDATION FUNCTION =================
  const validatePassword = (password) => {
    const hasLetter = /[A-Za-z]/.test(password);
    const hasNumber = /[0-9]/.test(password);
    const hasLength = password.length >= 6;

    return {
      hasLetter,
      hasNumber,
      hasLength,
      isValid: hasLetter && hasNumber && hasLength,
    };
  };

  // ================= FORMIK =================
  const formik = useFormik({
    initialValues: {
      UserId: "",
      UserName: "",
      Password: "",
      Email: "",
      Mobile: "",
    },

    onSubmit: (values) => {
      const passCheck = validatePassword(values.Password);

      // Block submit if password invalid
      if (!passCheck.isValid) {
        toast.error("Password must be minimum 6 characters with letters & numbers");
        return;
      }

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

  // ================= PASSWORD STATUS =================
  const passwordStatus = validatePassword(formik.values.Password);

  return (
    <div className="register-page">
      <div className="register-card">
        <h3>User Registration</h3>

        <form onSubmit={formik.handleSubmit}>

          {/* USER ID */}
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

          {/* USER NAME */}
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

          {/* PASSWORD */}
          <div className="mb-3 text-start">
            <label className="form-label">Password</label>

            <input
              type="password"
              name="Password"
              className={`form-control register-input ${
                passwordStatus.isValid
                  ? "passwords-valid"
                  : formik.values.Password
                  ? "passwords-warning"
                  : ""
              }`}
              placeholder="Min 6 chars, letters & numbers"
              onChange={formik.handleChange}
              value={formik.values.Password}
              required
            />

            {/* RULES DISPLAY */}
            <div className="password-rules">
              <span className={passwordStatus.hasLength ? "okk" : "er"}>
                • Minimum 6 characters
              </span>

              <span className={passwordStatus.hasLetter ? "okk" : "er"}>
                • At least one alphabet
              </span>

              <span className={passwordStatus.hasNumber ? "okk" : "er"}>
                • At least one number
              </span>
            </div>
          </div>

          {/* EMAIL */}
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

          {/* MOBILE */}
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

          {/* SUBMIT BUTTON */}
          <button type="submit" className="btn btn-success w-100">
            Register
          </button>
        </form>

        {/* LINKS */}
        <div className="register-links">
          <Link to="/">Home</Link>
          <Link to="/login">Already have account? Login</Link>
        </div>
      </div>
    </div>
  );
}
