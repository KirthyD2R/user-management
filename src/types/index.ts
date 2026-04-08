export interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  phone: string;
  avatarUrl: string;
  orgId: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface Organization {
  id: string;
  name: string;
  slug: string;
  email: string;
  phone: string;
  industry: string;
  companySize: string;
  address: string;
  city: string;
  state: string;
  country: string;
  postalCode: string;
  gstin: string;
  pan: string;
  timezone: string;
  currency: string;
  status: string;
  logo: string;
  createdAt: string;
  updatedAt: string;
}

export interface App {
  id: string;
  slug: string;
  name: string;
  description: string;
  baseUrl: string;
  limitModel: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface Permission {
  id: string;
  slug: string;
  name: string;
  module: string;
  action: string;
}

export interface Role {
  id: string;
  slug: string;
  name: string;
  description: string;
  appId: string;
  permissions: Permission[];
}

export interface Subscription {
  id: string;
  orgId: string;
  appId: string;
  planId: string;
  status: string;
  startDate: string;
  endDate: string;
  createdAt: string;
}

export interface PlanLimit {
  key: string;
  limit: number;
  description: string;
}

export interface Plan {
  id: string;
  slug: string;
  name: string;
  description: string;
  price: number;
  currency: string;
  interval: string;
  appId: string;
  features: string[];
  limits: PlanLimit[];
  isActive: boolean;
}

export interface UsageRecord {
  id: string;
  orgId: string;
  appSlug: string;
  usageKey: string;
  count: number;
  period: string;
  createdAt: string;
}

export interface LoginResponse {
  accessToken: string;
  refreshToken: string;
  user: User;
}

export interface ApiResponse<T> {
  success: boolean;
  data: T;
  message: string;
  pagination?: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export interface AuthState {
  user: User | null;
  accessToken: string | null;
  refreshToken: string | null;
  isAuthenticated: boolean;
}
