import client from "./client";
import { ApiResponse, Subscription } from "../types";

export const createSubscription = async (data: Partial<Subscription>): Promise<ApiResponse<Subscription>> => {
  const response = await client.post("/api/subscriptions", data);
  return response.data;
};

export const getOrgSubscriptions = async (orgId: string): Promise<ApiResponse<Subscription[]>> => {
  const response = await client.get(`/api/subscriptions/org/${orgId}`);
  return response.data;
};

export const changePlan = async (subscriptionId: string, planId: string): Promise<ApiResponse<Subscription>> => {
  const response = await client.patch(`/api/subscriptions/${subscriptionId}/plan`, { planId });
  return response.data;
};

export const changeStatus = async (subscriptionId: string, status: string): Promise<ApiResponse<Subscription>> => {
  const response = await client.patch(`/api/subscriptions/${subscriptionId}/status`, { status });
  return response.data;
};

export const checkAccess = async (orgId: string, appSlug: string): Promise<ApiResponse<{ hasAccess: boolean }>> => {
  const response = await client.get("/api/subscriptions/check", { params: { orgId, appSlug } });
  return response.data;
};
