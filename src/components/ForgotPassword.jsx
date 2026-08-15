import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import axios, { apiErrorMessage } from "../api/axiosConfig";
import { toast } from "react-toastify";
import "../styles/forgotPassword.css";
import "../styles/appExtras.css";
import { AuthOtpPanel } from "./AuthOtpPanel";
import { AuthLayout } from "./AuthLayout";
import { AuthWaitCover } from "./AuthWaiter";

export function ForgotPassword() {
  const navigate = useNavigate();
  const [step, setStep] = useState("email");
  const [email, setEmail] = useState("");
  const [otp, setOtp] = useState("");
  const [maskedEmail, setMaskedEmail] = useState("");
  const [devCode, setDevCode] = useState("");
  const [resetToken, setResetToken] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [cooldown, setCooldown] = useState(0);
  const [otpError, setOtpError] = useState("");

  useEffect(() => {
    if (cooldown <= 0) return undefined;
    const timer = setInterval(() => setCooldown((s) => s - 1), 1000);
    return () => clearInterval(timer);
  }, [cooldown]);

  const validatePassword = (password) => {
    const hasLetter = /[A-Za-z]/.test(password);
    const hasNumber = /[0-9]/.test(password);
    const hasLength = password.length >= 6;
    return hasLetter && hasNumber && hasLength;
  };

  const applyOtpChallenge = (data) => {
    setMaskedEmail(data.maskedEmail);
    setDevCode(data.devCode || "");
    setCooldown(data.resendCooldownSeconds || 45);
    setOtp("");
    setOtpError("");
    setStep("otp");
  };

  const requestCode = async (event) => {
    event?.preventDefault?.();
    setLoading(true);
    try {
      const res = await axios.post("/users/forgot-password/request-otp", { Email: email });
      applyOtpChallenge(res.data);
      toast.success(res.data.message);
    } catch (err) {
      toast.error(apiErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  const resendCode = async () => {
    if (cooldown > 0 || !email) return;
    setLoading(true);
    try {
      const res = await axios.post("/users/forgot-password/resend-otp", { Email: email });
      applyOtpChallenge(res.data);
      toast.success(res.data.message || "A new code was sent.");
    } catch (err) {
      toast.error(apiErrorMessage(err, "Unable to resend code."));
    } finally {
      setLoading(false);
    }
  };

  const verifyCode = async () => {
    if (otp.length !== 6) {
      setOtpError("Enter the 6-digit verification code.");
      return;
    }
    setLoading(true);
    setOtpError("");
    try {
      const res = await axios.post("/users/forgot-password/verify-otp", { Email: email, otp });
      setResetToken(res.data.resetToken);
      setStep("password");
      toast.success("Code verified. Choose a new password.");
    } catch (err) {
      const message = apiErrorMessage(err);
      setOtp("");
      setOtpError(message);
      toast.error(message);
    } finally {
      setLoading(false);
    }
  };

  const savePassword = async (event) => {
    event.preventDefault();
    if (newPassword !== confirmPassword) {
      toast.error("Passwords do not match");
      return;
    }
    if (!validatePassword(newPassword)) {
      toast.error("Password must be minimum 6 characters with letters & numbers");
      return;
    }
    setLoading(true);
    try {
      await axios.post("/users/reset-password", {
        resetToken,
        newPassword,
        confirmPassword,
      });
      setStep("done");
      toast.success("Password updated.");
    } catch (err) {
      toast.error(apiErrorMessage(err, "Reset failed"));
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthLayout>
      <div className="forgot-card glass-panel-glow auth-card">
        {step === "email" && (
          <AuthWaitCover active={loading} kind="send">
            <h2 className="forgot-title">Forgot Password</h2>
            <p className="forgot-desc">Enter your registered email to receive a 6-digit verification code.</p>
            <form onSubmit={requestCode}>
              <div className="floating-label-group">
                <input className="floating-input" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required autoComplete="email" placeholder="Email" />
                <label className="floating-label">Email</label>
              </div>
              <button className="btn btn-premium w-100" disabled={loading}>
                {loading ? "Working…" : "Send verification code"}
              </button>
            </form>
          </AuthWaitCover>
        )}

        {step === "otp" && (
          <AuthOtpPanel
            title="Verify OTP"
            maskedEmail={maskedEmail}
            otp={otp}
            onOtpChange={(value) => {
              setOtp(value);
              if (value) setOtpError("");
            }}
            error={otpError}
            cooldown={cooldown}
            loading={loading}
            devCode={devCode}
            onVerify={verifyCode}
            onResend={resendCode}
            onBack={() => setStep("email")}
          />
        )}

        {step === "password" && (
          <AuthWaitCover active={loading} kind="login">
          <form onSubmit={savePassword}>
            <h2 className="forgot-title">Create New Password</h2>
            <p className="forgot-desc">Use at least 6 characters with letters and numbers.</p>
            <div className="floating-label-group">
              <input className="floating-input" type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} required autoComplete="new-password" placeholder="New password" />
              <label className="floating-label">New Password</label>
            </div>
            <div className="floating-label-group">
              <input className="floating-input" type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} required autoComplete="new-password" placeholder="Confirm password" />
              <label className="floating-label">Confirm Password</label>
            </div>
            <button className="btn btn-premium w-100" disabled={loading}>{loading ? "Working…" : "Update Password"}</button>
          </form>
          </AuthWaitCover>
        )}

        {step === "done" && (
          <div className="text-center">
            <h2 className="forgot-title">Password Updated</h2>
            <p className="forgot-desc">You can now log in with your new password.</p>
            <button className="btn btn-premium w-100" onClick={() => navigate("/login")}>Login</button>
          </div>
        )}

        <div className="mt-3 text-center">
          <Link to="/login" className="small text-primary">Back to login</Link>
        </div>
      </div>
    </AuthLayout>
  );
}
