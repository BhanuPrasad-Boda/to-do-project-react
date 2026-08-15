import axios from "axios";
import { toast } from "react-toastify";
import { isLocalHostname, resolveApiUrl } from "./apiBase";

const instance = axios.create({
  baseURL: resolveApiUrl(),
  withCredentials: true,
});

instance.interceptors.request.use((config) => {
  const token = localStorage.getItem("token");
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

instance.interceptors.response.use(
  (response) => response,
  (error) => {
    const status = error.response?.status;
    const url = error.config?.url || "";
    const isAuthRoute =
      url.includes("/users/login") ||
      url.includes("/users/register") ||
      url.includes("/forgot-password") ||
      url.includes("/forgot-userid") ||
      url.includes("/reset-password");

    if (status === 401 && !isAuthRoute) {
      localStorage.clear();
      toast.error("Session expired. Please login again.");
      setTimeout(() => {
        window.location.href = "/login";
      }, 1500);
    }

    return Promise.reject(error);
  }
);

export function apiErrorMessage(error, fallback = "Something went wrong. Please try again.") {
  if (!error?.response) {
    return isLocalHostname()
      ? "Cannot reach the server. Start the API on port 5000 and try again."
      : "Cannot reach the server. Please try again in a moment.";
  }
  return error.response.data?.message || fallback;
}

export default instance;
