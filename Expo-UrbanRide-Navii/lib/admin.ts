import { AdminLoginData, AdminProfile } from "@/core/types/type";
import axios from "axios";
import * as SecureStore from "expo-secure-store";

const API_URL =  `${process.env.EXPO_BACKEND_URL}admin`;

// Helper to get Clerk JWT (implement according to your auth flow)
async function getClerkToken(): Promise<string | null> {
  try {
    const token = await SecureStore.getItemAsync("clerk_token");
    if (!token) {
      console.log("No Clerk token found in SecureStore under key: clerk_token");
    }
    return token;
  } catch (error) {
    console.error("Error retrieving Clerk token:", error);
    return null;
  }
}

async function authorizedRequest(config: any) {
  const token = await getClerkToken();
  return axios({
    ...config,
    headers: {
      ...(config.headers || {}),
      Authorization: `Bearer ${token}`,
    },
  });
}

// Login
export async function loginAdmin(data: AdminLoginData): Promise<AdminProfile> {
  return (
    await authorizedRequest({
      url: `${API_URL}/login`,
      method: "POST",
      data,
    })
  ).data;
}

// Dashboard stats
export async function fetchDashboardStats() {
  return (
    await authorizedRequest({
      url: `${API_URL}?action=dashboard`,
      method: "GET",
    })
  ).data;
}

// Users
export async function fetchUsers(params: Record<string, string> = {}) {
  return (
    await authorizedRequest({
      url: `${API_URL}?action=users`,
      method: "GET",
      params,
    })
  ).data;
}

// Drivers
export async function fetchDrivers(params: Record<string, string> = {}) {
  return (
    await authorizedRequest({
      url: `${API_URL}?action=drivers`,
      method: "GET",
      params,
    })
  ).data;
}

// Rides
export async function fetchRides(params: Record<string, string> = {}) {
  return (
    await authorizedRequest({
      url: `${API_URL}?action=rides`,
      method: "GET",
      params,
    })
  ).data;
}

// Support Tickets
export async function fetchSupportTickets(params: Record<string, string> = {}) {
  return (
    await authorizedRequest({
      url: `${API_URL}?action=support-tickets`,
      method: "GET",
      params,
    })
  ).data;
}

// Promo Codes
export async function fetchPromoCodes() {
  return (
    await authorizedRequest({
      url: `${API_URL}?action=promo-codes`,
      method: "GET",
    })
  ).data;
}

// App Settings
export async function fetchAppSettings() {
  return (
    await authorizedRequest({
      url: `${API_URL}?action=settings`,
      method: "GET",
    })
  ).data;
}

// POST actions
export async function adminAction(action: string, data: any) {
  return (
    await authorizedRequest({
      url: API_URL,
      method: "POST",
      data: { action, data },
    })
  ).data;
}

// PUT actions
export async function adminUpdate(action: string, id: string, data: any) {
  return (
    await authorizedRequest({
      url: API_URL,
      method: "PUT",
      data: { action, id, data },
    })
  ).data;
}

// DELETE actions
export async function adminDelete(action: string, id: string) {
  return (
    await authorizedRequest({
      url: API_URL,
      method: "DELETE",
      params: { action, id },
    })
  ).data;
}

// Analytics
export async function fetchAnalytics(period: string = "7d") {
  return (
    await authorizedRequest({
      url: `${API_URL}/analytics`,
      method: "GET",
      params: { period },
    })
  ).data;
}

// Export Data
export async function exportData(type: string, format: string = "json") {
  return (
    await authorizedRequest({
      url: `${API_URL}/export`,
      method: "GET",
      params: { type, format },
    })
  ).data;
}

// Reports
export async function fetchReports(reportType: string, startDate?: string, endDate?: string) {
  return (
    await authorizedRequest({
      url: `${API_URL}/reports`,
      method: "GET",
      params: { type: reportType, startDate, endDate },
    })
  ).data;
}

// Bulk Actions
export async function bulkAdminAction(action: string, ids: string[], data?: any) {
  return (
    await authorizedRequest({
      url: `${API_URL}/bulk-actions`,
      method: "POST",
      data: { action, ids, data },
    })
  ).data;
}
