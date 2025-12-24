require("dotenv").config();
const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const todoRoutes = require("./routes/TodoRoutes");
const appointmentRoutes = require("./routes/AppointmentRoutes");
const userRoutes = require("./routes/userRoutes");
const path = require("path");






const app = express();

// Middleware
app.use(cors({
  origin: process.env.CLIENT_URL, // only allow frontend
}));

app.use(express.json());
app.use("/api/todos", todoRoutes);
app.use(express.static(path.join(__dirname, "public")));
app.use("/api/users", userRoutes);
app.use("/api/appointments", appointmentRoutes);


// MongoDB Connection
mongoose
  .connect(process.env.MONGO_URI)
  .then(() => console.log("MongoDB connected ✅"))
  .catch((err) => console.error("MongoDB error ❌", err));

// Test route
app.get("/", (req, res) => {
  res.send("Backend is running 🚀");
});

// Server start
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
