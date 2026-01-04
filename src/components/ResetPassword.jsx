import { useState } from "react";
import { useParams } from "react-router-dom";
import axios from "../api/axiosConfig";

export function ResetPassword() {
  const { token } = useParams();
  const [newPassword, setNewPassword] = useState("");

const handleSubmit = async (e) => {
  e.preventDefault();
  try {
    const res = await axios.post(
      `/users/reset-password/${token}`,
      { newPassword }
    );
    alert(res.data.message); // Password reset successful
  } catch (err) {
    console.error(err);
    alert(err.response?.data?.message || "Server error");
  }
};


  return (
    <div className="text-start d-flex justify-content-center">
      <form className="bg-light p-3 mt-4" onSubmit={handleSubmit}>
        <h3>Reset Password</h3>
        <dl>
          <dt>New Password</dt>
          <dd>
            <input
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              className="form-control"
              required
            />
          </dd>
        </dl>
        <button className="btn btn-warning w-100">Reset Password</button>
      </form>
    </div>
  );
}
