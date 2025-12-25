import axios from "axios";

const instance = axios.create({
  baseURL: "https://to-do-project-react-backend.onrender.com/api",
  withCredentials: true, // important for cookies
  headers: { "Content-Type": "application/json" }
});

export default instance;
