import axios from "axios";

const API_BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:8000";

/**
 * Shared Axios instance for all API requests.
 * - Sends cookies (refresh token) automatically via withCredentials: true
 * - Access token is injected via an interceptor from AuthContext
 */
const axiosInstance = axios.create({
  baseURL: API_BASE_URL,
  withCredentials: true, // Required: sends HttpOnly refresh-token cookie
  headers: {
    "Content-Type": "application/json",
  },
});

export default axiosInstance;
