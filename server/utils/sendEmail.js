const { Resend } = require("resend");

function getProvider() {
  const sendgrid = process.env.SENDGRID_API_KEY || "";
  const resendKey = process.env.RESEND_API_KEY || "";
  if (resendKey.startsWith("re_")) return { type: "resend", key: resendKey };
  if (sendgrid.startsWith("SG.")) return { type: "sendgrid", key: sendgrid };
  if (resendKey.startsWith("SG.")) return { type: "sendgrid", key: resendKey };
  if (sendgrid) return { type: "sendgrid", key: sendgrid };
  if (resendKey) return { type: "resend", key: resendKey };
  return { type: "none", key: "" };
}

function fromAddress() {
  return process.env.EMAIL_FROM || "onboarding@resend.dev";
}

let resend = null;

function getResend() {
  const { type, key } = getProvider();
  if (type !== "resend" || !key) return null;
  if (!resend) resend = new Resend(key);
  return resend;
}

const sendEmail = async (to, subject, html) => {
  if (!to || !subject) return false;

  const { type, key } = getProvider();
  const from = fromAddress();

  if (type === "none") {
    console.warn("Email skipped: no SendGrid or Resend API key configured");
    return false;
  }

  if (type === "sendgrid" && /resend\.dev/i.test(from)) {
    console.warn("Email skipped: SendGrid key is set, but EMAIL_FROM is a Resend address. Set EMAIL_FROM to a verified SendGrid sender.");
    return false;
  }

  try {
    if (type === "sendgrid") {
      const sgMail = require("@sendgrid/mail");
      sgMail.setApiKey(key);
      await sgMail.send({ to, from, subject, html });
      return true;
    }

    const client = getResend();
    if (!client) return false;
    await client.emails.send({ from, to, subject, html });
    return true;
  } catch (error) {
    console.error("Email delivery failed");
    return false;
  }
};

function isEmailReady() {
  const { type } = getProvider();
  const from = fromAddress();
  if (type === "none" || !from) return false;
  if (type === "sendgrid" && /resend\.dev/i.test(from)) return false;
  return type === "sendgrid" || type === "resend";
}

module.exports = sendEmail;
module.exports.isEmailConfigured = () => getProvider().type !== "none";
module.exports.isEmailReady = isEmailReady;
