// server/server.js
const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const path = require("path");
const fs = require("fs");
require("dotenv").config();

const todoRoutes = require("./routes/TodoRoutes");
const appointmentRoutes = require("./routes/AppointmentRoutes");
const userRoutes = require("./routes/userRoutes");

const app = express();

// ================= UPLOAD FOLDER SETUP =================
const avatarDir = path.join(__dirname, "uploads/avatars");

if (!fs.existsSync(avatarDir)) {
  fs.mkdirSync(avatarDir, { recursive: true });
}

// ================= MIDDLEWARE =================
app.use(express.json());

app.use(
  cors({
    origin: "https://to-do-project-react-one.vercel.app",
    credentials: true,
    allowedHeaders: ["Content-Type", "Authorization"],
  })
);

// Static uploads folder
app.use("/uploads", express.static(path.join(__dirname, "uploads")));

// ================= ROUTES =================
app.use("/api/users", userRoutes);
app.use("/api/todos", todoRoutes);
app.use("/api/appointments", appointmentRoutes);

// ================= HEALTH CHECK =================
app.get("/api/health", (req, res) => {
  res.status(200).json({ status: "OK" });
});

// ================= DATABASE =================
mongoose
  .connect(process.env.MONGO_URI)
  .then(() => console.log("MongoDB connected ✅"))
  .catch((err) => console.error("MongoDB error ❌", err));

// ================= SERVER START =================
const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT} 🚀`);
});
