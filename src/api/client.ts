import axios from "axios";

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
    const originalRequest = error.config;

    if (error.response?.status === 401 && !originalRequest._retry) {
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
          return client(originalRequest);
        } catch {
          localStorage.removeItem("accessToken");
          localStorage.removeItem("refreshToken");
          localStorage.removeItem("user");
          window.location.href = "/login";
          return Promise.reject(error);
        }
      } else {
        localStorage.removeItem("accessToken");
        localStorage.removeItem("refreshToken");
        localStorage.removeItem("user");
        window.location.href = "/login";
      }
    }

    return Promise.reject(error);
  }
);

export default client;
