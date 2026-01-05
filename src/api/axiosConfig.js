import axios from "axios";

const api = axios.create({
  baseURL: "https://to-do-project-react-backend.onrender.com/api",
});

// 🔐 Attach token to every request
api.interceptors.request.use((config) => {
  const token = localStorage.getItem("token");
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// 🚨 Handle expired token globally
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response && error.response.status === 401) {
      // token expired
      localStorage.removeItem("token");
      localStorage.removeItem("user");

      alert("Session expired. Please login again.");

      window.location.href = "/login"; // 🔥 redirect
    }
    return Promise.reject(error);
  }
);

export default api;
