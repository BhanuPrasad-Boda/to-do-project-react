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
  async (error) => {
    const status = error.response?.status;
    const config = error.config || {};
    const url = config.url || "";
    const isAuthRoute =
      url.includes("/users/login") ||
      url.includes("/users/register") ||
      url.includes("/forgot-password") ||
      url.includes("/forgot-userid") ||
      url.includes("/reset-password");

    if (!error.response && !config.__retried) {
      config.__retried = true;
      await new Promise((resolve) => window.setTimeout(resolve, 2000));
      return instance(config);
    }

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
      ? "Cannot reach the server. On this device, open the app from the same Wi‑Fi and keep the API running on port 5000."
      : "Cannot reach the server. The live API may still be starting. Wait a few seconds and try again.";
  }
  return error.response.data?.message || fallback;
}

export default instance;
