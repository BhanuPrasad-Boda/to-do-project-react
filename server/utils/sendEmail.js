const { Resend } = require("resend");

function getProvider(env = process.env) {
  const forced = String(env.EMAIL_PROVIDER || "").trim().toLowerCase();
  const sendgrid = env.SENDGRID_API_KEY || "";
  const resendKey = env.RESEND_API_KEY || "";

  if (forced === "sendgrid") {
    return sendgrid ? { type: "sendgrid", key: sendgrid } : { type: "none", key: "" };
  }
  if (forced === "resend") {
    return resendKey ? { type: "resend", key: resendKey } : { type: "none", key: "" };
  }

  if (sendgrid.startsWith("SG.")) return { type: "sendgrid", key: sendgrid };
  if (resendKey.startsWith("re_")) return { type: "resend", key: resendKey };
  if (resendKey.startsWith("SG.")) return { type: "sendgrid", key: resendKey };
  if (sendgrid) return { type: "sendgrid", key: sendgrid };
  if (resendKey) return { type: "resend", key: resendKey };
  return { type: "none", key: "" };
}

function fromAddress() {
  return process.env.EMAIL_FROM || "onboarding@resend.dev";
}

let resend = null;
let lastEmailError = "";

function getLastEmailError() {
  return lastEmailError;
}

function resendAccepted(result) {
  if (!result || result.error) return false;
  return Boolean(result.data && result.data.id);
}

function getResend() {
  const { type, key } = getProvider();
  if (type !== "resend" || !key) return null;
  if (!resend) resend = new Resend(key);
  return resend;
}

const sendEmail = async (to, subject, html) => {
  lastEmailError = "";
  if (!to || !subject) return false;

  const { type, key } = getProvider();
  const from = fromAddress();

  if (type === "none") {
    lastEmailError = "no_provider";
    console.warn("Email skipped: no SendGrid or Resend API key configured");
    return false;
  }

  if (type === "sendgrid" && /resend\.dev/i.test(from)) {
    lastEmailError = "sendgrid_resend_from";
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
    const result = await client.emails.send({ from, to, subject, html });
    if (!resendAccepted(result)) {
      const detail = result?.error?.message || result?.error?.error || "";
      lastEmailError = /own email address/i.test(detail) ? "resend_own_email_only" : "resend_rejected";
      console.error("Email delivery failed");
      return false;
    }
    return true;
  } catch (error) {
    lastEmailError = type === "sendgrid" ? sendgridErrorCode(error) : "email_exception";
    console.error("Email delivery failed");
    return false;
  }
};

function sendgridErrorCode(error) {
  const text = JSON.stringify(error?.response?.body || error?.message || "");
  if (/verified Sender Identity|from address does not match|does not match a verified Sender/i.test(text)) {
    return "sendgrid_sender_unverified";
  }
  if (/maximum credits|exceeded the allowable/i.test(text)) return "sendgrid_quota";
  return "sendgrid_rejected";
}

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
module.exports.resendAccepted = resendAccepted;
module.exports.getLastEmailError = getLastEmailError;
module.exports.getProvider = getProvider;
module.exports.sendgridErrorCode = sendgridErrorCode;
