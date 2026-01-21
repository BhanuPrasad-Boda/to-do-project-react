import { useState } from "react";
import { useParams } from "react-router-dom";
import axios from "../api/axiosConfig";
import { toast } from "react-toastify";
import "../styles/resetPassword.css";

export function ResetPassword() {
  const { token } = useParams();

  const [newPassword, setNewPassword] = useState("");
  const [loading, setLoading] = useState(false);

  // ✅ Password rules (same standard as register)
  const validatePassword = (password) => {
    const minLength = password.length >= 8;
    const hasUpper = /[A-Z]/.test(password);
    const hasLower = /[a-z]/.test(password);
    const hasNumber = /[0-9]/.test(password);
    const hasSpecial = /[!@#$%^&*(),.?":{}|<>]/.test(password);

    if (!minLength) return "Password must be at least 8 characters";
    if (!hasUpper) return "Password must contain at least one uppercase letter";
    if (!hasLower) return "Password must contain at least one lowercase letter";
    if (!hasNumber) return "Password must contain at least one number";
    if (!hasSpecial) return "Password must contain at least one special character";

    return null;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    // ✅ Validate password before API call
    const error = validatePassword(newPassword);

    if (error) {
      toast.error(error);
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

          <div className="reset-input-group">
            <input
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              required
            />
            <label>New Password</label>
            <span className="focus-bar"></span>
          </div>

          <button
            type="submit"
            className="reset-btn"
            disabled={loading}
          >
            {loading ? "Resetting..." : "Reset Password"}
          </button>

        </form>

        {/* ✅ Password rules UI info */}
        <p className="reset-info">
          Password must contain:
          <br />• Minimum <strong>8 characters</strong>
          <br />• <strong>Uppercase</strong> letter
          <br />• <strong>Lowercase</strong> letter
          <br />• <strong>Number</strong>
          <br />• <strong>Special character</strong>
        </p>

      </div>
    </div>
  );
}
