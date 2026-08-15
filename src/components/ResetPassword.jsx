import { useState } from "react";
import { Link, useParams } from "react-router-dom";
import axios from "../api/axiosConfig";
import { toast } from "react-toastify";
import { AuthLayout } from "./AuthLayout";
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
    <AuthLayout>
      <div className="reset-card glass-panel-glow auth-card">
        <h2 className="reset-title">Reset password</h2>
        <p className="reset-subtitle">
          Use at least 6 characters with letters and numbers
        </p>
        <form onSubmit={handleSubmit}>
          <div className="floating-label-group">
            <input
              type="password"
              className="floating-input"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              required
              placeholder="New password"
              autoComplete="new-password"
            />
            <label className="floating-label">New password</label>
          </div>
          {newPassword && !passwordStatus.isValid && (
            <p className="text-warning small">Must include letters and numbers.</p>
          )}
          <button type="submit" className="btn btn-premium w-100" disabled={loading}>
            {loading ? "Resetting..." : "Reset password"}
          </button>
        </form>
        <Link to="/login" className="btn btn-outline-secondary w-100 mt-3">
          Back to login
        </Link>
      </div>
    </AuthLayout>
  );
}
