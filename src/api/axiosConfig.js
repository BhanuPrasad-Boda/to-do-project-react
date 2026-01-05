import axios from "axios";
import { toast } from "react-toastify";

const instance = axios.create({
  baseURL: "https://to-do-project-react-backend.onrender.com/api"
});

instance.interceptors.response.use(
  response => response,
  error => {
    const status = error.response?.status;
    const url = error.config?.url;

    // 🔴 DO NOT auto-logout for login failures
    if (status === 401 && !url.includes("/users/login")) {
      localStorage.clear();
      toast.error("Session expired. Please login again.");

      setTimeout(() => {
        window.location.href = "/login";
      }, 1500);
    }

    return Promise.reject(error);
  }
);

export default instance;
