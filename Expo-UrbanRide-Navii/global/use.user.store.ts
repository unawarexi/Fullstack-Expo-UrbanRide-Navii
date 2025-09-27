import * as userApi from "@/lib/user";
import { create } from "zustand";

type UserStore = {
  user?: {
    clerkId: string;
    profileImageUrl?: string;
  };
  isLoading?: boolean;
  error?: string | null;
  setUser: (user: any) => void;
  setError: (error: string | null) => void;
  clearError: () => void;
  createUser: (data: any) => Promise<any>;
  updateUserProfile: (data: any) => Promise<any>;
  getUser: (params: any) => Promise<any>;
  patchUserProfile: (data: any) => Promise<any>;
  deleteUser: (data: any) => Promise<any>;
  refreshUser: (params: any) => Promise<any>;
};

export const useUserStore = create<UserStore>((set, get) => ({
  user: undefined,
  isLoading: false,
  error: null,
  setUser: (user) => set({ user }),
  setError: (error) => set({ error }),
  clearError: () => set({ error: null }),
  createUser: async (data) => {
    set({ isLoading: true, error: null });
    try {
      const res = await userApi.createUser(data);
      set({ user: res.data });
      return res;
    } catch (e: any) {
      set({ error: e.message });
      throw e;
    } finally {
      set({ isLoading: false });
    }
  },
  updateUserProfile: async (data) => {
    set({ isLoading: true, error: null });
    try {
      const res = await userApi.updateUserProfile(data);
      set({ user: res.data });
      return res;
    } catch (e: any) {
      set({ error: e.message });
      throw e;
    } finally {
      set({ isLoading: false });
    }
  },
  getUser: async (params) => {
    set({ isLoading: true, error: null });
    try {
      const res = await userApi.getUser(params);
      set({ user: res.data });
      return res;
    } catch (e: any) {
      set({ error: e.message });
      throw e;
    } finally {
      set({ isLoading: false });
    }
  },
  patchUserProfile: async (data) => {
    set({ isLoading: true, error: null });
    try {
      const res = await userApi.patchUserProfile(data);
      set({ user: res.data });
      return res;
    } catch (e: any) {
      set({ error: e.message });
      throw e;
    } finally {
      set({ isLoading: false });
    }
  },
  deleteUser: async (data) => {
    set({ isLoading: true, error: null });
    try {
      const res = await userApi.deleteUser(data);
      set({ user: undefined });
      return res;
    } catch (e: any) {
      set({ error: e.message });
      throw e;
    } finally {
      set({ isLoading: false });
    }
  },
 
  refreshUser: async (params) => {
    set({ isLoading: true, error: null });
    try {
      const res = await userApi.getUser(params);
      set({ user: res.data });
      return res;
    } catch (e: any) {
      set({ error: e.message });
      throw e;
    } finally {
      set({ isLoading: false });
    }
  },
}));
