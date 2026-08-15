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
  onVerify,
  onResend,
  onBack,
}) {
  const submitted = useRef("");
  const onVerifyRef = useRef(onVerify);
  const shownCode = visibleDevCode(devCode);
  onVerifyRef.current = onVerify;

  useEffect(() => {
    if (error) submitted.current = "";
  }, [error]);

  useEffect(() => {
    if (otp.length !== 6 || loading || submitted.current === otp) return undefined;
    submitted.current = otp;
    const timer = window.setTimeout(() => onVerifyRef.current?.(), 180);
    return () => window.clearTimeout(timer);
  }, [otp, loading]);

  const handleSubmit = (event) => {
    event.preventDefault();
    if (otp.length !== 6 || loading) return;
    submitted.current = otp;
    onVerifyRef.current?.();
  };

  return (
    <form onSubmit={handleSubmit} className="text-center otp-chamber">
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
      <p className="otp-auto-hint text-secondary small mt-3 mb-0">
        {loading ? "Verifying your code…" : "Verifies automatically after the 6th digit."}
      </p>
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
      <button type="submit" className="otp-hidden-submit" disabled={loading || otp.length !== 6}>
        Verify
      </button>
      {onBack ? (
        <button type="button" className="btn btn-link mt-2" onClick={onBack} disabled={loading}>
          Back
        </button>
      ) : null}
    </form>
  );
}
