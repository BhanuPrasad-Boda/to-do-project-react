const { describe, it } = require("node:test");
const assert = require("node:assert/strict");
const { emailLooksReady, getAllowedOrigins, isLanDevOrigin, validateEnv } = require("../utils/validateEnv");

describe("production environment checks", () => {
  it("blocks a production boot without secrets or a live client URL", () => {
    const result = validateEnv({
      NODE_ENV: "production",
      OTP_DEV_MODE: "true",
      JWT_SECRET: "change-this-to-a-long-random-string",
    });
    assert.equal(result.ok, false);
    assert.ok(result.fatal.some((item) => item.includes("MONGO_URI")));
    assert.ok(result.fatal.some((item) => item.includes("JWT_SECRET")));
    assert.ok(result.fatal.some((item) => item.includes("CLIENT_URL")));
    assert.ok(result.fatal.some((item) => item.includes("OTP_DEV_MODE")));
  });

  it("accepts a complete production configuration", () => {
    const result = validateEnv({
      NODE_ENV: "production",
      MONGO_URI: "mongodb+srv://user:pass@cluster/app",
      JWT_SECRET: "a-sufficiently-long-random-secret",
      CLIENT_URL: "https://app.example.com",
      SENDGRID_API_KEY: "SG.xxxxx",
      EMAIL_FROM: "TaskFlow <noreply@example.com>",
    });
    assert.equal(result.ok, true);
    assert.equal(
      emailLooksReady({
        SENDGRID_API_KEY: "SG.xxxxx",
        EMAIL_FROM: "TaskFlow <noreply@example.com>",
      }),
      true
    );
  });

  it("prefers SendGrid when both keys exist, so a Resend from-address is not ready", () => {
    assert.equal(
      emailLooksReady({
        SENDGRID_API_KEY: "SG.xxxxx",
        RESEND_API_KEY: "re_xxxxx",
        EMAIL_FROM: "onboarding@resend.dev",
      }),
      false
    );
  });

  it("keeps Resend when EMAIL_PROVIDER is resend", () => {
    assert.equal(
      emailLooksReady({
        EMAIL_PROVIDER: "resend",
        SENDGRID_API_KEY: "SG.xxxxx",
        RESEND_API_KEY: "re_xxxxx",
        EMAIL_FROM: "onboarding@resend.dev",
      }),
      true
    );
  });

  it("treats SendGrid plus a Gmail from-address as ready", () => {
    assert.equal(
      emailLooksReady({
        EMAIL_PROVIDER: "sendgrid",
        SENDGRID_API_KEY: "SG.xxxxx",
        EMAIL_FROM: "TaskFlow <you@gmail.com>",
      }),
      true
    );
  });

  it("rejects a SendGrid key paired with a Resend from-address", () => {
    assert.equal(
      emailLooksReady({
        SENDGRID_API_KEY: "SG.xxxxx",
        EMAIL_FROM: "onboarding@resend.dev",
      }),
      false
    );
  });

  it("does not allow localhost CORS origins in production", () => {
    const origins = getAllowedOrigins({
      NODE_ENV: "production",
      CLIENT_URL: "https://app.example.com",
    });
    assert.deepEqual(origins, ["https://app.example.com"]);
    assert.equal(origins.some((item) => item.includes("localhost")), false);
  });

  it("allows a phone on the same Wi-Fi during local development", () => {
    assert.equal(isLanDevOrigin("http://192.168.1.24:3000"), true);
    assert.equal(isLanDevOrigin("https://to-do-project-react-one.vercel.app"), false);
  });
});
