import axios from "axios";

const instance = axios.create({
  baseURL: "https://to-do-project-react-backend.onrender.com/api",
  headers: {
    "Content-Type": "application/json"
  }
});

// Add token to all requests
instance.interceptors.request.use(config => {
  const user = JSON.parse(localStorage.getItem("user"));
  if (user?.token) {
    config.headers.Authorization = `Bearer ${user.token}`;
  }
  return config;
});

export default instance;
