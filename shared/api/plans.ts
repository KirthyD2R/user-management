import client from "./client";
import { ApiResponse, Plan, PlanLimit } from "../types";

export const listPlans = async (appSlug?: string): Promise<ApiResponse<Plan[]>> => {
  const params = appSlug ? { appSlug } : {};
  const response = await client.get("/api/plans", { params });
  return response.data;
};

export const getPlanLimits = async (planSlug: string, appSlug?: string): Promise<ApiResponse<PlanLimit[]>> => {
  const params = appSlug ? { appSlug } : {};
  const response = await client.get(`/api/plans/${planSlug}/limits`, { params });
  return response.data;
};

export const getFeatureComparison = async (appSlug?: string): Promise<ApiResponse<Record<string, unknown>>> => {
  const params = appSlug ? { appSlug } : {};
  const response = await client.get("/api/plans/features", { params });
  return response.data;
};

export const checkFeatureAccess = async (
  orgId: string,
  appSlug: string,
  feature: string
): Promise<ApiResponse<{ hasAccess: boolean }>> => {
  const response = await client.get("/api/plans/check-feature", {
    params: { orgId, appSlug, feature },
  });
  return response.data;
};

export const checkQuota = async (
  orgId: string,
  appSlug: string,
  limitKey: string
): Promise<ApiResponse<{ withinQuota: boolean }>> => {
  const response = await client.get("/api/plans/check-quota", {
    params: { orgId, appSlug, limitKey },
  });
  return response.data;
};

export const checkSeatLimit = async (
  orgId: string,
  appSlug: string
): Promise<ApiResponse<{ withinLimit: boolean }>> => {
  const response = await client.get("/api/plans/check-seat", {
    params: { orgId, appSlug },
  });
  return response.data;
};
