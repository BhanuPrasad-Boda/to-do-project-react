import axios from "axios";

const instance = axios.create({
  baseURL: "https://duke-interpalpebral-ineluctably.ngrok-free.dev/api",
});

export default instance;
