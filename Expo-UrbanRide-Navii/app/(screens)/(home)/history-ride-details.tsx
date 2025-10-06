import { router, useLocalSearchParams } from "expo-router";
import { Car, ChevronLeft, Clock, CreditCard, MessageCircle, Navigation, Phone, Star } from "lucide-react-native";
import React, { useEffect, useState } from "react";
import { Alert, Image, SafeAreaView, ScrollView, Text, TouchableOpacity, View } from "react-native";
import Animated, { FadeInDown, FadeInLeft, FadeInRight, FadeInUp, useAnimatedStyle, useSharedValue, withSpring } from "react-native-reanimated";

// Types (same as history screen)
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

const AnimatedTouchable = Animated.createAnimatedComponent(TouchableOpacity);

const HistoryRideDetails = () => {
  const { rideData } = useLocalSearchParams();
  const [ride, setRide] = useState<Ride | null>(null);
  const buttonScale = useSharedValue(1);

  useEffect(() => {
    if (rideData && typeof rideData === "string") {
      try {
        const parsedRide = JSON.parse(rideData);
        setRide(parsedRide);
      } catch (error) {
        console.error("Error parsing ride data:", error);
        router.back();
      }
    }
  }, [rideData]);

  // Utility functions
  const formatTime = (minutes: number) => {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return hours > 0 ? `${hours}h ${mins}m` : `${mins}m`;
  };

  const formatPrice = (price: string) => {
    return `$${parseFloat(price).toFixed(2)}`;
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString("en-US", {
      weekday: "long",
      month: "long",
      day: "numeric",
      year: "numeric",
    });
  };

  const formatDateTime = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleString("en-US", {
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  // Navigation handlers
  const handleBackPress = () => {
    router.back();
  };

  const handleReorderRide = () => {
    if (!ride) return;

    Alert.alert("Reorder Ride", `Book the same ride from ${ride.origin_address} to ${ride.destination_address}?`, [
      { text: "Cancel", style: "cancel" },
      {
        text: "Book Now",
        style: "default",
        onPress: () => {
          // Here you would typically navigate to booking screen with pre-filled data
          console.log("Reordering ride:", ride);
          Alert.alert("Success", "Redirecting to booking...");
        },
      },
    ]);
  };

  const animatedButtonStyle = useAnimatedStyle(() => {
    return {
      transform: [{ scale: buttonScale.value }],
    };
  });

  const handleButtonPressIn = () => {
    buttonScale.value = withSpring(0.95);
  };

  const handleButtonPressOut = () => {
    buttonScale.value = withSpring(1);
  };

  if (!ride) {
    return (
      <SafeAreaView className="flex-1 bg-blue-50 justify-center items-center">
        <Text className="text-gray-600">Loading ride details...</Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-gray-50">
      {/* Header */}
      <Animated.View entering={FadeInUp} className="bg-white px-4 py-3 border-b border-gray-200">
        <View className="flex-row items-center justify-between pt-8">
          <TouchableOpacity onPress={handleBackPress} className="p-2 -ml-2" activeOpacity={0.7}>
            <ChevronLeft size={24} color="#374151" />
          </TouchableOpacity>

          <Text className="text-xl font-bold text-gray-800">Ride Details</Text>

          <View className="w-8" />
        </View>
      </Animated.View>

      <ScrollView className="flex-1" showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 120 }}>
        {/* Trip Status Card */}
        <Animated.View entering={FadeInUp.delay(100)} className="bg-white mx-4 mt-4 rounded-2xl p-4 shadow-sm border border-gray-200">
          <View className="flex-row items-center justify-between mb-3">
            <Text className="text-lg font-bold text-gray-800">Trip Completed</Text>
            <View className="bg-green-100 px-3 py-1 rounded-full">
              <Text className="text-green-600 text-sm font-medium capitalize">{ride.payment_status}</Text>
            </View>
          </View>
          <Text className="text-gray-600">{formatDate(ride.created_at)}</Text>
          <Text className="text-gray-500 text-sm">{formatDateTime(ride.created_at)}</Text>
        </Animated.View>

        {/* Route Information */}
        <Animated.View entering={FadeInLeft.delay(200)} className="bg-white mx-4 mt-4 rounded-2xl p-4 shadow-sm border border-gray-200">
          <Text className="text-lg font-bold text-gray-800 mb-4">Route</Text>

          <View className="space-y-4">
            {/* Origin */}
            <View className="flex-row items-start">
              <View className="w-4 h-4 bg-blue-600 rounded-full mr-3 mt-1" />
              <View className="flex-1">
                <Text className="text-gray-500 text-sm">From</Text>
                <Text className="text-gray-800 font-medium">{ride.origin_address}</Text>
              </View>
            </View>

            {/* Dotted line */}
            <View className="ml-2">
              <View className="w-0.5 h-8  border-l-2 border-dashed border-gray-500" />
            </View>

            {/* Destination */}
            <View className="flex-row items-start">
              <View className="w-4 h-4 bg-gray-400 rounded-full mr-3 mt-1" />
              <View className="flex-1">
                <Text className="text-gray-500 text-sm">To</Text>
                <Text className="text-gray-800 font-medium">{ride.destination_address}</Text>
              </View>
            </View>
          </View>

          {/* Trip Stats */}
          <View className="flex-row justify-between mt-6 pt-4 border-t border-gray-200">
            <View className="items-center">
              <Clock size={20} color="#6B7280" />
              <Text className="text-gray-600 text-sm mt-1">Duration</Text>
              <Text className="text-gray-800 font-semibold">{formatTime(ride.ride_time)}</Text>
            </View>
            <View className="items-center">
              <Navigation size={20} color="#6B7280" />
              <Text className="text-gray-600 text-sm mt-1">Distance</Text>
              <Text className="text-gray-800 font-semibold">{(ride.ride_time * 0.5).toFixed(1)} km</Text>
            </View>
            <View className="items-center">
              <CreditCard size={20} color="#6B7280" />
              <Text className="text-gray-600 text-sm mt-1">Fare</Text>
              <Text className="text-blue-600 font-bold text-lg">{formatPrice(ride.fare_price)}</Text>
            </View>
          </View>
        </Animated.View>

        {/* Driver Information */}
        <Animated.View entering={FadeInRight.delay(300)} className="bg-white mx-4 mt-4 rounded-2xl p-4 shadow-sm border border-gray-200">
          <Text className="text-lg font-bold text-gray-800 mb-4">Driver</Text>

          <View className="flex-row items-center">
            <Image source={{ uri: ride.driver.profile_image_url }} className="w-16 h-16 rounded-full mr-4" />
            <View className="flex-1">
              <Text className="text-gray-800 font-semibold text-lg">
                {ride.driver.first_name} {ride.driver.last_name}
              </Text>
              <View className="flex-row items-center mt-1">
                <Star size={14} color="#FCD34D" fill="#FCD34D" />
                <Text className="text-gray-600 ml-1">{ride.driver.rating}</Text>
                <Text className="text-gray-400 mx-2"></Text>
                <Text className="text-gray-600">{ride.driver.car_seats} seats</Text>
              </View>
            </View>
            <View className="flex-row space-x-2">
              <TouchableOpacity className="bg-blue-50 p-3 rounded-full">
                <MessageCircle size={20} color="#3B82F6" />
              </TouchableOpacity>
              <TouchableOpacity className="bg-green-50 p-3 rounded-full">
                <Phone size={20} color="#10B981" />
              </TouchableOpacity>
            </View>
          </View>
        </Animated.View>

        {/* Vehicle Information */}
        <Animated.View entering={FadeInUp.delay(400)} className="bg-white mx-4 mt-4 rounded-2xl p-4 shadow-sm border border-gray-200">
          <Text className="text-lg font-bold text-gray-800 mb-4">Vehicle</Text>

          <View className="flex-row items-center">
            <Image source={{ uri: ride.driver.car_image_url }} className="w-20 h-16 rounded-xl mr-4" resizeMode="cover" />
            <View className="flex-1">
              <Text className="text-gray-800 font-semibold">Comfort</Text>
              <Text className="text-gray-600 text-sm">{ride.driver.car_seats} seats available</Text>
              <View className="flex-row items-center mt-2">
                <Car size={14} color="#6B7280" />
                <Text className="text-gray-500 text-sm ml-1">License: ABC-{ride.driver.driver_id}23</Text>
              </View>
            </View>
          </View>
        </Animated.View>

        {/* Payment Summary */}
        <Animated.View entering={FadeInUp.delay(500)} className="bg-white mx-4 mt-4 rounded-2xl p-4 shadow-sm border  border-gray-200">
          <Text className="text-lg font-bold text-gray-800 mb-4">Payment Summary</Text>

          <View className="space-y-3">
            <View className="flex-row justify-between">
              <Text className="text-gray-600">Base Fare</Text>
              <Text className="text-gray-800">{formatPrice((parseFloat(ride.fare_price) * 0.8).toString())}</Text>
            </View>
            <View className="flex-row justify-between">
              <Text className="text-gray-600">Distance</Text>
              <Text className="text-gray-800">{formatPrice((parseFloat(ride.fare_price) * 0.15).toString())}</Text>
            </View>
            <View className="flex-row justify-between">
              <Text className="text-gray-600">Time</Text>
              <Text className="text-gray-800">{formatPrice((parseFloat(ride.fare_price) * 0.05).toString())}</Text>
            </View>
            <View className="border-t border-gray-200 pt-3">
              <View className="flex-row justify-between">
                <Text className="text-lg font-bold text-gray-800">Total</Text>
                <Text className="text-lg font-bold text-blue-600">{formatPrice(ride.fare_price)}</Text>
              </View>
            </View>
          </View>
        </Animated.View>
      </ScrollView>

      {/* Bottom Action Button */}
      <Animated.View entering={FadeInDown.delay(600)} className="absolute bottom-0 left-0 right-0 bg-gray-50 p-4">
        <AnimatedTouchable style={animatedButtonStyle} onPressIn={handleButtonPressIn} onPressOut={handleButtonPressOut} onPress={handleReorderRide} className="bg-blue-600 rounded-full py-4 px-6 shadow-lg" activeOpacity={0.9}>
          <Text className="text-white text-center font-JakartaBold text-lg">Reorder This Ride</Text>
        </AnimatedTouchable>
      </Animated.View>
    </SafeAreaView>
  );
};

export default HistoryRideDetails;
