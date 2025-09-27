import { AdminProfile, AdminStore } from "@/core/types/type";
import {
  adminAction,
  adminDelete,
  adminUpdate,
  bulkAdminAction,
  exportData,
  fetchAnalytics,
  fetchAppSettings,
  fetchDashboardStats,
  fetchDrivers,
  fetchPromoCodes,
  fetchReports,
  fetchRides,
  fetchSupportTickets,
  fetchUsers,
} from "@/lib/admin";
import { create } from "zustand";

export const useAdminStore = create<AdminStore>((set, get) => ({
  admin: null,
  isLoggedIn: false,
  isLoading: false,
  error: null,
  dashboard: null,
  users: [],
  drivers: [],
  rides: [],
  tickets: [],
  promoCodes: [],
  settings: [],
  analytics: null,
  reports: null,

  setAdmin: (admin: AdminProfile) => set({ admin, isLoggedIn: true, error: null }),
  setLoading: (isLoading: boolean) => set({ isLoading }),
  setError: (error: string | null) => set({ error }),
  clearError: () => set({ error: null }),
  logout: () => set({ admin: null, isLoggedIn: false, error: null }),

  refreshDashboard: async (userId: string) => {
    set({ isLoading: true, error: null });
    try {
      const dashboard = await fetchDashboardStats();
      set({ dashboard });
      return dashboard;
    } catch (error: any) {
      set({ error: error.message || "Failed to fetch dashboard" });
      throw error;
    } finally {
      set({ isLoading: false });
    }
  },

  fetchDashboard: async (userId: string) => {
    set({ isLoading: true, error: null });
    try {
      const dashboard = await fetchDashboardStats();
      set({ dashboard });
    } catch (error: any) {
      set({ error: error.message || "Failed to fetch dashboard" });
    } finally {
      set({ isLoading: false });
    }
  },

  fetchUsers: async (userId: string, params = {}) => {
    set({ isLoading: true, error: null });
    try {
      const res = await fetchUsers(params);
      set({ users: res.users || [] });
    } catch (error: any) {
      set({ error: error.message || "Failed to fetch users" });
    } finally {
      set({ isLoading: false });
    }
  },

  fetchDrivers: async (userId: string, params = {}) => {
    set({ isLoading: true, error: null });
    try {
      const res = await fetchDrivers(params);
      set({ drivers: res.drivers || [] });
    } catch (error: any) {
      set({ error: error.message || "Failed to fetch drivers" });
    } finally {
      set({ isLoading: false });
    }
  },

  fetchRides: async (userId: string, params = {}) => {
    set({ isLoading: true, error: null });
    try {
      const res = await fetchRides(params);
      set({ rides: res.rides || [] });
    } catch (error: any) {
      set({ error: error.message || "Failed to fetch rides" });
    } finally {
      set({ isLoading: false });
    }
  },

  fetchTickets: async (userId: string, params = {}) => {
    set({ isLoading: true, error: null });
    try {
      const res = await fetchSupportTickets(params);
      set({ tickets: res.tickets || [] });
    } catch (error: any) {
      set({ error: error.message || "Failed to fetch tickets" });
    } finally {
      set({ isLoading: false });
    }
  },

  fetchPromoCodes: async (userId: string) => {
    set({ isLoading: true, error: null });
    try {
      const res = await fetchPromoCodes();
      set({ promoCodes: res.promoCodes || [] });
    } catch (error: any) {
      set({ error: error.message || "Failed to fetch promo codes" });
    } finally {
      set({ isLoading: false });
    }
  },

  fetchSettings: async (userId: string) => {
    set({ isLoading: true, error: null });
    try {
      const res = await fetchAppSettings();
      set({ settings: res.settings || [] });
    } catch (error: any) {
      set({ error: error.message || "Failed to fetch settings" });
    } finally {
      set({ isLoading: false });
    }
  },

  fetchAnalytics: async (userId: string, period = "7d") => {
    set({ isLoading: true, error: null });
    try {
      const analytics = await fetchAnalytics(period);
      set({ analytics });
    } catch (error: any) {
      set({ error: error.message || "Failed to fetch analytics" });
    } finally {
      set({ isLoading: false });
    }
  },

  fetchReports: async (userId: string, reportType: string, startDate?: string, endDate?: string) => {
    set({ isLoading: true, error: null });
    try {
      const reports = await fetchReports(reportType, startDate, endDate);
      set({ reports });
    } catch (error: any) {
      set({ error: error.message || "Failed to fetch reports" });
    } finally {
      set({ isLoading: false });
    }
  },

  exportData: async (userId: string, type: string, format = "json") => {
    set({ isLoading: true, error: null });
    try {
      return await exportData(type, format);
    } catch (error: any) {
      set({ error: error.message || "Failed to export data" });
      return null;
    } finally {
      set({ isLoading: false });
    }
  },

  adminAction: async (userId: string, action: string, data: any) => {
    set({ isLoading: true, error: null });
    try {
      return await adminAction(action, data);
    } catch (error: any) {
      set({ error: error.message || "Admin action failed" });
      return null;
    } finally {
      set({ isLoading: false });
    }
  },

  adminUpdate: async (userId: string, action: string, id: string, data: any) => {
    set({ isLoading: true, error: null });
    try {
      return await adminUpdate(action, id, data);
    } catch (error: any) {
      set({ error: error.message || "Admin update failed" });
      return null;
    } finally {
      set({ isLoading: false });
    }
  },

  adminDelete: async (userId: string, action: string, id: string) => {
    set({ isLoading: true, error: null });
    try {
      return await adminDelete(action, id);
    } catch (error: any) {
      set({ error: error.message || "Admin delete failed" });
      return null;
    } finally {
      set({ isLoading: false });
    }
  },

  bulkAdminAction: async (userId: string, action: string, ids: string[], data?: any) => {
    set({ isLoading: true, error: null });
    try {
      return await bulkAdminAction( action, ids, data);
    } catch (error: any) {
      set({ error: error.message || "Bulk admin action failed" });
      return null;
    } finally {
      set({ isLoading: false });
    }
  },
}));
