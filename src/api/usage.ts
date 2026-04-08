import client from "./client";
import { ApiResponse, UsageRecord } from "../types";

export const incrementUsage = async (data: {
  orgId: string;
  appSlug: string;
  usageKey: string;
  incrementBy: number;
}): Promise<ApiResponse<UsageRecord>> => {
  const response = await client.post("/api/usage/increment", data);
  return response.data;
};

export const getOrgUsage = async (
  orgId: string,
  appSlug?: string,
  period?: string
): Promise<ApiResponse<UsageRecord[]>> => {
  const params: Record<string, string> = {};
  if (appSlug) params.appSlug = appSlug;
  if (period) params.period = period;
  const response = await client.get(`/api/usage/org/${orgId}`, { params });
  return response.data;
};

export const checkAndIncrement = async (data: {
  orgId: string;
  appSlug: string;
  usageKey: string;
  incrementBy: number;
}): Promise<ApiResponse<UsageRecord>> => {
  const response = await client.post("/api/usage/check-and-increment", data);
  return response.data;
};

export const resetUsage = async (data: {
  orgId: string;
  appSlug: string;
  usageKey: string;
}): Promise<ApiResponse<null>> => {
  const response = await client.post("/api/usage/reset", data);
  return response.data;
};
