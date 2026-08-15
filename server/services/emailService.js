const sendEmail = require("../utils/sendEmail");
const { escapeHtml } = require("../utils/html");

function wrap(title, body) {
  return `
    <div style="font-family:Arial,sans-serif;padding:24px;max-width:560px;margin:0 auto;color:#1e293b;">
      <h2 style="margin:0 0 12px;">${escapeHtml(title)}</h2>
      ${body}
      <p style="margin-top:24px;color:#64748b;font-size:13px;">TaskFlow · ToDo App</p>
    </div>
  `;
}

async function sendOtpEmail(to, name) {
  const html = wrap("Verify your email", `
    <p>Hello ${escapeHtml(name || "there")},</p>
    <p>Use the 6-digit verification code we generated for your account. It expires in 5 minutes.</p>
    <p>If you did not request this, you can ignore this email.</p>
  `);
  return sendEmail(to, "Your verification code - TaskFlow", html);
}

async function sendOtpCodeEmail(to, name, otp) {
  const html = wrap("Your verification code", `
    <p>Hello ${escapeHtml(name || "there")},</p>
    <p>Your 6-digit verification code is:</p>
    <p style="font-size:28px;letter-spacing:8px;font-weight:700;">${escapeHtml(otp)}</p>
    <p>This code expires in 5 minutes and can be used only once.</p>
  `);
  return sendEmail(to, "Your verification code - TaskFlow", html);
}

async function sendPasswordResetOtpEmail(to, name, otp) {
  const html = wrap("Reset your password", `
    <p>Hello ${escapeHtml(name || "there")},</p>
    <p>Use this code to reset your password:</p>
    <p style="font-size:28px;letter-spacing:8px;font-weight:700;">${escapeHtml(otp)}</p>
    <p>This code expires in 5 minutes. If you did not request a reset, please secure your account.</p>
  `);
  return sendEmail(to, "Password reset code - TaskFlow", html);
}

async function sendNotificationEmail(to, title, body) {
  const html = wrap(title, `<p>${escapeHtml(body)}</p>`);
  return sendEmail(to, title, html);
}

module.exports = {
  sendOtpEmail,
  sendOtpCodeEmail,
  sendPasswordResetOtpEmail,
  sendNotificationEmail,
};
