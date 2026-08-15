import { useEffect, useRef } from "react";
import { OtpInput } from "./OtpInput";
import { visibleDevCode } from "../utils/canShowDevOtp";

export function AuthOtpPanel({
  title = "Verify your email",
  maskedEmail,
  otp,
  onOtpChange,
  error,
  cooldown = 0,
  loading = false,
  devCode,
  verifyLabel = "Verify Email",
  onVerify,
  onResend,
  onBack,
}) {
  const submitted = useRef("");
  const shownCode = visibleDevCode(devCode);

  useEffect(() => {
    if (otp.length !== 6 || loading || submitted.current === otp) return undefined;
    submitted.current = otp;
    const timer = window.setTimeout(() => onVerify?.(), 40);
    return () => window.clearTimeout(timer);
  }, [otp, loading, onVerify]);

  const handleSubmit = (event) => {
    event.preventDefault();
    submitted.current = otp;
    onVerify?.();
  };

  return (
    <form onSubmit={handleSubmit} className="text-center">
      <h3 className="fw-bold mb-2">{title}</h3>
      <p className="text-secondary">
        Enter the 6-digit verification code sent to
        <br />
        <strong>{maskedEmail}</strong>
      </p>
      {shownCode ? (
        <p className="otp-dev-banner" role="status">
          Development mode: your code is <strong>{shownCode}</strong>
        </p>
      ) : (
        <p className="text-secondary small">The code expires in 5 minutes. Check spam if you do not see it.</p>
      )}
      <OtpInput value={otp} onChange={onOtpChange} disabled={loading} error={Boolean(error)} />
      {error && <p className="text-danger small mt-2">{error}</p>}
      <p className="otp-resend text-secondary small mt-3 mb-0">
        Didn&apos;t receive the code?{" "}
        {cooldown > 0 ? (
          <span>Resend code in {cooldown} seconds</span>
        ) : (
          <button type="button" className="btn btn-link p-0" onClick={onResend} disabled={loading}>
            Resend code
          </button>
        )}
      </p>
      <button type="submit" className="btn btn-premium w-100 mt-4" disabled={loading}>
        {loading ? "Verifying..." : verifyLabel}
      </button>
      {onBack ? (
        <button type="button" className="btn btn-link mt-2" onClick={onBack}>
          Back
        </button>
      ) : null}
    </form>
  );
}
