import { useState } from "react";
import axios from "../api/axiosConfig";
import { toast } from "react-toastify";
import "../styles/forgotPassword.css";

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
    <div className="forgot-wrapper">
      <div className="forgot-card">
        <h2 className="forgot-title">Reset Your Password</h2>
        <p className="forgot-desc">
          Enter your registered mobile number to receive a secure reset link.
        </p>

        <form onSubmit={handleSubmit}>
          <div className="input-group">
            <input
              type="text"
              value={mobile}
              onChange={(e) => setMobile(e.target.value)}
              required
            />
            <label>Mobile Number</label>
            <span className="focus-line"></span>
          </div>

          <button className="forgot-btn" disabled={loading}>
            <span>{loading ? "Sending..." : "Send Reset Link"}</span>
          </button>
        </form>
      </div>
    </div>
  );
}
