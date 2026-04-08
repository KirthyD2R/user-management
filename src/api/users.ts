import client from "./client";
import { ApiResponse, User, App } from "../types";

export const createUser = async (data: Partial<User> & { password?: string }): Promise<ApiResponse<User>> => {
  const response = await client.post("/api/users", data);
  return response.data;
};

export const lookupUser = async (email: string): Promise<ApiResponse<User>> => {
  const response = await client.get("/api/users/lookup", { params: { email } });
  return response.data;
};

export const checkEmail = async (email: string, orgId: string): Promise<ApiResponse<{ exists: boolean }>> => {
  const response = await client.get("/api/users/check-email", { params: { email, orgId } });
  return response.data;
};

export const getUser = async (id: string): Promise<ApiResponse<User>> => {
  const response = await client.get(`/api/users/${id}`);
  return response.data;
};

export const updateUser = async (id: string, data: Partial<User>): Promise<ApiResponse<User>> => {
  const response = await client.patch(`/api/users/${id}`, data);
  return response.data;
};

export const listOrgUsers = async (orgId: string, page?: number, limit?: number): Promise<ApiResponse<User[]>> => {
  const params: Record<string, string | number> = {};
  if (page !== undefined) params.page = page;
  if (limit !== undefined) params.limit = limit;
  const response = await client.get(`/api/users/org/${orgId}`, { params });
  return response.data;
};

export const toggleUserStatus = async (id: string, isActive: boolean): Promise<ApiResponse<User>> => {
  const response = await client.patch(`/api/users/${id}/status`, { isActive });
  return response.data;
};

export const getUserApps = async (id: string): Promise<ApiResponse<App[]>> => {
  const response = await client.get(`/api/users/${id}/apps`);
  return response.data;
};

export const inviteUser = async (data: {
  email: string;
  firstName: string;
  lastName: string;
  orgId: string;
  appSlug: string;
  roleSlug: string;
}): Promise<ApiResponse<User>> => {
  const response = await client.post("/api/users/invite", data);
  return response.data;
};
