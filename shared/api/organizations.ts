import client from "./client";
import { ApiResponse, Organization } from "../types";

export const listOrganizations = async (page?: number, limit?: number): Promise<ApiResponse<Organization[]>> => {
  const params: Record<string, number> = {};
  if (page !== undefined) params.page = page;
  if (limit !== undefined) params.limit = limit;
  const response = await client.get("/api/organisations", { params });
  return response.data;
};

export const getOrganization = async (id: string): Promise<ApiResponse<Organization>> => {
  const response = await client.get(`/api/organisations/${id}`);
  return response.data;
};

export const createOrganization = async (data: Partial<Organization>): Promise<ApiResponse<Organization>> => {
  const response = await client.post("/api/organisations", data);
  return response.data;
};

export const updateOrganization = async (id: string, data: Partial<Organization>): Promise<ApiResponse<Organization>> => {
  const response = await client.patch(`/api/organisations/${id}`, data);
  return response.data;
};

export const getOrgStats = async (id: string): Promise<ApiResponse<Record<string, unknown>>> => {
  const response = await client.get(`/api/organisations/${id}/stats`);
  return response.data;
};

export const updateOrgStatus = async (id: string, status: string): Promise<ApiResponse<Organization>> => {
  const response = await client.patch(`/api/organisations/${id}/status`, { status });
  return response.data;
};
