import axios from "axios";
import { toast } from "../components/Toast";
import { getErrorMessage } from "./helpers";

// Auth endpoints handle their own 401s (bad credentials, expired reset token,
// etc.) — they must NOT trigger the session-refresh/redirect flow.
const isAuthEndpoint = (url?: string) =>
  /\/api\/auth\/(login|register|forgot-password|reset-password|refresh)/.test(url || "");

const clearAuthStorage = () => {
  localStorage.removeItem("accessToken");
  localStorage.removeItem("refreshToken");
  localStorage.removeItem("user");
};

const client = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || "https://dream-platform-api.vercel.app",
  headers: {
    "Content-Type": "application/json",
  },
});

client.interceptors.request.use((config) => {
  const apiKey = import.meta.env.VITE_API_KEY;
  const appId = import.meta.env.VITE_APP_ID || "books";
  const accessToken = localStorage.getItem("accessToken");

  if (apiKey) {
    config.headers["X-API-Key"] = apiKey;
  }
  config.headers["X-App-Id"] = appId;

  if (accessToken) {
    config.headers["Authorization"] = `Bearer ${accessToken}`;
  }

  return config;
});

client.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config || {};
    const status = error.response?.status;

    // Session-expiry handling: only for authenticated (non-auth) endpoints.
    if (status === 401 && !originalRequest._retry && !isAuthEndpoint(originalRequest.url)) {
      originalRequest._retry = true;

      const refreshToken = localStorage.getItem("refreshToken");

      if (refreshToken) {
        try {
          const response = await axios.post(
            `${client.defaults.baseURL}/api/auth/refresh`,
            { refreshToken },
            {
              headers: {
                "Content-Type": "application/json",
                "X-API-Key": import.meta.env.VITE_API_KEY || "",
                "X-App-Id": import.meta.env.VITE_APP_ID || "books",
              },
            }
          );

          const { accessToken, refreshToken: newRefreshToken } = response.data.data;
          localStorage.setItem("accessToken", accessToken);
          localStorage.setItem("refreshToken", newRefreshToken);

          originalRequest.headers["Authorization"] = `Bearer ${accessToken}`;
          return client(originalRequest); // retry; success surfaces no error
        } catch {
          clearAuthStorage();
          toast("Your session has expired. Please sign in again.", "error");
          window.location.href = "/login";
          return Promise.reject(error);
        }
      } else {
        clearAuthStorage();
        toast("Your session has expired. Please sign in again.", "error");
        window.location.href = "/login";
        return Promise.reject(error);
      }
    }

    // Surface every other failure as a popup with the server's message.
    toast(getErrorMessage(error), "error");
    return Promise.reject(error);
  }
);

export default client;
