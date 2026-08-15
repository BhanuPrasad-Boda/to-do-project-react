function escapeHtml(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function maskEmail(email) {
  if (!email || !email.includes("@")) return "***";
  const [local, domain] = String(email).split("@");
  const visible = local.slice(0, 1);
  return `${visible}***@${domain}`;
}

module.exports = { escapeHtml, maskEmail };
