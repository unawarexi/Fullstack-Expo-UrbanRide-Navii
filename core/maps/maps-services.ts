import { decode } from "@mapbox/polyline";
import * as Location from "expo-location";
import { Alert } from "react-native";

// Types and Interfaces
export interface LocationCoordinate {
  latitude: number;
  longitude: number;
}

export interface StopPoint {
  id: string;
  address: string;
  coordinates?: LocationCoordinate;
}

export interface LocationData {
  address: string;
  coordinates: LocationCoordinate;
  placeId?: string;
}

export interface DistanceTimeResult {
  distance: string;
  duration: string;
  distanceValue: number;
  durationValue: number;
}

export interface PlaceDetails {
  placeId: string;
  name: string;
  address: string;
  coordinates: LocationCoordinate;
  types: string[];
  rating?: number;
  photoReference?: string;
}

export interface RouteInfo {
  coordinates: LocationCoordinate[];
  distance: DistanceTimeResult;
  encodedPolyline: string;
}

export interface MarkerData {
  id: string;
  coordinate: LocationCoordinate;
  title: string;
  description?: string;
  type: "pickup" | "destination" | "stop" | "poi";
  icon?: string;
}

export interface AutocompleteResult {
  placeId: string;
  description: string;
  mainText: string;
  secondaryText: string;
}

// Constants
const GOOGLE_MAPS_API_KEY = process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY;
const GEOCODING_BASE_URL = "https://maps.googleapis.com/maps/api/geocode/json";
const DIRECTIONS_BASE_URL = "https://maps.googleapis.com/maps/api/directions/json";
const PLACES_BASE_URL = "https://maps.googleapis.com/maps/api/place";
const NEARBY_SEARCH_URL = `${PLACES_BASE_URL}/nearbysearch/json`;
const PLACE_DETAILS_URL = `${PLACES_BASE_URL}/details/json`;
const AUTOCOMPLETE_URL = `${PLACES_BASE_URL}/autocomplete/json`;


// 1. Get Current Location
export const getCurrentLocation = async (): Promise<LocationData | null> => {
  try {
    // Request permissions
    const { status } = await Location.requestForegroundPermissionsAsync();

    if (status !== "granted") {
      Alert.alert("Permission Denied", "Location permission is required to use this feature");
      return null;
    }

    // Get current position
    const location = await Location.getCurrentPositionAsync({
      accuracy: Location.Accuracy.High,
    });

    const coordinates: LocationCoordinate = {
      latitude: location.coords.latitude,
      longitude: location.coords.longitude,
    };

    // Reverse geocode to get address
    const address = await reverseGeocode(coordinates);

    return {
      address: address || "Current Location",
      coordinates,
    };
  } catch (error) {
    console.error("Error getting current location:", error);
    Alert.alert("Error", "Failed to get current location");
    return null;
  }
};

// 2. Reverse Geocoding (coordinates to address)
export const reverseGeocode = async (coordinates: LocationCoordinate): Promise<string | null> => {
  try {
    const { latitude, longitude } = coordinates;
    const response = await fetch(`${GEOCODING_BASE_URL}?latlng=${latitude},${longitude}&key=${GOOGLE_MAPS_API_KEY}`);
    const data = await response.json();

    if (data.status === "OK" && data.results.length > 0) {
      return data.results[0].formatted_address;
    }
    return null;
  } catch (error) {
    console.error("Error reverse geocoding:", error);
    return null;
  }
};

// 3. Geocoding (address to coordinates)
export const geocodeLatAndLong = async (address: string): Promise<LocationData | null> => {
  try {
    const response = await fetch(`${GEOCODING_BASE_URL}?address=${encodeURIComponent(address)}&key=${GOOGLE_MAPS_API_KEY}`);
    const data = await response.json();

    if (data.status === "OK" && data.results.length > 0) {
      const result = data.results[0];
      return {
        address: result.formatted_address,
        coordinates: {
          latitude: result.geometry.location.lat,
          longitude: result.geometry.location.lng,
        },
        placeId: result.place_id,
      };
    }
    return null;
  } catch (error) {
    console.error("Error geocoding address:", error);
    return null;
  }
};

