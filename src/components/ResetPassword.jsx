import { useState } from "react";
import { useParams } from "react-router-dom";
import axios from "../api/axiosConfig";
import { toast } from "react-toastify";
import "../styles/resetPassword.css";

export function ResetPassword() {
  const { token } = useParams();

  const [newPassword, setNewPassword] = useState("");
  const [loading, setLoading] = useState(false);

  // ================= SAME PASSWORD VALIDATION AS REGISTER =================
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

  const passwordStatus = validatePassword(newPassword);

  // ================= SUBMIT =================
  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!passwordStatus.isValid) {
      toast.error("Password must be minimum 6 characters with letters & numbers");
      return;
    }

    setLoading(true);

    try {
      const res = await axios.post(
        `/users/reset-password/${token}`,
        { newPassword }
      );

      toast.success(res.data.message);
      setNewPassword("");

    } catch (err) {
      toast.error(err.response?.data?.message || "Server error");

    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="reset-page">
      <div className="reset-card animate-card">

        <h2 className="reset-title">Reset Password</h2>

        <p className="reset-subtitle">
          Create a strong new password to secure your account
        </p>

        <form onSubmit={handleSubmit}>

          {/* PASSWORD FIELD */}
          <div className="reset-input-group">

            <input
              type="password"
              className={`reset-input ${
                passwordStatus.isValid
                  ? "password-valid"
                  : newPassword
                  ? "password-warning"
                  : ""
              }`}
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              required
            />

            <label>New Password</label>
            <span className="focus-bar"></span>

            {/* RULES DISPLAY */}
  

          </div>
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

          <button
            type="submit"
            className="reset-btn"
            disabled={loading}
          >
            {loading ? "Resetting..." : "Reset Password"}
          </button>

        </form>

      </div>
    </div>
  );
}
