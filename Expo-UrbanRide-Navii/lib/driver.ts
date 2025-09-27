import { useQuery } from "@tanstack/react-query";
import axios from "axios";
import * as SecureStore from "expo-secure-store";

const API_URL = `${process.env.EXPO_BACKEND_URL}drivers`;

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

// Register a new driver
export async function registerDriver(data: any) {
  return (await authorizedRequest({
    url: `${API_URL}?action=register`,
    method: "POST",
    data,
  })).data;
}

// Add a vehicle for the driver
export async function addVehicle(driverId: string, data: any) {
  // Ensure data.imageUrls is an array
  if (!Array.isArray(data.imageUrls)) {
    throw new Error("imageUrls must be an array of strings");
  }
  return (await authorizedRequest({
    url: `${API_URL}?action=add-vehicle&driverId=${driverId}`,
    method: "POST",
    data,
  })).data;
}

// Get driver details by driverId or userId
export async function getDriver(driverId: string) {
  return (await authorizedRequest({
    url: `${API_URL}?driverId=${driverId}`,
    method: "GET",
  })).data;
}

// Update driver profile or status
export async function updateDriver(driverId: string, data: any) {
  return (await authorizedRequest({
    url: `${API_URL}?driverId=${driverId}`,
    method: "PUT",
    data,
  })).data;
}

// Update driver's location
export async function updateDriverLocation(driverId: string, latitude: number, longitude: number) {
  return (await authorizedRequest({
    url: `${API_URL}?driverId=${driverId}&action=update-location`,
    method: "PUT",
    data: { latitude, longitude },
  })).data;
}

// Toggle driver's online status
export async function toggleDriverOnlineStatus(driverId: string, isOnline: boolean) {
  return (await authorizedRequest({
    url: `${API_URL}?driverId=${driverId}&action=toggle-online`,
    method: "PUT",
    data: { isOnline },
  })).data;
}

// Fetch nearby drivers based on location
export async function fetchNearbyDrivers(latitude: number, longitude: number, radius: number = 5) {
  return (await authorizedRequest({
    url: `${API_URL}/nearby`,
    method: "GET",
    params: { latitude, longitude, radius },
  })).data;
}

// --- React Query hooks ---

export function useGetDriver(driverId: string) {
  return useQuery({
    queryKey: ["driver", driverId],
    queryFn: () => getDriver(driverId),
    enabled: !!driverId,
  });
}