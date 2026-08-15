const { describe, it } = require("node:test");
const assert = require("node:assert/strict");
const { resendAccepted } = require("../utils/sendEmail");

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
