// server/server.js
const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const path = require("path");
require("dotenv").config();

console.log("SENDGRID KEY EXISTS:", !!process.env.SENDGRID_API_KEY);
console.log("SENDGRID KEY PREFIX:", process.env.SENDGRID_API_KEY?.slice(0, 10));
console.log("EMAIL_FROM:", process.env.EMAIL_FROM);


const sendEmail = require("./utils/sendEmail");
const todoRoutes = require("./routes/TodoRoutes");
const appointmentRoutes = require("./routes/AppointmentRoutes");
const userRoutes = require("./routes/userRoutes");

const app = express();

// Middleware

app.use(express.json());
app.use(cors({
  origin: "https://to-do-project-react-one.vercel.app",
  credentials: true,
    allowedHeaders: ["Content-Type", "Authorization"],
}));
  app.use("/uploads", express.static(path.join(__dirname, "uploads")));

// VERY IMPORTANT
app.use((req, res, next) => {
  res.header("Access-Control-Allow-Origin", "https://to-do-project-react-one.vercel.app");
  res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept, Authorization");
  res.header("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS");

  if (req.method === "OPTIONS") {
    return res.sendStatus(200);
  }

  next();
});









app.use("/api/users", userRoutes);
app.use("/api/todos", todoRoutes);
app.use("/api/appointments", appointmentRoutes);
app.use(express.static(path.join(__dirname, "public")));

// MongoDB connection
mongoose
  .connect(process.env.MONGO_URI)
  .then(() => console.log("MongoDB connected ✅"))
  .catch((err) => console.error("MongoDB error ❌", err));

// Test route
app.get("/", (req, res) => res.send("Backend is running 🚀"));
app.get("/api/health", (req, res) => {
  res.status(200).json({ status: "OK" });
});


// Server start
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));

setTimeout(async () => {
  try {
    await sendEmail(
      "sivabhanuboda@gmail.com",
      "🔥 SendGrid Final Test",
      "<h2>Hello If you receive this, SendGrid works perfectly 🎉</h2>"
    );
    console.log("✅ Startup test email triggered");
  } catch (err) {
    console.error("❌ Startup email error:", err.message);
  }
}, 1000); // optional delay of 1 second


// Optional test email
// sendEmail("yourpersonalemail@gmail.com", "Test Email", "<h1>Hello!</h1>");
