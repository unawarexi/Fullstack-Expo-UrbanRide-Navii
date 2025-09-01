import { LocationData, LocationStore } from "@/core/types/type";
import { create } from "zustand";

export const useLocationStore = create<LocationStore>((set) => ({
  userLatitude: null,
  userLongitude: null,
  userAddress: null,
  destinationLatitude: null,
  destinationLongitude: null,
  destinationAddress: null,
  userLocationData: null,
  destinationLocationData: null,
  setUserLocation: ({ latitude, longitude, address, locationData }: { latitude: number; longitude: number; address: string; locationData?: LocationData }) =>
    set((state) => ({
      userLatitude: latitude,
      userLongitude: longitude,
      userAddress: address,
      userLocationData: locationData || state.userLocationData,
    })),
  setDestinationLocation: ({ latitude, longitude, address, locationData }: { latitude: number; longitude: number; address: string; locationData?: LocationData }) =>
    set((state) => ({
      destinationLatitude: latitude,
      destinationLongitude: longitude,
      destinationAddress: address,
      destinationLocationData: locationData || state.destinationLocationData,
    })),
  clearLocations: () =>
    set({
      userLatitude: null,
      userLongitude: null,
      userAddress: null,
      destinationLatitude: null,
      destinationLongitude: null,
      destinationAddress: null,
      userLocationData: null,
      destinationLocationData: null,
    }),
}));