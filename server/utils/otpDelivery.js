function isOtpDevMode(env = process.env) {
  if (env.OTP_DEV_MODE === "false") return false;
  if (env.OTP_DEV_MODE === "true") return true;
  return env.NODE_ENV !== "production";
}

function buildOtpClientPayload(result, env = process.env) {
  const base = {
    requiresOtp: true,
    maskedEmail: result.maskedEmail,
    expiresInSeconds: result.expiresInSeconds,
    resendCooldownSeconds: result.resendCooldownSeconds,
  };

  if (result.delivered) {
    return {
      ok: true,
      ...base,
      delivered: true,
      message: "Verification code sent. Check your inbox or spam folder.",
    };
  }

  if (isOtpDevMode(env) && env.NODE_ENV !== "production") {
    return {
      ok: true,
      ...base,
      delivered: false,
      devMode: true,
      devCode: result.otp,
      message: "Email is not configured. Use the development verification code.",
    };
  }

  const testingOnly = result.emailError === "resend_own_email_only";
  return {
    ok: false,
    status: 503,
    message: testingOnly
      ? "Resend can only email the address on your Resend account until you verify a domain. Register with that email, or add a domain at resend.com/domains."
      : "Unable to send verification email. Please try again later.",
  };
}

module.exports = { isOtpDevMode, buildOtpClientPayload };
