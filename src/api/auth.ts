import client from "./client";
import { ApiResponse, LoginResponse } from "../types";

// Forgot/reset password are served by the in-process password-reset API
// (server/src, mounted in vite.config) at the SAME origin. All other auth calls
// stay on dream-platform-api. Override with VITE_AUTH_API_BASE_URL only if the
// reset API is hosted separately; otherwise it's relative to this origin.
const AUTH_BASE = (import.meta.env.VITE_AUTH_API_BASE_URL as string) || '/';
const authOpts = { baseURL: AUTH_BASE };

export const login = async (email: string, password: string): Promise<ApiResponse<LoginResponse>> => {
  const response = await client.post("/api/auth/login", { email, password });
  return response.data;
};

export const register = async (data: {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  orgName: string;
  orgSlug: string;
  appSlug: string;
  gstin: string;
  pan: string;
  currency: string;
  financialYearStart: string;
  timezone: string;
}): Promise<ApiResponse<LoginResponse>> => {
  const response = await client.post("/api/auth/register", data);
  return response.data;
};

export const refreshToken = async (refreshToken: string): Promise<ApiResponse<{ accessToken: string; refreshToken: string }>> => {
  const response = await client.post("/api/auth/refresh", { refreshToken });
  return response.data;
};

export const verifyEmail = async (token: string): Promise<ApiResponse<null>> => {
  const response = await client.post("/api/auth/verify-email", { token });
  return response.data;
};

export const forgotPassword = async (email: string): Promise<ApiResponse<null>> => {
  const response = await client.post("/api/auth/forgot-password", { email }, authOpts);
  return response.data;
};

export const resetPassword = async (token: string, newPassword: string): Promise<ApiResponse<null>> => {
  const response = await client.post("/api/auth/reset-password", { token, newPassword }, authOpts);
  return response.data;
};

export const logout = async (): Promise<ApiResponse<null>> => {
  const response = await client.post("/api/auth/logout");
  return response.data;
};
