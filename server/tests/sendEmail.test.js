const { describe, it } = require("node:test");
const assert = require("node:assert/strict");
const { resendAccepted, getProvider, sendgridErrorCode } = require("../utils/sendEmail");

describe("Resend response handling", () => {
  it("does not treat a Resend error payload as delivered", () => {
    assert.equal(
      resendAccepted({
        data: null,
        error: { message: "You can only send testing emails to your own email address (you@example.com)." },
      }),
      false
    );
  });

  it("accepts a successful Resend send", () => {
    assert.equal(resendAccepted({ data: { id: "49a3999c-aaaa" }, error: null }), true);
  });
});

describe("email provider selection", () => {
  it("uses SendGrid when EMAIL_PROVIDER is sendgrid", () => {
    const provider = getProvider({
      EMAIL_PROVIDER: "sendgrid",
      SENDGRID_API_KEY: "SG.live",
      RESEND_API_KEY: "re_old",
    });
    assert.equal(provider.type, "sendgrid");
    assert.equal(provider.key, "SG.live");
  });

  it("prefers a SendGrid key over a leftover Resend key", () => {
    const provider = getProvider({
      SENDGRID_API_KEY: "SG.live",
      RESEND_API_KEY: "re_old",
    });
    assert.equal(provider.type, "sendgrid");
  });

  it("flags an unverified SendGrid sender", () => {
    assert.equal(
      sendgridErrorCode({
        response: { body: { errors: [{ message: "The from address does not match a verified Sender Identity." }] } },
      }),
      "sendgrid_sender_unverified"
    );
  });
});
