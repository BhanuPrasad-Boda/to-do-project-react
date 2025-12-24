import axios from "axios";

const instance = axios.create({
  baseURL: "https://to-do-project-react-backend.onrender.com/api",
  withCredentials: true, // send cookies along with requests
  headers: {
    "Content-Type": "application/json",
  },
});

// Optional: intercept responses to handle errors globally
instance.interceptors.response.use(
  response => response,
  error => {
    console.error("Axios error:", error.response?.data || error.message);
    return Promise.reject(error);
  }
);

export default instance;
