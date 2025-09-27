import { useQuery } from "@tanstack/react-query";
import axios from "axios";
import * as SecureStore from "expo-secure-store";

const API_URL = `${process.env.EXPO_BACKEND_URL}rides`;

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

// Create Ride
export async function createRide(data: any) {
  return (
    await authorizedRequest({
      url: `${API_URL}?action=create`,
      method: "POST",
      data,
    })
  ).data;
}

// Accept Ride
export async function acceptRide(rideId: string, data: any) {
  return (
    await authorizedRequest({
      url: `${API_URL}?action=accept&rideId=${rideId}`,
      method: "POST",
      data,
    })
  ).data;
}

// Start Ride
export async function startRide(rideId: string, data: any) {
  return (
    await authorizedRequest({
      url: `${API_URL}?action=start&rideId=${rideId}`,
      method: "POST",
      data,
    })
  ).data;
}

// Complete Ride
export async function completeRide(rideId: string, data: any) {
  return (
    await authorizedRequest({
      url: `${API_URL}?action=complete&rideId=${rideId}`,
      method: "POST",
      data,
    })
  ).data;
}

// Cancel Ride
export async function cancelRide(rideId: string, data: any) {
  return (
    await authorizedRequest({
      url: `${API_URL}?action=cancel&rideId=${rideId}`,
      method: "POST",
      data,
    })
  ).data;
}

// Update Ride
export async function updateRide(rideId: string, data: any) {
  return (
    await authorizedRequest({
      url: `${API_URL}?rideId=${rideId}`,
      method: "PUT",
      data,
    })
  ).data;
}

// Get Ride(s)
export async function getRide(params: Record<string, string | number | boolean> = {}) {
  return (
    await authorizedRequest({
      url: API_URL,
      method: "GET",
      params,
    })
  ).data;
}

// Rate Ride
export async function rateRide(rideId: string, data: any) {
  return (
    await authorizedRequest({
      url: `${API_URL}?action=rate&rideId=${rideId}`,
      method: "PATCH",
      data,
    })
  ).data;
}

// Negotiate Price
export async function negotiatePrice(rideId: string, data: any) {
  return (
    await authorizedRequest({
      url: `${API_URL}?action=negotiate&rideId=${rideId}`,
      method: "PATCH",
      data,
    })
  ).data;
}

// Respond to Negotiation
export async function respondToNegotiation(rideId: string, data: any) {
  return (
    await authorizedRequest({
      url: `${API_URL}?action=respond-negotiation&rideId=${rideId}`,
      method: "PATCH",
      data,
    })
  ).data;
}

// Update Payment Status
export async function updatePaymentStatus(rideId: string, data: any) {
  return (
    await authorizedRequest({
      url: `${API_URL}?action=update-payment&rideId=${rideId}`,
      method: "PATCH",
      data,
    })
  ).data;
}

// Get Available Rides for Drivers
export async function getAvailableRides(params: Record<string, string | number> = {}) {
  return (
    await authorizedRequest({
      url: `${API_URL}/available`,
      method: "GET",
      params,
    })
  ).data;
}

// Get Ride Tracking
export async function getRideTracking(params: Record<string, string | number> = {}) {
  return (
    await authorizedRequest({
      url: `${API_URL}/tracking`,
      method: "GET",
      params,
    })
  ).data;
}

// Get Ride Stats
export async function getRideStats(params: Record<string, string | number> = {}) {
  return (
    await authorizedRequest({
      url: `${API_URL}/stats`,
      method: "GET",
      params,
    })
  ).data;
}

// --- React Query hooks ---

export function useGetRide(params: Record<string, string | number | boolean> = {}) {
  return useQuery({
    queryKey: ["ride", params],
    queryFn: () => getRide(params),
  });
}

export function useGetAvailableRides(params: Record<string, string | number> = {}) {
  return useQuery({
    queryKey: ["availableRides", params],
    queryFn: () => getAvailableRides(params),
  });
}

export function useGetRideTracking(params: Record<string, string | number> = {}) {
  return useQuery({
    queryKey: ["rideTracking", params],
    queryFn: () => getRideTracking(params),
  });
}

export function useGetRideStats(params: Record<string, string | number> = {}) {
  return useQuery({
    queryKey: ["rideStats", params],
    queryFn: () => getRideStats(params),
  });
}
