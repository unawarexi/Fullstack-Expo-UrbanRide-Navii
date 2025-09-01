import * as driverApi from "@/lib/driver";
import {
    uploadDriverDocument,
    uploadVehicleImages,
} from "@/lib/imagekit";
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
  };
};

type DriverStore = {
  form: DriverFormState;
  setPersonal: (data: Partial<DriverFormState["personal"]>) => void;
  setVehicle: (data: Partial<DriverFormState["vehicle"]>) => void;
  reset: () => void;
  submit: (userId: string) => Promise<any>;
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
    },
  },
  setPersonal: (data) => set((state) => ({
    form: { ...state.form, personal: { ...state.form.personal, ...data } }
  })),
  setVehicle: (data) => set((state) => ({
    form: { ...state.form, vehicle: { ...state.form.vehicle, ...data } }
  })),
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
      },
    }
  }),
  submit: async (userId: string) => {
    const { personal, vehicle } = get().form;

    // Upload identity images to ImageKit and save as driver documents
    const identityImageResults = [];
    for (let i = 0; i < personal.identityImages.length; i++) {
      const img = personal.identityImages[i];
      if (img) {
        const docType = i === 0 ? `${personal.identityType}_front` : `${personal.identityType}_back`;
        const result = await uploadDriverDocument(
          img,
          docType,
          undefined,
          { tags: ["identity", docType] }
        );
        identityImageResults.push(result.url);
      }
    }

    // Register driver profile (without images)
    const driverPayload = {
      userId,
      licenseNumber: personal.licenseNumber,
      licenseExpiry: personal.licenseExpiry,
      identityType: personal.identityType,
      identityNumber: personal.identityNumber,
      bankAccountNumber: personal.bankAccountNumber,
      bankName: personal.bankName,
      // Don't send identityImageUrls, handled by driver documents
    };
    const driverRes = await driverApi.registerDriver(driverPayload);

    // Upload vehicle images to ImageKit and save URLs
    const vehicleImageResults = await uploadVehicleImages(
      vehicle.vehicleImages,
      driverRes.data.id,
      { tags: ["vehicle", "registration"] }
    );
    const vehicleImageUrls = vehicleImageResults.map((r) => r.url);

    // Add vehicle with image URLs
    const vehiclePayload = {
      make: vehicle.make,
      model: vehicle.model,
      year: Number(vehicle.year),
      color: vehicle.color,
      plateNumber: vehicle.plateNumber,
      seats: Number(vehicle.seats),
      insuranceExpiry: vehicle.insuranceExpiry,
      registrationExpiry: vehicle.registrationExpiry,
      imageUrls: vehicleImageUrls,
    };
    const vehicleRes = await driverApi.addVehicle(driverRes.data.id, vehiclePayload);

    return { driver: driverRes, vehicle: vehicleRes };
  }
}));
