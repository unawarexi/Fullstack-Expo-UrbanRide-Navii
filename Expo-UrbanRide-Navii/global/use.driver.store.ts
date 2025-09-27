import * as driverApi from "@/lib/driver";
import { create } from "zustand";

type DriverFormState = {
  personal: {
    licenseNumber: string;
    licenseExpiry: string;
    identityType: string;
    identityNumber: string;
    bankAccountNumber: string;
    bankName: string;
    identityImages: { uri: string; fileName?: string }[]; // 2 images
  };
  vehicle: {
    make: string;
    model: string;
    year: string;
    color: string;
    plateNumber: string;
    seats: string;
    insuranceExpiry: string;
    registrationExpiry: string;
    vehicleImages: { uri: string; fileName?: string }[]; // 6 images
    imageUrls: string[]; // Add this for compatibility
  };
};

type DriverStore = {
  form: DriverFormState;
  isLoading?: boolean;
  error?: string | null;
  setPersonal: (data: Partial<DriverFormState["personal"]>) => void;
  setVehicle: (data: Partial<DriverFormState["vehicle"]>) => void;
  setDriver: (data: any) => void;
  setVehicleState: (data: any) => void;
  setLoading: (isLoading: boolean) => void;
  setError: (error: string | null) => void;
  clearError: () => void;
  reset: () => void;
  submit: (userId: string) => Promise<any>;
  refreshDriver: (driverId: string) => Promise<any>;
};

export const useDriverStore = create<DriverStore>((set, get) => ({
  form: {
    personal: {
      licenseNumber: "",
      licenseExpiry: "",
      identityType: "",
      identityNumber: "",
      bankAccountNumber: "",
      bankName: "",
      identityImages: [],
    },
    vehicle: {
      make: "",
      model: "",
      year: "",
      color: "",
      plateNumber: "",
      seats: "",
      insuranceExpiry: "",
      registrationExpiry: "",
      vehicleImages: [],
      imageUrls: [],
    },
  },
  isLoading: false,
  error: null,
  setPersonal: (data) => set((state) => ({
    form: { ...state.form, personal: { ...state.form.personal, ...data } }
  })),
  setVehicle: (data) => set((state) => ({
    form: { ...state.form, vehicle: { ...state.form.vehicle, ...data } }
  })),
  setDriver: (data) => set((state) => ({
    form: { ...state.form, personal: { ...state.form.personal, ...data } }
  })),
  setVehicleState: (data) => set((state) => ({
    form: { ...state.form, vehicle: { ...state.form.vehicle, ...data } }
  })),
  setLoading: (isLoading) => set({ isLoading }),
  setError: (error) => set({ error }),
  clearError: () => set({ error: null }),
  reset: () => set({
    form: {
      personal: {
        licenseNumber: "",
        licenseExpiry: "",
        identityType: "",
        identityNumber: "",
        bankAccountNumber: "",
        bankName: "",
        identityImages: [],
      },
      vehicle: {
        make: "",
        model: "",
        year: "",
        color: "",
        plateNumber: "",
        seats: "",
        insuranceExpiry: "",
        registrationExpiry: "",
        vehicleImages: [],
        imageUrls: [],
      },
    },
    error: null,
    isLoading: false,
  }),
  submit: async (userId: string) => {
    set({ isLoading: true, error: null });
    try {
      const { personal, vehicle } = get().form;

      // Register driver profile (without images)
      const driverPayload = {
        userId,
        licenseNumber: personal.licenseNumber,
        licenseExpiry: personal.licenseExpiry,
        identityType: personal.identityType,
        identityNumber: personal.identityNumber,
        bankAccountNumber: personal.bankAccountNumber,
        bankName: personal.bankName,
      };
      const driverRes = await driverApi.registerDriver(driverPayload);

      // Add vehicle with imageUrls array (skip image upload)
      const vehiclePayload = {
        make: vehicle.make,
        model: vehicle.model,
        year: Number(vehicle.year),
        color: vehicle.color,
        plateNumber: vehicle.plateNumber,
        seats: Number(vehicle.seats),
        insuranceExpiry: vehicle.insuranceExpiry,
        registrationExpiry: vehicle.registrationExpiry,
        imageUrls: vehicle.imageUrls, // Use as is
      };
      const vehicleRes = await driverApi.addVehicle(driverRes.data.id, vehiclePayload);

      set({ isLoading: false });
      return { driver: driverRes, vehicle: vehicleRes };
    } catch (e: any) {
      set({ error: e.message, isLoading: false });
      throw e;
    }
  },
  refreshDriver: async (driverId: string) => {
    set({ isLoading: true, error: null });
    try {
      const res = await driverApi.getDriver(driverId);
      set({ form: { ...get().form, ...res.data } });
      return res;
    } catch (e: any) {
      set({ error: e.message });
      throw e;
    } finally {
      set({ isLoading: false });
    }
  },
}));
