import axios from "axios";

const instance = axios.create({
  baseURL: "https://to-do-project-react-backend.onrender.com/api",
});

export default instance;
