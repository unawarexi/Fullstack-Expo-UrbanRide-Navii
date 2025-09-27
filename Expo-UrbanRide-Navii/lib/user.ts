import { useQuery } from "@tanstack/react-query";
import axios from "axios";
import * as SecureStore from "expo-secure-store";

const API_URL = `${process.env.EXPO_BACKEND_URL}users`;

// Helper to get Clerk JWT (from Clerk SDK or SecureStore)
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

export async function createUser(data: any) {
  return (await authorizedRequest({ url: API_URL, method: "POST", data })).data;
}

export async function updateUserProfile(data: any) {
  return (await authorizedRequest({ url: API_URL, method: "PUT", data })).data;
}

export async function getUser(params: any) {
  return (await authorizedRequest({ url: API_URL, method: "GET", params })).data;
}

export async function patchUserProfile(data: any) {
  return (await authorizedRequest({ url: API_URL, method: "PATCH", data })).data;
}

export async function deleteUser(data: any) {
  return (await authorizedRequest({ url: API_URL, method: "DELETE", data })).data;
}

// --- React Query hooks ---

export function useGetUser(params: any) {
  return useQuery({
    queryKey: ["user", params],
    queryFn: () => getUser(params),
  });
}
