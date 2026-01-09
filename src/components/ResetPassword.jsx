import { useState } from "react";
import { useParams } from "react-router-dom";
import axios from "../api/axiosConfig";
import { toast } from "react-toastify";
import "../styles/resetPassword.css";

export function ResetPassword() {
  const { token } = useParams();
  const [newPassword, setNewPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
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

        <p className="reset-info">
          Password must be at least <strong>8 characters</strong>
        </p>
      </div>
    </div>
  );
}
