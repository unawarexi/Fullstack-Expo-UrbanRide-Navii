import { Clock, Star } from "lucide-react-native";
import React from "react";
import { Image, Text, TouchableOpacity, View } from "react-native";
import Animated, { FadeInRight } from "react-native-reanimated";

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

interface RideItemProps {
  ride: Ride;
  onPress: (ride: Ride) => void;
  index?: number;
  showStatus?: boolean;
  showFullDate?: boolean;
}

const AnimatedTouchable = Animated.createAnimatedComponent(TouchableOpacity);

const RideItem: React.FC<RideItemProps> = ({ ride, onPress, index = 0, showStatus = false, showFullDate = false }) => {
  // Utility functions
  const formatTime = (minutes: number) => {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return hours > 0 ? `${hours}h ${mins}m` : `${mins}m`;
  };

  const formatPrice = (price: string) => {
    return `$${parseFloat(price).toFixed(0)}`;
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    if (showFullDate) {
      return date.toLocaleDateString("en-US", {
        weekday: "short",
        month: "short",
        day: "numeric",
        year: "numeric",
      });
    }
    return date.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  };

  return (
    <AnimatedTouchable entering={FadeInRight.delay(index * 100)} onPress={() => onPress(ride)} className="bg-white rounded-2xl p-4 mb-3 shadow-sm border border-gray-100" activeOpacity={0.7}>
      {/* Route Information */}
      <View className="flex-row justify-between items-start mb-3">
        <View className="flex-1">
          <View className="flex-row items-center mb-2">
            <View className="w-3 h-3 bg-blue-600 rounded-full mr-3" />
            <Text className="text-gray-800 font-medium flex-1" numberOfLines={1}>
              {ride.origin_address}
            </Text>
          </View>
          <View className="flex-row items-center">
            <View className="w-3 h-3 bg-gray-400 rounded-full mr-3" />
            <Text className="text-gray-600 flex-1" numberOfLines={1}>
              {ride.destination_address}
            </Text>
          </View>
        </View>
        <Text className="text-blue-600 font-bold text-lg ml-4">{formatPrice(ride.fare_price)}</Text>
      </View>

      {/* Driver and Trip Details */}
      <View className="flex-row justify-between items-center pt-3 border-t border-gray-100">
        <View className="flex-row items-center">
          <Image source={{ uri: ride.driver.profile_image_url }} className="w-10 h-10 rounded-full mr-3" />
          <View>
            <Text className="text-gray-800 font-medium text-sm">
              {ride.driver.first_name} {ride.driver.last_name}
            </Text>
            <View className="flex-row items-center mt-1">
              <Star size={12} color="#FCD34D" fill="#FCD34D" />
              <Text className="text-gray-600 text-xs ml-1">{ride.driver.rating}</Text>
              {showStatus && (
                <>
                  <Text className="text-gray-400 text-xs ml-2">•</Text>
                  <Text className="text-gray-600 text-xs ml-2">{ride.driver.car_seats} seats</Text>
                </>
              )}
            </View>
          </View>
        </View>

        <View className="items-end">
          <View className="flex-row items-center">
            <Clock size={14} color="#6B7280" />
            <Text className="text-gray-600 text-sm ml-1">{formatTime(ride.ride_time)}</Text>
          </View>
          <Text className="text-gray-500 text-xs mt-1">{formatDate(ride.created_at)}</Text>
          {showStatus && (
            <View className="bg-green-100 px-2 py-1 rounded-full mt-1">
              <Text className="text-green-600 text-xs font-medium capitalize">{ride.payment_status}</Text>
            </View>
          )}
        </View>
      </View>
    </AnimatedTouchable>
  );
};

export default RideItem;
