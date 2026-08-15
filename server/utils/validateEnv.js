const { getProvider } = require("./sendEmail");

function emailLooksReady(env = process.env) {
  const from = env.EMAIL_FROM || "";
  const { type } = getProvider(env);
  if (!from || type === "none") return false;
  if (type === "sendgrid" && /resend\.dev/i.test(from)) return false;
  return type === "sendgrid" || type === "resend";
}

function getAllowedOrigins(env = process.env) {
  const fromEnv = [env.CLIENT_URL, env.ADDITIONAL_ORIGINS]
    .filter(Boolean)
    .flatMap((value) => String(value).split(","))
    .map((value) => value.trim().replace(/\/$/, ""))
    .filter(Boolean);

  if (env.NODE_ENV === "production") {
    return [...new Set(fromEnv.length ? fromEnv : ["https://to-do-project-react-one.vercel.app"])];
  }

  return [
    ...new Set([
      "http://localhost:3000",
      "http://localhost:3001",
      "http://127.0.0.1:3000",
      "http://127.0.0.1:3001",
      "https://to-do-project-react-one.vercel.app",
      ...fromEnv,
    ]),
  ];
}

function validateEnv(env = process.env) {
  const fatal = [];
  const issues = [];
  const isProd = env.NODE_ENV === "production";
  const weakJwt = !env.JWT_SECRET || env.JWT_SECRET === "change-this-to-a-long-random-string" || env.JWT_SECRET.length < 16;

  if (!env.MONGO_URI) (isProd ? fatal : issues).push("MONGO_URI is not set");
  if (weakJwt) (isProd ? fatal : issues).push("JWT_SECRET must be a long random string");
  if (isProd && !env.CLIENT_URL) fatal.push("CLIENT_URL must be the live frontend origin, for example https://your-app.vercel.app");
  if (isProd && env.OTP_DEV_MODE === "true") fatal.push("OTP_DEV_MODE cannot be true in production");
  if (isProd && !emailLooksReady(env)) {
    issues.push("Email is not production-ready. Set a verified EMAIL_FROM with SendGrid or Resend.");
  }
  if (isProd && /resend\.dev/i.test(env.EMAIL_FROM || "")) {
    issues.push("EMAIL_FROM uses resend.dev. Use a verified domain sender in production.");
  }

  return { ok: fatal.length === 0, fatal, issues };
}

function assertEnv(env = process.env) {
  const result = validateEnv(env);
  result.issues.forEach((item) => console.warn(item));
  if (!result.ok) {
    result.fatal.forEach((item) => console.error(item));
    const error = new Error("Invalid production environment");
    error.details = result;
    throw error;
  }
  return result;
}

module.exports = { emailLooksReady, getAllowedOrigins, validateEnv, assertEnv };
