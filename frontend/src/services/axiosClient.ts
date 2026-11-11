import axios from "axios";

const rawApiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000";

const baseURL = rawApiUrl
  .replace(/\/+$/, "")
  .replace(/\/(api\/v1|api)$/, "");

const axiosClient = axios.create({
  baseURL,
  headers: {
    "Content-Type": "application/json",
  },
});

axiosClient.interceptors.response.use(
  (response) => response,
  (error) => {
    console.error("API Error:", error.response || error.message);
    return Promise.reject(error);
  },
);

export default axiosClient;
