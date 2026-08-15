const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const path = require("path");
const fs = require("fs");
require("dotenv").config({ path: path.join(__dirname, ".env") });

const todoRoutes = require("./routes/TodoRoutes");
const appointmentRoutes = require("./routes/AppointmentRoutes");
const userRoutes = require("./routes/userRoutes");
const notificationRoutes = require("./routes/notificationRoutes");
const cookieParser = require("./middleware/cookieParser");
const { rateLimit, clientKey } = require("./middleware/rateLimiter");
const { startScheduler } = require("./jobs/scheduler");
const { runScheduledJobs } = require("./services/automationEngine");
const { assertEnv, getAllowedOrigins } = require("./utils/validateEnv");
const { isEmailReady } = require("./utils/sendEmail");

const app = express();
const isProd = process.env.NODE_ENV === "production";

if (isProd) {
  app.set("trust proxy", 1);
}

const avatarDir = path.join(__dirname, "uploads/avatars");
if (!fs.existsSync(avatarDir)) {
  fs.mkdirSync(avatarDir, { recursive: true });
}

app.disable("x-powered-by");
app.use((req, res, next) => {
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("X-Frame-Options", "DENY");
  res.setHeader("Referrer-Policy", "strict-origin-when-cross-origin");
  next();
});

app.use(express.json({ limit: "1mb" }));
app.use(cookieParser);

const allowedOrigins = getAllowedOrigins();

app.use(
  cors({
    origin: (origin, callback) => {
      if (!origin || allowedOrigins.includes(origin)) return callback(null, true);
      return callback(null, false);
    },
    credentials: true,
    allowedHeaders: ["Content-Type", "Authorization"],
  })
);

app.use((req, res, next) => {
  if (req.path === "/api/appointments/parse" || req.path === "/api/health") {
    return next();
  }
  return rateLimit({
    windowMs: 60 * 1000,
    max: 300,
    keyGenerator: (req) => `global:${clientKey(req)}`,
    message: "Too many attempts. Please wait before trying again.",
  })(req, res, next);
});

app.use("/uploads", express.static(path.join(__dirname, "uploads")));

app.use("/api/users", userRoutes);
app.use("/api/todos", todoRoutes);
app.use("/api/appointments", appointmentRoutes);
app.use("/api/notifications", notificationRoutes);

app.get("/api/health", (req, res) => {
  const mongoState = mongoose.connection.readyState;
  const mongo = mongoState === 1 ? "up" : mongoState === 2 ? "connecting" : "down";
  res.status(200).json({
    status: mongo === "up" ? "OK" : "DEGRADED",
    mongo,
    email: isEmailReady() ? "ready" : "not_ready",
  });
});

app.post("/api/jobs/tick", async (req, res) => {
  const secret = process.env.JOB_SECRET;
  if (!secret || req.headers["x-job-secret"] !== secret) {
    return res.status(401).json({ message: "Unauthorized" });
  }
  try {
    const result = await runScheduledJobs();
    res.json({ ok: true, result });
  } catch {
    res.status(500).json({ message: "Job failed" });
  }
});

app.use((err, req, res, next) => {
  console.error("Unhandled error");
  if (res.headersSent) return next(err);
  res.status(500).json({ message: "Something went wrong. Please try again." });
});

if (process.env.MONGO_URI) {
  mongoose
    .connect(process.env.MONGO_URI)
    .then(() => {
      console.log("MongoDB connected");
      startScheduler();
    })
    .catch(() => {
      console.error("MongoDB connection failed");
      if (isProd) process.exit(1);
    });
} else {
  console.warn("MONGO_URI is not set");
}

const PORT = process.env.PORT || 5000;

if (require.main === module) {
  try {
    assertEnv();
  } catch {
    process.exit(1);
  }
  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on port ${PORT}`);
  });
}

module.exports = app;
