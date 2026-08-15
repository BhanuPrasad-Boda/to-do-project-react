const { describe, it } = require("node:test");
const assert = require("node:assert/strict");
const { buildOtpClientPayload, isOtpDevMode } = require("../utils/otpDelivery");

const result = {
  delivered: false,
  otp: "847291",
  maskedEmail: "j***@mail.com",
  expiresInSeconds: 300,
  resendCooldownSeconds: 45,
};

describe("OTP delivery policy", () => {
  it("keeps the OTP step in development when email cannot be sent", () => {
    const payload = buildOtpClientPayload(result, { OTP_DEV_MODE: "true" });
    assert.equal(payload.ok, true);
    assert.equal(payload.requiresOtp, true);
    assert.equal(payload.devCode, "847291");
    assert.equal(isOtpDevMode({ OTP_DEV_MODE: "true" }), true);
  });

  it("does not skip verification in production when email fails", () => {
    const payload = buildOtpClientPayload(result, { NODE_ENV: "production" });
    assert.equal(payload.ok, false);
    assert.equal(payload.status, 503);
    assert.equal(payload.devCode, undefined);
  });

  it("uses a development code for local servers when email is unavailable", () => {
    const payload = buildOtpClientPayload(result, {});
    assert.equal(payload.ok, true);
    assert.equal(payload.devCode, "847291");
  });

  it("never returns a development code in production even if OTP_DEV_MODE is on", () => {
    const payload = buildOtpClientPayload(result, { NODE_ENV: "production", OTP_DEV_MODE: "true" });
    assert.equal(payload.ok, false);
    assert.equal(payload.status, 503);
    assert.equal(payload.devCode, undefined);
  });

  it("explains when Resend can only email the account owner", () => {
    const payload = buildOtpClientPayload(
      { ...result, emailError: "resend_own_email_only" },
      { NODE_ENV: "production" }
    );
    assert.equal(payload.ok, false);
    assert.match(payload.message, /Resend account/);
  });

  it("returns a normal OTP challenge when email is delivered", () => {
    const payload = buildOtpClientPayload({ ...result, delivered: true }, { NODE_ENV: "production" });
    assert.equal(payload.ok, true);
    assert.equal(payload.delivered, true);
    assert.equal(payload.devCode, undefined);
  });
});
