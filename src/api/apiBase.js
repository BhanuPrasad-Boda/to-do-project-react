export const PRODUCTION_API_URL = "https://to-do-project-react-backend.onrender.com/api";
export const LOCAL_API_URL = "http://localhost:5000/api";

export function isPrivateHostname(hostname = "") {
  if (!hostname) return false;
  if (hostname === "localhost" || hostname === "127.0.0.1") return true;
  if (/^192\.168\.\d{1,3}\.\d{1,3}$/.test(hostname)) return true;
  if (/^10\.\d{1,3}\.\d{1,3}\.\d{1,3}$/.test(hostname)) return true;
  return /^172\.(1[6-9]|2\d|3[0-1])\.\d{1,3}\.\d{1,3}$/.test(hostname);
}

export function resolveApiUrl({
  envUrl = process.env.REACT_APP_API_URL,
  hostname = typeof window !== "undefined" ? window.location.hostname : "localhost",
} = {}) {
  if (envUrl) return String(envUrl).replace(/\/$/, "");
  if (isPrivateHostname(hostname) && hostname !== "localhost" && hostname !== "127.0.0.1") {
    return `http://${hostname}:5000/api`;
  }
  if (hostname && !isPrivateHostname(hostname)) {
    return PRODUCTION_API_URL;
  }
  return LOCAL_API_URL;
}

export function isLocalHostname(hostname = typeof window !== "undefined" ? window.location.hostname : "") {
  return isPrivateHostname(hostname);
}
