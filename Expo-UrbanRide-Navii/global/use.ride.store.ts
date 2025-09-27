import * as rideApi from "@/lib/rides";
import { create } from "zustand";



export const useRideStore = create((set, get) => ({
  rides: [],
  ride: null,
  availableRides: [],
  rideTracking: null,
  rideStats: null,
  isLoading: false,
  error: null,

  setError: (error: any) => set({ error }),
  clearError: () => set({ error: null }),
  setLoading: (isLoading: any) => set({ isLoading }),
  setRides: (rides: any[]) => set({ rides }),
  setRide: (ride: any) => set({ ride }),
  clearRide: () => set({ ride: null }),

  refreshRides: async (params = {}) => {
    set({ isLoading: true, error: null });
    try {
      const res = await rideApi.getRide(params);
      set({ rides: res.data ? (Array.isArray(res.data) ? res.data : [res.data]) : [] });
      set({ ride: res.data && !Array.isArray(res.data) ? res.data : null });
      return res;
    } catch (e: any) {
      set({ error: e.message });
      throw e;
    } finally {
      set({ isLoading: false });
    }
  },

  createRide: async (data: any) => {
    set({ isLoading: true, error: null });
    try {
      const res = await rideApi.createRide(data);
      set({ ride: res.data });
      return res;
    } catch (e: any) {
      set({ error: e.message });
      throw e;
    } finally {
      set({ isLoading: false });
    }
  },

  acceptRide: async (rideId: any, data: any) => {
    set({ isLoading: true, error: null });
    try {
      const res = await rideApi.acceptRide(rideId, data);
      set({ ride: res.data });
      return res;
    } catch (e: any) {
      set({ error: e.message });
      throw e;
    } finally {
      set({ isLoading: false });
    }
  },

  startRide: async (rideId: any, data: any) => {
    set({ isLoading: true, error: null });
    try {
      const res = await rideApi.startRide(rideId, data);
      set({ ride: res.data });
      return res;
    } catch (e: any) {
      set({ error: e.message });
      throw e;
    } finally {
      set({ isLoading: false });
    }
  },

  completeRide: async (rideId: any, data: any) => {
    set({ isLoading: true, error: null });
    try {
      const res = await rideApi.completeRide(rideId, data);
      set({ ride: res.data });
      return res;
    } catch (e: any) {
      set({ error: e.message });
      throw e;
    } finally {
      set({ isLoading: false });
    }
  },

  cancelRide: async (rideId: any, data: any) => {
    set({ isLoading: true, error: null });
    try {
      const res = await rideApi.cancelRide(rideId, data);
      set({ ride: res.data });
      return res;
    } catch (e: any) {
      set({ error: e.message });
      throw e;
    } finally {
      set({ isLoading: false });
    }
  },

  updateRide: async (rideId: any, data: any) => {
    set({ isLoading: true, error: null });
    try {
      const res = await rideApi.updateRide(rideId, data);
      set({ ride: res.data });
      return res;
    } catch (e: any) {
      set({ error: e.message });
      throw e;
    } finally {
      set({ isLoading: false });
    }
  },

  getRide: async (params = {}) => {
    set({ isLoading: true, error: null });
    try {
      const res = await rideApi.getRide(params);
      set({ rides: res.data ? (Array.isArray(res.data) ? res.data : [res.data]) : [] });
      set({ ride: res.data && !Array.isArray(res.data) ? res.data : null });
      return res;
    } catch (e: any) {
      set({ error: e.message });
      throw e;
    } finally {
      set({ isLoading: false });
    }
  },

  rateRide: async (rideId: any, data: any) => {
    set({ isLoading: true, error: null });
    try {
      const res = await rideApi.rateRide(rideId, data);
      return res;
    } catch (e: any) {
      set({ error: e.message });
      throw e;
    } finally {
      set({ isLoading: false });
    }
  },

  negotiatePrice: async (rideId: any, data: any) => {
    set({ isLoading: true, error: null });
    try {
      const res = await rideApi.negotiatePrice(rideId, data);
      return res;
    } catch (e: any) {
      set({ error: e.message });
      throw e;
    } finally {
      set({ isLoading: false });
    }
  },

  respondToNegotiation: async (rideId: any, data: any) => {
    set({ isLoading: true, error: null });
    try {
      const res = await rideApi.respondToNegotiation(rideId, data);
      return res;
    } catch (e: any) {
      set({ error: e.message });
      throw e;
    } finally {
      set({ isLoading: false });
    }
  },

  updatePaymentStatus: async (rideId: any, data: any) => {
    set({ isLoading: true, error: null });
    try {
      const res = await rideApi.updatePaymentStatus(rideId, data);
      return res;
    } catch (e: any) {
      set({ error: e.message });
      throw e;
    } finally {
      set({ isLoading: false });
    }
  },

  getAvailableRides: async (params = {}) => {
    set({ isLoading: true, error: null });
    try {
      const res = await rideApi.getAvailableRides(params);
      set({ availableRides: res.data || [] });
      return res;
    } catch (e: any) {
      set({ error: e.message });
      throw e;
    } finally {
      set({ isLoading: false });
    }
  },

  getRideTracking: async (params = {}) => {
    set({ isLoading: true, error: null });
    try {
      const res = await rideApi.getRideTracking(params);
      set({ rideTracking: res.data });
      return res;
    } catch (e: any) {
      set({ error: e.message });
      throw e;
    } finally {
      set({ isLoading: false });
    }
  },

  getRideStats: async (params = {}) => {
    set({ isLoading: true, error: null });
    try {
      const res = await rideApi.getRideStats(params);
      set({ rideStats: res.data });
      return res;
    } catch (e: any) {
      set({ error: e.message });
      throw e;
    } finally {
      set({ isLoading: false });
    }
  },
}));
