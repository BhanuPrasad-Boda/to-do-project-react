import axios from "axios";

const storedUser = JSON.parse(localStorage.getItem("user"));
const token = storedUser?.token;

const axiosInstance = axios.create({
  baseURL: "https://to-do-project-react-backend.onrender.com/api",
  headers: {
    Authorization: `Bearer ${token}` // ✅ JWT sent in all requests
  }
});

export default axiosInstance;
