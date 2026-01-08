import { useState } from "react";
import axios from "../api/axiosConfig";
import { toast } from "react-toastify";
import "../styles/forgotPassword.css"; // ✅ unique CSS

export function ForgotPassword() {
  const [mobile, setMobile] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await axios.post("/users/forgot-password", {
        Mobile: mobile,
      });
      toast.success(res.data.message);
      setMobile("");
    } catch (err) {
      toast.error(err.response?.data?.message || "Something went wrong");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="forgot-page">
      <div className="forgot-card animate-fade">
        <h2 className="forgot-title">Forgot Password</h2>
        <p className="forgot-subtitle">
          Enter your registered mobile number.  
          We’ll send a reset link to your email.
        </p>

        <form onSubmit={handleSubmit}>
          <label className="forgot-label">Mobile Number</label>
          <input
            type="text"
            placeholder="Enter mobile number"
            value={mobile}
            onChange={(e) => setMobile(e.target.value)}
            className="forgot-input"
            required
          />

          <button className="forgot-btn" disabled={loading}>
            {loading ? "Sending..." : "Send Reset Link"}
          </button>
        </form>
      </div>
    </div>
  );
}
