// server/utils/sendEmail.js
const { Resend } = require("resend");

// ================= SET API KEY =================
if (!process.env.RESEND_API_KEY) {
  throw new Error("RESEND_API_KEY is missing in environment variables");
}

const resend = new Resend(process.env.RESEND_API_KEY);

// ================= EMAIL SENDER =================
const sendEmail = async (to, subject, html) => {
  try {
    const response = await resend.emails.send({
      from: process.env.EMAIL_FROM || "onboarding@resend.dev",
      to,
      subject,
      html,
    });

    console.log("Email sent:", response);

    return true;
  } catch (error) {
    console.error(
      "Resend Error:",
      error.message || error
    );

    return false;
  }
};

module.exports = sendEmail;