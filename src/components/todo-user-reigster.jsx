import React, { useEffect, useState } from "react";
import { useFormik } from "formik";
import axios, { apiErrorMessage } from "../api/axiosConfig";
import { useNavigate, Link } from "react-router-dom";
import { toast } from "react-toastify";
import "../styles/todoregisterStyles.css";
import "../styles/appExtras.css";
import { AuthOtpPanel } from "./AuthOtpPanel";
import { saveAuthSession } from "../utils/authSession";
import { AuthLayout } from "./AuthLayout";
import { AuthWaitCover } from "./AuthWaiter";

export function ToDoUserRegister() {
  const navigate = useNavigate();
  const [step, setStep] = useState("form");
  const [otp, setOtp] = useState("");
  const [maskedEmail, setMaskedEmail] = useState("");
  const [cooldown, setCooldown] = useState(0);
  const [loading, setLoading] = useState(false);
  const [otpError, setOtpError] = useState("");
  const [pending, setPending] = useState(null);
  const [devCode, setDevCode] = useState("");

  useEffect(() => {
    if (cooldown <= 0) return undefined;
    const timer = setInterval(() => setCooldown((s) => s - 1), 1000);
    return () => clearInterval(timer);
  }, [cooldown]);

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

  const formik = useFormik({
    initialValues: {
      UserId: "",
      UserName: "",
      Password: "",
      Email: "",
      Mobile: "",
    },
    onSubmit: async (values) => {
      const passCheck = validatePassword(values.Password);
      if (!passCheck.isValid) {
        toast.error("Password must be minimum 6 characters with letters & numbers");
        return;
      }
      setLoading(true);
      try {
        const res = await axios.post("/users/register/request-otp", values);
        setPending(values);
        setMaskedEmail(res.data.maskedEmail);
        setDevCode(res.data.devCode || "");
        setCooldown(res.data.resendCooldownSeconds || 45);
        setOtp("");
        setOtpError("");
        setStep("otp");
        toast.success(res.data.message || "Verification code sent.");
      } catch (err) {
        toast.error(apiErrorMessage(err, "Registration failed. Check unique fields."));
      } finally {
        setLoading(false);
      }
    },
  });

  const passwordStatus = validatePassword(formik.values.Password);

  const handleVerify = async () => {
    if (otp.length !== 6) {
      setOtpError("Enter the 6-digit verification code.");
      return;
    }
    if (!pending?.Email) {
      setOtpError("Start registration again so we can verify this email.");
      setStep("form");
      return;
    }
    setLoading(true);
    setOtpError("");
    try {
      const res = await axios.post("/users/register/verify-otp", {
        Email: pending.Email,
        otp,
      });
      saveAuthSession(res.data);
      toast.success("Email verified. Welcome aboard.");
      navigate("/user-dashboard");
    } catch (err) {
      const message = apiErrorMessage(err);
      setOtpError(message);
      toast.error(message);
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    if (cooldown > 0 || !pending) return;
    setLoading(true);
    try {
      const res = await axios.post("/users/register/resend-otp", pending);
      setCooldown(res.data.resendCooldownSeconds || 45);
      setDevCode(res.data.devCode || "");
      setOtp("");
      setOtpError("");
      toast.success(res.data.message || "A new code was sent.");
    } catch (err) {
      toast.error(apiErrorMessage(err, "Unable to resend code."));
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthLayout>
      <div className="glass-panel-glow auth-card animate-slide-up">
        {step === "form" ? (
          <AuthWaitCover active={loading} kind="send">
            <div className="text-center mb-4">
              <h3 className="fw-bold mb-1">Create your account</h3>
              <p className="text-secondary small mb-0">We’ll email a 6-digit code to verify you</p>
            </div>

            <form onSubmit={formik.handleSubmit} className="d-flex flex-column gap-3">
              <div className="row g-3">
                <div className="col-12 col-sm-6">
                  <div className="floating-label-group mb-0">
                    <input type="text" name="UserId" className="floating-input" placeholder="Unique ID" onChange={formik.handleChange} value={formik.values.UserId} required autoComplete="username" />
                    <label className="floating-label">User ID</label>
                  </div>
                </div>
                <div className="col-12 col-sm-6">
                  <div className="floating-label-group mb-0">
                    <input type="text" name="UserName" className="floating-input" placeholder="Your Name" onChange={formik.handleChange} value={formik.values.UserName} required autoComplete="name" />
                    <label className="floating-label">Full Name</label>
                  </div>
                </div>
              </div>

              <div className="floating-label-group">
                <input type="email" name="Email" className="floating-input" placeholder="Email Address" onChange={formik.handleChange} value={formik.values.Email} required autoComplete="email" />
                <label className="floating-label">Email Address</label>
              </div>

              <div className="floating-label-group">
                <input type="tel" name="Mobile" className="floating-input" placeholder="Mobile Number" onChange={formik.handleChange} value={formik.values.Mobile} required autoComplete="tel" />
                <label className="floating-label">Mobile Number</label>
              </div>

              <div className="floating-label-group">
                <input
                  type="password"
                  name="Password"
                  className={`floating-input ${formik.values.Password && (passwordStatus.isValid ? "border-success" : "border-warning")}`}
                  placeholder="Password"
                  onChange={formik.handleChange}
                  value={formik.values.Password}
                  required
                  autoComplete="new-password"
                />
                <label className="floating-label">Password</label>
                {formik.values.Password && !passwordStatus.isValid && (
                  <div className="text-warning small mt-1 animate-fade-in">
                    <i className="bi bi-exclamation-circle me-1"></i>
                    Must be at least 6 characters containing letters and numbers.
                  </div>
                )}
              </div>

              <button type="submit" className="btn btn-premium w-100 mt-3" disabled={loading}>
                {loading ? "Working…" : "Create Account"}
              </button>
            </form>
          </AuthWaitCover>
        ) : (
          <AuthOtpPanel
            title="Verify your email"
            maskedEmail={maskedEmail}
            otp={otp}
            onOtpChange={setOtp}
            error={otpError}
            cooldown={cooldown}
            loading={loading}
            devCode={devCode}
            onVerify={handleVerify}
            onResend={handleResend}
            onBack={() => setStep("form")}
          />
        )}

        <div className="mt-4 pt-3 border-top border-secondary-subtle auth-footer">
          <Link to="/" className="text-decoration-none text-muted small hover-primary">
            <i className="bi bi-house me-1"></i> Home
          </Link>
          <Link to="/login" className="text-decoration-none text-primary small fw-semibold">
            Login Instead
          </Link>
        </div>
      </div>
    </AuthLayout>
  );
}
