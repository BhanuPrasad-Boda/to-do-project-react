import { useState } from "react";
import axios from "../api/axiosConfig";
import { toast } from "react-toastify";
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
    <div className="userid-page">
      <div className="userid-card slide-in">
        <div className="userid-icon">🆔</div>

        <h2 className="userid-title">Forgot User ID?</h2>
        <p className="userid-subtitle">
          We’ll send your User ID to your registered email
        </p>

        <form onSubmit={handleSubmit}>
          <div className="userid-input-group">
            <input
              type="text"
              value={mobile}
              onChange={(e) => setMobile(e.target.value)}
              required
            />
            <label>Registered Mobile Number</label>
            <span className="underline"></span>
          </div>

          <button
            type="submit"
            className="userid-btn"
            disabled={loading}
          >
            {loading ? "Sending..." : "Send User ID"}
          </button>
        </form>

        <p className="userid-note">
          Make sure this mobile number is linked to your account
        </p>
      </div>
    </div>
  );
}