// 4. Geocode multiple locations (pickup, destination, stops)
export const geocodeMultipleLocations = async (locations: {pickup?: string; destination?: string; stopPoints?: StopPoint[];}): Promise<{
  pickup?: LocationData | null; destination?: LocationData | null; stopPoints: StopPoint[]; }> => {
  const result: {
    pickup?: LocationData | null;
    destination?: LocationData | null;
    stopPoints: StopPoint[];
  } = { stopPoints: [] };

  try {
    // Geocode pickup
    if (locations.pickup) {
      result.pickup = await geocodeLatAndLong(locations.pickup);
    }

    // Geocode destination
    if (locations.destination) {
      result.destination = await geocodeLatAndLong(locations.destination);
    }

    // Geocode stop points
    if (locations.stopPoints) {
      const geocodedStops = await Promise.all(
        locations.stopPoints.map(async (stop) => {
          if (stop.address) {
            const geocoded = await geocodeLatAndLong(stop.address);
            return {
              ...stop,
              coordinates: geocoded?.coordinates,
            };
          }
          return stop;
        })
      );
      result.stopPoints = geocodedStops;
    }

    return result;
  } catch (error) {
    console.error("Error geocoding multiple locations:", error);
    return result;
  }
};

// 5. Search locations with autocomplete
export const searchLocations = async (query: string, location?: LocationCoordinate): Promise<AutocompleteResult[]> => {
  try {
    let url = `${AUTOCOMPLETE_URL}?input=${encodeURIComponent(query)}&key=${GOOGLE_MAPS_API_KEY}`;

    if (location) {
      url += `&location=${location.latitude},${location.longitude}&radius=50000`;
    }

    const response = await fetch(url);
    const data = await response.json();

    if (data.status === "OK") {
      return data.predictions.map((prediction: any) => ({
        placeId: prediction.place_id,
        description: prediction.description,
        mainText: prediction.structured_formatting.main_text,
        secondaryText: prediction.structured_formatting.secondary_text,
      }));
    }
    return [];
  } catch (error) {
    console.error("Error searching locations:", error);
    return [];
  }
};

// 6. Get place details from place ID
export const getPlaceDetails = async (placeId: string): Promise<LocationData | null> => {
  try {
    const response = await fetch(`${PLACE_DETAILS_URL}?place_id=${placeId}&fields=formatted_address,geometry&key=${GOOGLE_MAPS_API_KEY}`);
    const data = await response.json();

    if (data.status === "OK") {
      const place = data.result;
      return {
        address: place.formatted_address,
        coordinates: {
          latitude: place.geometry.location.lat,
          longitude: place.geometry.location.lng,
        },
        placeId,
      };
    }
    return null;
  } catch (error) {
    console.error("Error getting place details:", error);
    return null;
  }
};

// 7. Get directions and polyline (dual - pickup to destination)
export const addDualPolylines = async (pickup: LocationCoordinate, destination: LocationCoordinate): Promise<RouteInfo | null> => {
  try {
    const origin = `${pickup.latitude},${pickup.longitude}`;
    const dest = `${destination.latitude},${destination.longitude}`;

    const response = await fetch(`${DIRECTIONS_BASE_URL}?origin=${origin}&destination=${dest}&key=${GOOGLE_MAPS_API_KEY}`);
    const data = await response.json();

    if (data.status === "OK" && data.routes.length > 0) {
      const route = data.routes[0];
      const leg = route.legs[0];

      const coordinates = decode(route.overview_polyline.points).map((point: number[]) => ({
        latitude: point[0],
        longitude: point[1],
      }));

      return {
        coordinates,
        distance: {
          distance: leg.distance.text,
          duration: leg.duration.text,
          distanceValue: leg.distance.value,
          durationValue: leg.duration.value,
        },
        encodedPolyline: route.overview_polyline.points,
      };
    }
    return null;
  } catch (error) {
    console.error("Error getting directions:", error);
    return null;
  }
};

