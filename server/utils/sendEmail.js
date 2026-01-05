// server/utils/sendEmail.js
const sgMail = require("@sendgrid/mail");
require("dotenv").config();

if (!process.env.SENDGRID_API_KEY) {
  console.error("❌ SENDGRID_API_KEY missing");
}

sgMail.setApiKey(process.env.SENDGRID_API_KEY);

/**
 * Fire-and-forget email sender (non-blocking)
 */
const sendEmail = (to, subject, html) => {
  console.log("📧 Queuing email to:", to);

  const msg = {
    to,
    from: {
  email: process.env.EMAIL_FROM,
  name: "To-Do App"
}, // must be verified in SendGrid
    subject,
    html,
  };

  // 🔥 DO NOT await — makes it fast everywhere
  sgMail
    .send(msg)
    .then(() => {
      console.log("✅ Email sent successfully!");
    })
    .catch((err) => {
      console.error(
        "❌ Email send failed:",
        err?.response?.body || err.message
      );
    });
};

module.exports = sendEmail;
