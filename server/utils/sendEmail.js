// server/utils/sendEmail.js
const sgMail = require("@sendgrid/mail");

// ================= SET API KEY =================
if (!process.env.SENDGRID_API_KEY) {
  throw new Error("SENDGRID_API_KEY is missing in environment variables");
}

sgMail.setApiKey(process.env.SENDGRID_API_KEY);

// ================= EMAIL SENDER =================
const sendEmail = async (to, subject, html) => {
  const msg = {
    to,
    from: {
      name: "To-Do App",
      email: process.env.EMAIL_FROM, // must be verified in SendGrid
    },
    subject,
    html,
  };

  try {
    await sgMail.send(msg);
    return true;
  } catch (error) {
    console.error(
      "SendGrid Error:",
      error?.response?.body || error.message
    );
    return false;
  }
};

module.exports = sendEmail;
