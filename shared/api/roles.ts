import client from "./client";
import { ApiResponse, Role, Permission } from "../types";

export const listRoles = async (prefix?: string): Promise<ApiResponse<Role[]>> => {
  const params = prefix ? { prefix } : {};
  const response = await client.get("/api/roles", { params });
  return response.data;
};

export const getRolePermissions = async (roleId: string): Promise<ApiResponse<Permission[]>> => {
  const response = await client.get(`/api/roles/${roleId}/permissions`);
  return response.data;
};

export const assignRole = async (data: {
  userId: string;
  orgId: string;
  appId: string;
  roleId: string;
}): Promise<ApiResponse<Record<string, unknown>>> => {
  const response = await client.post("/api/roles/assign", data);
  return response.data;
};

export const removeRoleAssignment = async (assignmentId: string): Promise<ApiResponse<null>> => {
  const response = await client.delete(`/api/roles/assign/${assignmentId}`);
  return response.data;
};

export const checkPermission = async (
  userId: string,
  appId: string,
  orgId: string,
  permission: string
): Promise<ApiResponse<{ hasPermission: boolean }>> => {
  const response = await client.get("/api/roles/check", {
    params: { userId, appId, orgId, permission },
  });
  return response.data;
};

export const getUserRolesForApp = async (userId: string, appSlug: string): Promise<ApiResponse<Role[]>> => {
  const response = await client.get(`/api/roles/user/${userId}/app/${appSlug}`);
  return response.data;
};

export const listAllPermissions = async (module?: string): Promise<ApiResponse<Permission[]>> => {
  const params = module ? { module } : {};
  const response = await client.get("/api/roles/permissions", { params });
  return response.data;
};