// 8. Get directions with multiple waypoints
export const addMultiplePolylines = async (pickup: LocationCoordinate, destination: LocationCoordinate, stopPoints: LocationCoordinate[]): Promise<RouteInfo | null> => {
  try {
    const origin = `${pickup.latitude},${pickup.longitude}`;
    const dest = `${destination.latitude},${destination.longitude}`;

    let url = `${DIRECTIONS_BASE_URL}?origin=${origin}&destination=${dest}&key=${GOOGLE_MAPS_API_KEY}`;

    if (stopPoints.length > 0) {
      const waypoints = stopPoints.map((point) => `${point.latitude},${point.longitude}`).join("|");
      url += `&waypoints=optimize:true|${waypoints}`;
    }

    const response = await fetch(url);
    const data = await response.json();

    if (data.status === "OK" && data.routes.length > 0) {
      const route = data.routes[0];

      const coordinates = decode(route.overview_polyline.points).map((point: number[]) => ({
        latitude: point[0],
        longitude: point[1],
      }));

      // Calculate total distance and time
      const totalDistance = route.legs.reduce((sum: number, leg: any) => sum + leg.distance.value, 0);
      const totalDuration = route.legs.reduce((sum: number, leg: any) => sum + leg.duration.value, 0);

      return {
        coordinates,
        distance: {
          distance: `${(totalDistance / 1000).toFixed(1)} km`,
          duration: `${Math.ceil(totalDuration / 60)} min`,
          distanceValue: totalDistance,
          durationValue: totalDuration,
        },
        encodedPolyline: route.overview_polyline.points,
      };
    }
    return null;
  } catch (error) {
    console.error("Error getting multiple waypoint directions:", error);
    return null;
  }
};

// 9. Create markers for pickup, destination and stops
export const addDualMarkersAndStopPointsIndicators = (pickup?: LocationData, destination?: LocationData, stopPoints: StopPoint[] = []): MarkerData[] => {
  const markers: MarkerData[] = [];

  if (pickup?.coordinates) {
    markers.push({
      id: "pickup",
      coordinate: pickup.coordinates,
      title: "Pickup Location",
      description: pickup.address,
      type: "pickup",
    });
  }

  stopPoints.forEach((stop, index) => {
    if (stop.coordinates) {
      markers.push({
        id: stop.id,
        coordinate: stop.coordinates,
        title: `Stop ${index + 1}`,
        description: stop.address,
        type: "stop",
      });
    }
  });

  if (destination?.coordinates) {
    markers.push({
      id: "destination",
      coordinate: destination.coordinates,
      title: "Destination",
      description: destination.address,
      type: "destination",
    });
  }

  return markers;
};

// 10. Calculate distance between two points
export const autoCalculateDistance = async (pickup: LocationCoordinate, destination: LocationCoordinate, stopPoints: LocationCoordinate[] = []): Promise<DistanceTimeResult | null> => {
  try {
    const routeInfo = stopPoints.length > 0 ? await addMultiplePolylines(pickup, destination, stopPoints) : await addDualPolylines(pickup, destination);

    return routeInfo?.distance || null;
  } catch (error) {
    console.error("Error calculating distance:", error);
    return null;
  }
};

// 11. Calculate travel time
export const autoCalculateTime = async (pickup: LocationCoordinate, destination: LocationCoordinate, stopPoints: LocationCoordinate[] = []): Promise<DistanceTimeResult | null> => {
  try {
    const routeInfo = stopPoints.length > 0 ? await addMultiplePolylines(pickup, destination, stopPoints) : await addDualPolylines(pickup, destination);

    return routeInfo?.distance || null;
  } catch (error) {
    console.error("Error calculating time:", error);
    return null;
  }
};

