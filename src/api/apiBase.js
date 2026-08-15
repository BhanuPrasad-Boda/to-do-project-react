export const PRODUCTION_API_URL = "https://to-do-project-react-backend.onrender.com/api";
export const LOCAL_API_URL = "http://localhost:5000/api";

export function resolveApiUrl({
  envUrl = process.env.REACT_APP_API_URL,
  hostname = typeof window !== "undefined" ? window.location.hostname : "localhost",
} = {}) {
  if (envUrl) return String(envUrl).replace(/\/$/, "");
  if (hostname && hostname !== "localhost" && hostname !== "127.0.0.1") {
    return PRODUCTION_API_URL;
  }
  return LOCAL_API_URL;
}

export function isLocalHostname(hostname = typeof window !== "undefined" ? window.location.hostname : "") {
  return hostname === "localhost" || hostname === "127.0.0.1";
}
