import { useUser } from "@clerk/clerk-expo";
import { MapPin, Menu, Search } from "lucide-react-native";
import { useCallback, useEffect, useRef, useState } from "react";
import { ActivityIndicator, Alert, SafeAreaView, ScrollView, Text, TouchableOpacity, View } from "react-native";
import MapView, { Marker, PROVIDER_GOOGLE } from "react-native-maps";

import BottomSheet from "@gorhom/bottom-sheet";

import CustomBottomSheet from "@/components/BottomSheets";
import RideItem from "@/components/RideItems";
import { recentRides } from "@/core/data/data";
import { router } from "expo-router";
// import Sidebar from "../(screens)/(home)/sidebar";

// Import map services
import { getCurrentLocation, LocationData } from "@/core/maps/maps-services";
import { lightIceBlueMapStyle } from "@/core/themes/map-themes";

// Types
interface Driver {
  driver_id: string;
  first_name: string;
  last_name: string;
  profile_image_url: string;
  car_image_url: string;
  car_seats: number;
  rating: string;
}

interface Ride {
  ride_id: string;
  origin_address: string;
  destination_address: string;
  origin_latitude: string;
  origin_longitude: string;
  destination_latitude: string;
  destination_longitude: string;
  ride_time: number;
  fare_price: string;
  payment_status: string;
  driver_id: number;
  user_id: string;
  created_at: string;
  driver: Driver;
}

interface MapRegion {
  latitude: number;
  longitude: number;
  latitudeDelta: number;
  longitudeDelta: number;
}