// 12. Find nearby places (hotels, restaurants, mechanics, etc.)
export const addIconsToLocations = async (location: LocationCoordinate, type: "hotel" | "restaurant" | "gas_station" | "hospital" | "atm" | "pharmacy" | "shopping_mall" | "car_repair", radius: number = 5000): Promise<PlaceDetails[]> => {
  try {
    const response = await fetch(`${NEARBY_SEARCH_URL}?location=${location.latitude},${location.longitude}&radius=${radius}&type=${type}&key=${GOOGLE_MAPS_API_KEY}`);
    const data = await response.json();

    if (data.status === "OK") {
      return data.results.map((place: any) => ({
        placeId: place.place_id,
        name: place.name,
        address: place.formatted_address || place.vicinity,
        coordinates: {
          latitude: place.geometry.location.lat,
          longitude: place.geometry.location.lng,
        },
        types: place.types,
        rating: place.rating,
        photoReference: place.photos?.[0]?.photo_reference,
      }));
    }
    return [];
  } catch (error) {
    console.error("Error finding nearby places:", error);
    return [];
  }
};

// 13. Display map with current location (helper function for MapView setup)
export const displayMapWithCurrentLocation = async () => {
  const currentLocation = await getCurrentLocation();

  if (currentLocation) {
    return {
      region: {
        latitude: currentLocation.coordinates.latitude,
        longitude: currentLocation.coordinates.longitude,
        latitudeDelta: 0.01,
        longitudeDelta: 0.01,
      },
      marker: {
        coordinate: currentLocation.coordinates,
        title: "Current Location",
        description: currentLocation.address,
      },
    };
  }
  return null;
};

// 14. Utility function to get map region that fits all markers
export const getRegionForCoordinates = (coordinates: LocationCoordinate[]) => {
  if (coordinates.length === 0) return null;

  let minLat = coordinates[0].latitude;
  let maxLat = coordinates[0].latitude;
  let minLng = coordinates[0].longitude;
  let maxLng = coordinates[0].longitude;

  coordinates.forEach((coord) => {
    minLat = Math.min(minLat, coord.latitude);
    maxLat = Math.max(maxLat, coord.latitude);
    minLng = Math.min(minLng, coord.longitude);
    maxLng = Math.max(maxLng, coord.longitude);
  });

  const midLat = (minLat + maxLat) / 2;
  const midLng = (minLng + maxLng) / 2;
  const deltaLat = (maxLat - minLat) * 1.3; // Add padding
  const deltaLng = (maxLng - minLng) * 1.3;

  return {
    latitude: midLat,
    longitude: midLng,
    latitudeDelta: Math.max(deltaLat, 0.01),
    longitudeDelta: Math.max(deltaLng, 0.01),
  };
};

// 15. Complete autocomplete with location details
export const autoCompleteLocation = async (query: string, location?: LocationCoordinate): Promise<LocationData[]> => {
  try {
    const autocompleteResults = await searchLocations(query, location);

    const locationDetails = await Promise.all(
      autocompleteResults.slice(0, 5).map(async (result) => {
        const details = await getPlaceDetails(result.placeId);
        return details;
      })
    );

    return locationDetails.filter(Boolean) as LocationData[];
  } catch (error) {
    console.error("Error with autocomplete location:", error);
    return [];
  }
};

// Export all functions
export default {
  getCurrentLocation,
  reverseGeocode,
  geocodeLatAndLong,
  geocodeMultipleLocations,
  searchLocations,
  getPlaceDetails,
  addDualPolylines,
  addMultiplePolylines,
  addDualMarkersAndStopPointsIndicators,
  autoCalculateDistance,
  autoCalculateTime,
  addIconsToLocations,
  displayMapWithCurrentLocation,
  getRegionForCoordinates,
  autoCompleteLocation,
};
