import { lightIceBlueMapStyle } from "@/core/themes/map-themes";
import { router, useLocalSearchParams } from "expo-router";
import { ArrowLeft, Clock, Navigation, Users } from "lucide-react-native";
import React, { useEffect, useRef, useState } from "react";
import { ActivityIndicator, Alert, SafeAreaView, ScrollView, Text, TouchableOpacity, View } from "react-native";
import MapView, { Marker, Polyline, PROVIDER_GOOGLE } from "react-native-maps";
import Animated, { FadeInDown, FadeInUp } from "react-native-reanimated";

// Import map services
import { addDualMarkersAndStopPointsIndicators, addDualPolylines, addMultiplePolylines, geocodeMultipleLocations, getRegionForCoordinates, LocationData, MarkerData, RouteInfo, StopPoint } from "@/core/maps/maps-services";

interface RideOption {
  id: string;
  type: "economy" | "comfort" | "premium";
  name: string;
  price: string;
  estimatedTime: string;
  capacity: number;
  description: string;
  icon: string;
}

const MapResultsScreen = () => {
  const params = useLocalSearchParams();
  const pickup = params.pickup as string;
  const destination = params.destination as string;
  const stopsParam = params.stops as string;
//   const currentLocationParam = params.currentLocation as string;

  const [isLoading, setIsLoading] = useState(true);
  const [pickupLocation, setPickupLocation] = useState<LocationData | null>(null);
  const [destinationLocation, setDestinationLocation] = useState<LocationData | null>(null);
  const [stopLocations, setStopLocations] = useState<StopPoint[]>([]);
  const [routeInfo, setRouteInfo] = useState<RouteInfo | null>(null);
  const [markers, setMarkers] = useState<MarkerData[]>([]);
  const [selectedRideOption, setSelectedRideOption] = useState<string>("comfort");
  const [mapRegion, setMapRegion] = useState({
    latitude: 37.78825,
    longitude: -122.4324,
    latitudeDelta: 0.0922,
    longitudeDelta: 0.0421,
  });

  const mapRef = useRef<MapView>(null);

  const rideOptions: RideOption[] = [
    {
      id: "economy",
      type: "economy",
      name: "RideShare",
      price: "$12-15",
      estimatedTime: "5 min",
      capacity: 4,
      description: "Affordable everyday rides",
      icon: "🚗",
    },
    {
      id: "comfort",
      type: "comfort",
      name: "RideShare XL",
      price: "$18-22",
      estimatedTime: "3 min",
      capacity: 6,
      description: "More space and comfort",
      icon: "🚙",
    },
    {
      id: "premium",
      type: "premium",
      name: "RideShare Black",
      price: "$25-30",
      estimatedTime: "2 min",
      capacity: 4,
      description: "Premium vehicles and service",
      icon: "🖤",
    },
  ];

  useEffect(() => {
    initializeRoute();
  }, []);

  const initializeRoute = async () => {
    try {
      setIsLoading(true);

      // Parse stops if provided
      let stops: StopPoint[] = [];
      if (stopsParam) {
        try {
          stops = JSON.parse(stopsParam);
        } catch (error) {
          console.error("Error parsing stops:", error);
        }
      }

      // Geocode all locations
      const locations = await geocodeMultipleLocations({
        pickup,
        destination,
        stopPoints: stops,
      });

      if (!locations.pickup || !locations.destination) {
        Alert.alert("Error", "Could not find pickup or destination location");
        router.back();
        return;
      }

      setPickupLocation(locations.pickup);
      setDestinationLocation(locations.destination);
      setStopLocations(locations.stopPoints);

      // Get route information
      let route: RouteInfo | null = null;
      const stopCoordinates = locations.stopPoints.filter((stop : any) => stop.coordinates).map((stop : any) => stop.coordinates!);

      if (stopCoordinates.length > 0) {
        route = await addMultiplePolylines(locations.pickup.coordinates, locations.destination.coordinates, stopCoordinates);
      } else {
        route = await addDualPolylines(locations.pickup.coordinates, locations.destination.coordinates);
      }

      if (route) {
        setRouteInfo(route);
      }

      // Create markers
      const routeMarkers = addDualMarkersAndStopPointsIndicators(locations.pickup, locations.destination, locations.stopPoints);
      setMarkers(routeMarkers);

      // Calculate map region to fit all points
      const allCoordinates = [locations.pickup.coordinates, locations.destination.coordinates, ...stopCoordinates];

      const region = getRegionForCoordinates(allCoordinates);
      if (region) {
        setMapRegion(region);
        if (mapRef.current) {
          setTimeout(() => {
            mapRef.current?.animateToRegion(region, 1000);
          }, 500);
        }
      }
    } catch (error) {
      console.error("Error initializing route:", error);
      Alert.alert("Error", "Failed to load route information");
    } finally {
      setIsLoading(false);
    }
  };

  const handleBookRide = () => {
    const selectedOption = rideOptions.find((option) => option.id === selectedRideOption);

    Alert.alert("Confirm Booking", `Book ${selectedOption?.name} for ${selectedOption?.price}?`, [
      { text: "Cancel", style: "cancel" },
      {
        text: "Book Now",
        onPress: () => {
          // Navigate to booking confirmation or driver matching screen
          router.push({
            pathname: "/(screens)/(ride)/confirm-ride",
            params: {
              pickup,
              destination,
              stops: stopsParam || "[]",
              rideOption: selectedRideOption,
              routeInfo: JSON.stringify(routeInfo),
            },
          });
        },
      },
    ]);
  };

  const handleGoBack = () => {
    router.back();
  };

  const getMarkerColor = (type: string) => {
    switch (type) {
      case "pickup":
        return "#EF4444";
      case "destination":
        return "#10B981";
      case "stop":
        return "#F59E0B";
      default:
        return "#3B82F6";
    }
  };

  if (isLoading) {
    return (
      <SafeAreaView className="flex-1 bg-gray-50 justify-center items-center">
        <ActivityIndicator size="large" color="#3B82F6" />
        <Text className="mt-4 text-gray-600 font-medium">Planning your route...</Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-gray-50">
      {/* Header */}
      <Animated.View entering={FadeInUp.duration(500)} className="bg-white px-4 py-4 border-b border-gray-100">
        <View className="flex-row items-center pt-10">
          <TouchableOpacity onPress={handleGoBack} className="w-10 h-10 rounded-full bg-gray-100 items-center justify-center mr-4" activeOpacity={0.7}>
            <ArrowLeft size={20} color="#6B7280" />
          </TouchableOpacity>
          <View className="flex-1">
            <Text className="text-xl font-JakartaBold text-gray-900">Your Route</Text>
            {routeInfo && (
              <Text className="text-sm text-gray-600">
                {routeInfo.distance.distance} • {routeInfo.distance.duration}
              </Text>
            )}
          </View>
        </View>
      </Animated.View>

      {/* Map View */}
      <View className="flex-1">
        <MapView ref={mapRef} style={{ flex: 1 }} provider={PROVIDER_GOOGLE} initialRegion={mapRegion} customMapStyle={lightIceBlueMapStyle} showsUserLocation={false} showsMyLocationButton={false} showsCompass={true} showsScale={true}>
          {/* Route Polyline */}
          {routeInfo && routeInfo.coordinates.length > 0 && <Polyline coordinates={routeInfo.coordinates} strokeColor="#3B82F6" strokeWidth={4} lineDashPattern={[0]} />}

          {/* Markers */}
          {markers.map((marker) => (
            <Marker key={marker.id} coordinate={marker.coordinate} title={marker.title} description={marker.description} pinColor={getMarkerColor(marker.type)} />
          ))}
        </MapView>

        {/* Route Info Overlay */}
        {routeInfo && (
          <Animated.View entering={FadeInDown.delay(300)} className="absolute top-4 left-4 right-4">
            <View className="bg-white/95 backdrop-blur-md rounded-2xl p-4 shadow-lg">
              <View className="flex-row items-center justify-between">
                <View className="flex-row items-center">
                  <View className="w-8 h-8 rounded-full bg-blue-100 items-center justify-center mr-3">
                    <Navigation size={16} color="#3B82F6" />
                  </View>
                  <View>
                    <Text className="text-gray-900 font-bold text-lg">{routeInfo.distance.distance}</Text>
                    <Text className="text-gray-600 text-sm">{routeInfo.distance.duration} away</Text>
                  </View>
                </View>
                <View className="items-end">
                  <Text className="text-gray-600 text-sm">{stopLocations.length} stops</Text>
                </View>
              </View>
            </View>
          </Animated.View>
        )}
      </View>

      {/* Bottom Sheet with Ride Options */}
      <Animated.View entering={FadeInUp.delay(400)} className="bg-white rounded-t-3xl p-4 shadow-lg">
        {/* Trip Details */}
        <View className="mb-4">
          <Text className="text-lg font-bold text-gray-900 mb-3">Trip Details</Text>

          {/* Pickup */}
          <View className="flex-row items-center mb-2">
            <View className="w-3 h-3 rounded-full bg-red-500 mr-3" />
            <Text className="flex-1 text-gray-700 text-sm" numberOfLines={2}>
              {pickupLocation?.address}
            </Text>
          </View>

          {/* Stops */}
          {stopLocations.map((stop, index) => (
            <View key={stop.id} className="flex-row items-center mb-2 ml-1">
              <View className="w-2 h-2 rounded-full bg-yellow-500 mr-4" />
              <Text className="flex-1 text-gray-700 text-sm" numberOfLines={2}>
                Stop {index + 1}: {stop.address}
              </Text>
            </View>
          ))}

          {/* Destination */}
          <View className="flex-row items-center">
            <View className="w-3 h-3 rounded-full bg-green-500 mr-3" />
            <Text className="flex-1 text-gray-700 text-sm" numberOfLines={2}>
              {destinationLocation?.address}
            </Text>
          </View>
        </View>

        {/* Ride Options */}
        <View className="mb-4">
          <Text className="text-lg font-bold text-gray-900 mb-3">Choose your ride</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            {rideOptions.map((option) => (
              <TouchableOpacity key={option.id} onPress={() => setSelectedRideOption(option.id)} className={`mr-4 p-4 rounded-2xl border-2 min-w-[160px] ${selectedRideOption === option.id ? "border-blue-500 bg-blue-50" : "border-gray-200 bg-white"}`} activeOpacity={0.7}>
                <View className="flex-row items-center justify-between mb-2">
                  <Text className="text-2xl">{option.icon}</Text>
                  <Text className="font-bold text-lg text-gray-900">{option.price}</Text>
                </View>
                <Text className="font-bold text-gray-900 mb-1">{option.name}</Text>
                <Text className="text-gray-600 text-xs mb-2">{option.description}</Text>
                <View className="flex-row items-center">
                  <Clock size={12} color="#6B7280" />
                  <Text className="text-gray-600 text-xs ml-1">{option.estimatedTime}</Text>
                  <Users size={12} color="#6B7280" className="ml-2" />
                  <Text className="text-gray-600 text-xs ml-1">{option.capacity}</Text>
                </View>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>

        {/* Book Button */}
        <TouchableOpacity onPress={handleBookRide} className="bg-blue-600 rounded-2xl p-4 items-center" activeOpacity={0.8}>
          <Text className="text-white font-bold text-lg">Book {rideOptions.find((option) => option.id === selectedRideOption)?.name}</Text>
        </TouchableOpacity>
      </Animated.View>
    </SafeAreaView>
  );
};

export default MapResultsScreen;
