// import { fetch } from "expo-network";

// Register a new driver
export async function registerDriver(data: any) {
  const res = await fetch("/api/driver?action=register", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  return res.json();
}

// Add a vehicle for the driver
export async function addVehicle(driverId: string, data: any) {
  const res = await fetch(`/api/driver?action=add-vehicle&driverId=${driverId}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  return res.json();
}

// Get driver details by driverId or userId
export async function getDriver(driverId: string) {
  const res = await fetch(`/api/driver?driverId=${driverId}`);
  return res.json();
}

// Update driver profile or status
export async function updateDriver(driverId: string, data: any) {
  const res = await fetch(`/api/driver?driverId=${driverId}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  return res.json();
}

// Update driver's location
export async function updateDriverLocation(driverId: string, latitude: number, longitude: number) {
  const res = await fetch(`/api/driver?driverId=${driverId}&action=update-location`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ latitude, longitude }),
  });
  return res.json();
}

// Toggle driver's online status
export async function toggleDriverOnlineStatus(driverId: string, isOnline: boolean) {
  const res = await fetch(`/api/driver?driverId=${driverId}&action=toggle-online`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ isOnline }),
  });
  return res.json();
}

// Fetch nearby drivers based on location
export async function fetchNearbyDrivers(latitude: number, longitude: number, radius: number = 5) {
  const res = await fetch(`/api/driver-nearby?latitude=${latitude}&longitude=${longitude}&radius=${radius}`);
  return res.json();
}

// ...other utility functions as needed...