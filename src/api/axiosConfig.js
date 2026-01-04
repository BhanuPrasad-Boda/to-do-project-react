import axios from "axios";

const instance = axios.create({
  baseURL: "https://to-do-project-react-backend.onrender.com/api",
  headers: {
    "Content-Type": "application/json",
  },
});

// Add token automatically to protected routes
instance.interceptors.request.use((config) => {
  const token = localStorage.getItem("token");
  if (token) {
    config.headers["Authorization"] = `Bearer ${token}`;
  }
  return config;
});

export default instance;
