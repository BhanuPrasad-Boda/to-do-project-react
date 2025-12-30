const nodemailer = require("nodemailer");

const transporter = nodemailer.createTransport({
  host: "smtp.gmail.com",
  port: 465,
  secure: true,
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS
  },
  pool: true,        // reuse connections (faster)
  maxConnections: 5,
  maxMessages: 100
});

// Verify transporter once at startup (not every email)
transporter.verify((err) => {
  if (err) {
    console.error("❌ Email transporter error:", err.message);
  } else {
    console.log("✅ Email transporter ready");
  }
});

const sendEmail = (to, subject, html) => {
  Promise.resolve()
    .then(async () => {
      console.log("📧 Sending email to:", to);

      await transporter.sendMail({
        from: `"ToDo App" <${process.env.EMAIL_USER}>`,
        to,
        subject,
        html
      });

      console.log("✅ Email sent successfully");
    })
    .catch(err => {
      console.error("❌ Email send failed FULL:", err);
    });
};


module.exports = sendEmail;
