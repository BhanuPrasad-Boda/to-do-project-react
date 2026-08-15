import { useState } from "react";
import { Link } from "react-router-dom";
import axios from "../api/axiosConfig";
import { toast } from "react-toastify";
import { AuthLayout } from "./AuthLayout";
import "../styles/forgotUserId.css";

export function ForgotUserId() {
  const [mobile, setMobile] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      const res = await axios.post("/users/forgot-userid", { Mobile: mobile });
      toast.success(res.data.message);
      setMobile("");
    } catch (err) {
      toast.error(err.response?.data?.message || "Error");
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthLayout>
      <div className="userid-card glass-panel-glow auth-card">
        <h2 className="userid-title">Forgot User ID?</h2>
        <p className="userid-subtitle">
          We’ll send your User ID to your registered email
        </p>

        <form onSubmit={handleSubmit}>
          <div className="floating-label-group">
            <input
              className="floating-input"
              type="text"
              value={mobile}
              onChange={(e) => setMobile(e.target.value)}
              required
              placeholder="Mobile"
              autoComplete="tel"
            />
            <label className="floating-label">Registered mobile number</label>
          </div>

          <button type="submit" className="btn btn-premium w-100" disabled={loading}>
            {loading ? "Sending..." : "Send User ID"}
          </button>
        </form>

        <p className="userid-note">
          Use the mobile number linked to your account
        </p>
        <Link to="/login" className="btn btn-outline-secondary w-100 mt-3">
          Back to login
        </Link>
      </div>
    </AuthLayout>
  );
}
