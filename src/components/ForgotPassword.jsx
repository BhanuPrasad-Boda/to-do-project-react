import { useState } from "react";
import axios from "../api/axiosConfig";

export function ForgotPassword() {
  const [mobile, setMobile] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const res = await axios.post("/users/forgot-password", { Mobile: mobile });
      alert(res.data.message);
    } catch (err) {
      alert(err.response?.data?.message || "Error");
    }
  };

  return (
    <div className="text-start d-flex justify-content-center">
      <form className="bg-light p-3 mt-4" onSubmit={handleSubmit}>
        <h3>Forgot Password</h3>
        <dl>
          <dt>Mobile Number</dt>
          <dd>
            <input
              type="text"
              value={mobile}
              onChange={(e) => setMobile(e.target.value)}
              className="form-control"
              required
            />
          </dd>
        </dl>
        <button className="btn btn-warning w-100">Send Reset Link</button>
      </form>
    </div>
  );
}
