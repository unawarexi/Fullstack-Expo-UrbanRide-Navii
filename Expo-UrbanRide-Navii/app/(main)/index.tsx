import BottomSheet from "@gorhom/bottom-sheet";
import { MapPin, Menu, Search } from "lucide-react-native";
import { useCallback, useRef, useState } from "react";
import { SafeAreaView, ScrollView, Text, TouchableOpacity, View } from "react-native";

import CustomBottomSheet from "@/components/BottomSheets";
import MapComponent from "@/components/Map";
import RideItem from "@/components/RideItems";
import Sidebar from "@/components/sidebar"; // <-- import Sidebar
import { recentRides } from "@/core/data/data";
import { useLocationStore } from "@/global/use.location.store";
import { router } from "expo-router";

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

export default function Index() {
  // Use global location store
  const {
    userLatitude,
    userLongitude,
    userAddress,
    userLocationData,
  } = useLocationStore();

  const [isBottomSheetVisible, setIsBottomSheetVisible] = useState(true);
  const [isSidebarVisible, setIsSidebarVisible] = useState(false); // <-- sidebar state

  const bottomSheetRef = useRef<BottomSheet>(null);

  const handleSheetChange = useCallback((index: number) => {
    // If dragged past 90% (index 2), navigate to history screen
    if (index === 2) {
      try {
        router.push("/(screens)/(home)/history");
      } catch (error) {
        console.error("Navigation error:", error);
      }
    }
  }, []);

  const handleWhereToPress = () => {
    try {
      // Use global userLocationData for navigation param
      router.push({
        pathname: "/(screens)/(home)/search-input-field",
        params: {
          currentLocation: JSON.stringify(userLocationData),
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

  const handleMyLocationPress = () => {
    if ((window as any).animateToCurrentLocation) {
      (window as any).animateToCurrentLocation();
    }
  };

  const handleMenuPress = () => {
    setIsSidebarVisible(true); // <-- open sidebar
    setIsBottomSheetVisible(false); // <-- hide bottom sheet
  };

  const handleSidebarClose = () => {
    setIsSidebarVisible(false); // <-- close sidebar
    setIsBottomSheetVisible(true); // <-- show bottom sheet
  };

  // Add safety check for rides data
  const rides: Ride[] = Array.isArray(recentRides) && recentRides.length > 0 ? recentRides[0] : [];

  return (
    <SafeAreaView className="flex-1 bg-gray-50">
      {/* Map Layer - Bottom most */}
      <View className="absolute inset-0">
        <MapComponent
          // Remove onLocationUpdate/onLocationLoading, handled by global store
        />
      </View>

      {/* Floating UI Elements - Above Map */}
      <View className="absolute top-12 left-4 right-4 flex-row justify-between items-center">
        {/* Hamburger Menu - Left */}
        <TouchableOpacity
          onPress={handleMenuPress}
          className="bg-white rounded-full p-3 shadow-lg"
          style={{
            shadowColor: "#000",
            shadowOffset: { width: 0, height: 2 },
            shadowOpacity: 0.25,
            shadowRadius: 4,
            elevation: 5,
          }}
        >
          <Menu size={24} color="#374151" />
        </TouchableOpacity>

        {/* My Location Button - Right */}
        <TouchableOpacity
          onPress={handleMyLocationPress}
          className="bg-white rounded-full p-3 shadow-lg"
          style={{
            shadowColor: "#000",
            shadowOffset: { width: 0, height: 2 },
            shadowOpacity: 0.25,
            shadowRadius: 4,
            elevation: 5,
          }}
        >
          <MapPin size={24} color="#3B82F6" />
        </TouchableOpacity>
      </View>

      {/* Sidebar */}
      <Sidebar isVisible={isSidebarVisible} onClose={handleSidebarClose} />

      {/* Bottom Sheet - Above Map */}
      {isBottomSheetVisible && (
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
              {userLatitude && userLongitude && (
                <View className="bg-green-100 px-2 py-1 rounded-full">
                  <Text className="text-green-700 text-xs font-medium">Location Ready</Text>
                </View>
              )}
              {!userLatitude && (
                <View className="bg-yellow-100 px-2 py-1 rounded-full">
                  <Text className="text-yellow-700 text-xs font-medium">Getting Location...</Text>
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
    </SafeAreaView>
  );
}