const Index = () => {
  const { user, isLoaded } = useUser();
  const [isBottomSheetVisible, setIsBottomSheetVisible] = useState(true);
  // const [isSidebarVisible, setIsSidebarVisible] = useState(false);
  const [currentLocation, setCurrentLocation] = useState<LocationData | null>(null);
  const [mapRegion, setMapRegion] = useState<MapRegion>({
    latitude: 37.78825,
    longitude: -122.4324,
    latitudeDelta: 0.0922,
    longitudeDelta: 0.0421,
  });
  const [isLoadingLocation, setIsLoadingLocation] = useState(true);
  const [isMounted, setIsMounted] = useState(true); // Add mounted state

  const bottomSheetRef = useRef<BottomSheet>(null);
  const mapRef = useRef<MapView>(null);

  // Load user's current location on component mount
  useEffect(() => {
    console.log("Google Maps API Key:", process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY ? "Loaded" : "Missing");
    loadCurrentLocation();

    // Cleanup function
    return () => {
      setIsMounted(false);
    };
  }, []);

  const handleSheetChange = useCallback(
    (index: number) => {
      // Add safety check for mounted component
      if (!isMounted) return;

      // If dragged past 90% (index 2), navigate to history screen
      if (index === 2) {
        try {
          router.push("/(screens)/(home)/history");
        } catch (error) {
          console.error("Navigation error:", error);
        }
      }
    },
    [isMounted]
  );

  const loadCurrentLocation = async () => {
    try {
      setIsLoadingLocation(true);
      const location = await getCurrentLocation();

      // Check if component is still mounted before updating state
      if (!isMounted) return;

      if (location) {
        setCurrentLocation(location);
        const newRegion = {
          latitude: location.coordinates.latitude,
          longitude: location.coordinates.longitude,
          latitudeDelta: 0.01,
          longitudeDelta: 0.01,
        };
        setMapRegion(newRegion);

        // Animate to user's location with safety check
        if (mapRef.current && isMounted) {
          setTimeout(() => {
            if (mapRef.current && isMounted) {
              mapRef.current.animateToRegion(newRegion, 1000);
            }
          }, 100);
        }
      }
    } catch (error) {
      console.error("Error loading current location:", error);
      if (isMounted) {
        Alert.alert("Location Error", "Failed to get your current location");
      }
    } finally {
      if (isMounted) {
        setIsLoadingLocation(false);
      }
    }
  };

  // Show loading while user data is being fetched
  if (!isLoaded) {
    return (
      <SafeAreaView className="flex-1 bg-gray-50 justify-center items-center">
        <ActivityIndicator size="large" color="#3B82F6" />
        <Text className="mt-4 text-gray-600">Loading...</Text>
      </SafeAreaView>
    );
  }

  const handleWhereToPress = () => {
    try {
      // Navigate to search screen with current location
      router.push({
        pathname: "/(screens)/(home)/search-input-field",
        params: {
          currentLocation: JSON.stringify(currentLocation),
        },
      });
    } catch (error) {
      console.error("Navigation error:", error);
    }
  };

  const handleRidePress = (ride: Ride) => {
    try {
      router.push({
        pathname: "/(screens)/(home)/history-ride-details",
        params: {
          rideData: JSON.stringify(ride),
        },
      });
    } catch (error) {
      console.error("Navigation error:", error);
    }
  };

  // const handleMenuPress = () => {
  //   if (!isMounted) return;
  //   setIsSidebarVisible(true);
  //   setIsBottomSheetVisible(false);
  // };

  // const handleSidebarClose = () => {
  //   if (!isMounted) return;
  //   setIsSidebarVisible(false);
  //   setIsBottomSheetVisible(true);
  // };

  const handleMyLocationPress = () => {
    if (isLoadingLocation) return;

    if (currentLocation && mapRef.current && isMounted) {
      const region = {
        latitude: currentLocation.coordinates.latitude,
        longitude: currentLocation.coordinates.longitude,
        latitudeDelta: 0.01,
        longitudeDelta: 0.01,
      };
      mapRef.current.animateToRegion(region, 1000);
    } else {
      loadCurrentLocation();
    }
  };

  // Add safety check for rides data
  const rides: Ride[] = Array.isArray(recentRides) && recentRides.length > 0 ? recentRides[0] : [];

  const handleMapReady = useCallback(() => {
    console.log("Map is ready");
    // Force a region update when map is ready with safety checks
    if (currentLocation && mapRef.current && isMounted) {
      const region = {
        latitude: currentLocation.coordinates.latitude,
        longitude: currentLocation.coordinates.longitude,
        latitudeDelta: 0.01,
        longitudeDelta: 0.01,
      };
      setTimeout(() => {
        if (mapRef.current && isMounted) {
          mapRef.current.animateToRegion(region, 1000);
        }
      }, 500);
    }
  }, [currentLocation, isMounted]);

  const handleRegionChange = useCallback(
    (region: MapRegion) => {
      if (isMounted) {
        setMapRegion(region);
      }
    },
    [isMounted]
  );

  return (
    <SafeAreaView className="flex-1 bg-gray-50">
      <View className="flex-1">
        <View className="flex-1 rounded-2xl mb-4 overflow-hidden relative">
          <MapView
            ref={mapRef}
            style={{ flex: 1 }}
            provider={PROVIDER_GOOGLE}
            region={mapRegion} // Use region instead of initialRegion
            customMapStyle={lightIceBlueMapStyle}
            showsUserLocation={true}
            showsMyLocationButton={false}
            showsCompass={true}
            showsScale={true}
            showsBuildings={true}
            showsTraffic={false}
            showsIndoors={true}
            showsPointsOfInterest={true}
            mapType="standard" // Explicitly set map type
            onRegionChange={handleRegionChange}
            onMapReady={handleMapReady}
          >
            {/* Current Location Marker with safety check */}
            {currentLocation && currentLocation.coordinates && <Marker coordinate={currentLocation.coordinates} title="Your Location" description={currentLocation.address} pinColor="#3B82F6" />}
          </MapView>

          <View className="absolute top-14 mx-4 left-4 right-4 flex-row justify-between items-start">
            <TouchableOpacity className="w-12 h-12 rounded-full items-center justify-center bg-white/90 backdrop-blur-md shadow-lg active:opacity-80">
              <Menu size={24} color="#374151" />
            </TouchableOpacity>

            {/* My Location Button */}
            <TouchableOpacity onPress={handleMyLocationPress} className="w-12 h-12 rounded-full items-center justify-center bg-white/90 backdrop-blur-md shadow-lg active:opacity-80" disabled={isLoadingLocation}>
              {isLoadingLocation ? <ActivityIndicator size="small" color="#3B82F6" /> : <MapPin size={20} color="#3B82F6" />}
            </TouchableOpacity>
          </View>

          {/* Map placeholder content when location is loading */}
          {isLoadingLocation && (
            <View className="absolute inset-0 justify-center items-center bg-blue-50">
              <ActivityIndicator size="large" color="#3B82F6" />
              <Text className="text-blue-600 mt-2 font-medium">Loading your location...</Text>
            </View>
          )}
        </View>
      </View>

      {/* Custom Bottom Sheet - Only show when sidebar is not visible */}
      {isBottomSheetVisible && isMounted && (
        <CustomBottomSheet
          ref={bottomSheetRef}
          isVisible={isBottomSheetVisible}
          onClose={() => setIsBottomSheetVisible(false)}
          snapPoints={["35%", "70%", "90%", "95%"]}
          initialSnapIndex={0}
          enableSnapping={true}
          enablePanDownToClose={false}
          enableBackdrop={false}
          backgroundStyle={{
            backgroundColor: "#fff",
            borderTopLeftRadius: 24,
            borderTopRightRadius: 24,
            shadowColor: "#000",
            shadowOffset: { width: 0, height: -2 },
            shadowOpacity: 0.1,
            shadowRadius: 8,
            elevation: 8,
          }}
          handleIndicatorStyle={{
            backgroundColor: "#D1D5DB",
            width: 40,
            height: 4,
          }}
          onChange={handleSheetChange}
          scrollable={true}
        >
          <View className="flex-1">
            {/* Blue Promo Banner - Fixed */}
            <View className="bg-blue-600 mx-4 mt-4 p-4 rounded-2xl">
              <View className="flex-row justify-between items-center">
                <View className="flex-1">
                  <Text className="text-white font-bold text-lg">Save 20% on your next ride</Text>
                  <Text className="text-blue-100 mt-1">Use code SAVE20 for instant discount</Text>
                </View>
                <View className="bg-white/20 p-3 rounded-full">
                  <Text className="text-white font-bold text-lg">20%</Text>
                </View>
              </View>
            </View>

            {/* Where To Input - Fixed */}
            <TouchableOpacity onPress={handleWhereToPress} className="mx-4 mt-4 bg-gray-100 rounded-2xl p-4 flex-row items-center border border-gray-200" activeOpacity={0.7}>
              <Search size={20} color="#6B7280" />
              <Text className="ml-3 text-gray-500 flex-1 text-base">Where to?</Text>
              {currentLocation && (
                <View className="bg-green-100 px-2 py-1 rounded-full">
                  <Text className="text-green-700 text-xs font-medium">Location Ready</Text>
                </View>
              )}
            </TouchableOpacity>

            {/* Recent Rides Section - Scrollable */}
            <View className="flex-1 mt-6">
              <View className="px-4 mb-4 flex-row justify-between items-center">
                <Text className="text-lg font-bold text-gray-800">Recent Rides</Text>
                <TouchableOpacity
                  onPress={() => {
                    try {
                      router.push("/(screens)/(home)/history");
                    } catch (error) {
                      console.error("Navigation error:", error);
                    }
                  }}
                >
                  <Text className="text-blue-600 font-medium">See all</Text>
                </TouchableOpacity>
              </View>

              <ScrollView className="flex-1 px-4" showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 20 }}>
                {rides.slice(0, 4).map((ride, index) => (
                  <RideItem key={ride.ride_id} ride={ride} onPress={handleRidePress} index={index} />
                ))}

                {/* Show more rides hint when expanded */}
                {rides.length > 4 && (
                  <TouchableOpacity
                    onPress={() => {
                      try {
                        router.push("/(screens)/(home)/history");
                      } catch (error) {
                        console.error("Navigation error:", error);
                      }
                    }}
                    className="bg-blue-50 border-2 border-dashed border-blue-200 rounded-2xl p-6 items-center justify-center"
                  >
                    <Text className="text-blue-600 font-medium">Drag up to see all {rides.length} rides</Text>
                    <Text className="text-blue-400 text-sm mt-1">or tap to view history</Text>
                  </TouchableOpacity>
                )}
              </ScrollView>
            </View>
          </View>
        </CustomBottomSheet>
      )}

      {/* Sidebar Component */}
      {/* {isMounted && <Sidebar isVisible={isSidebarVisible} onClose={handleSidebarClose} />} */}
    </SafeAreaView>
  );
};

export default Index;
