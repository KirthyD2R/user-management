import client from "./client";
import { ApiResponse, App } from "../types";

export const listApps = async (isActive?: boolean): Promise<ApiResponse<App[]>> => {
  const params = isActive !== undefined ? { isActive } : {};
  const response = await client.get("/api/apps", { params });
  return response.data;
};

export const getApp = async (slug: string): Promise<ApiResponse<App>> => {
  const response = await client.get(`/api/apps/${slug}`);
  return response.data;
};

export const createApp = async (data: Partial<App>): Promise<ApiResponse<App>> => {
  const response = await client.post("/api/apps", data);
  return response.data;
};

export const updateApp = async (slug: string, data: Partial<App>): Promise<ApiResponse<App>> => {
  const response = await client.patch(`/api/apps/${slug}`, data);
  return response.data;
};
