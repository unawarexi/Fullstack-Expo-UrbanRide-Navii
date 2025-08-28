import { recentRides } from "@/core/data/data";
import { formatDate, formatPrice, formatTime } from "@/core/utils/formatters";
import { router } from "expo-router";
import { ChevronLeft, Clock, MapPin, Star } from "lucide-react-native";
import React from "react";
import { FlatList, Image, ListRenderItem, SafeAreaView, Text, TouchableOpacity, View } from "react-native";
import Animated, { FadeInRight, FadeInUp } from "react-native-reanimated";

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

const AnimatedTouchable = Animated.createAnimatedComponent(TouchableOpacity);

const History = () => {
  const rides: Ride[] = recentRides[0] || [];



  // Navigation handlers
  const handleBackPress = () => {
    router.back();
  };

  const handleRidePress = (ride: Ride) => {
    router.push({
      pathname: "/(screens)/(home)/history-ride-details",
      params: {
        rideData: JSON.stringify(ride),
      },
    });
  };

  // Render individual ride item
  const renderRideItem: ListRenderItem<Ride> = ({ item, index }) => {
    return (
      <AnimatedTouchable entering={FadeInRight.delay(index * 100)} onPress={() => handleRidePress(item)}
        className="bg-white rounded-2xl p-4 mb-3 mx-4 shadow-sm border border-gray-200" activeOpacity={0.7}>
        {/* Route Information */}
        <View className="flex-row justify-between items-start mb-3">
          <View className="flex-1">
            <View className="flex-row items-center mb-2">
              <View className="w-3 h-3 bg-blue-600 rounded-full mr-3" />
              <Text className="text-gray-800 font-medium flex-1" numberOfLines={1}>
                {item.origin_address}
              </Text>
            </View>
            <View className="flex-row items-center">
              <View className="w-3 h-3 bg-gray-400 rounded-full mr-3" />
              <Text className="text-gray-600 flex-1" numberOfLines={1}>
                {item.destination_address}
              </Text>
            </View>
          </View>
          <Text className="text-blue-600 font-bold text-lg ml-4">{formatPrice(item.fare_price)}</Text>
        </View>

        {/* Driver and Trip Details */}
        <View className="flex-row justify-between items-center pt-3 border-t border-gray-200">
          <View className="flex-row items-center">
            <Image source={{ uri: item.driver.profile_image_url }} className="w-10 h-10 rounded-full mr-3" />
            <View>
              <Text className="text-gray-800 font-medium text-sm">
                {item.driver.first_name} {item.driver.last_name}
              </Text>
              <View className="flex-row items-center mt-1">
                <Star size={12} color="#FCD34D" fill="#FCD34D" />
                <Text className="text-gray-600 text-xs ml-1">{item.driver.rating}</Text>
                <Text className="text-gray-400 text-xs ml-2">•</Text>
                <Text className="text-gray-600 text-xs ml-2">{item.driver.car_seats} seats</Text>
              </View>
            </View>
          </View>

          <View className="items-end">
            <View className="flex-row items-center">
              <Clock size={14} color="#6B7280" />
              <Text className="text-gray-600 text-sm ml-1">{formatTime(item.ride_time)}</Text>
            </View>
            <Text className="text-gray-500 text-xs mt-1">{formatDate(item.created_at)}</Text>
            <View className="bg-green-100 px-2 py-1 rounded-full mt-1">
              <Text className="text-green-600 text-xs font-medium capitalize">{item.payment_status}</Text>
            </View>
          </View>
        </View>
      </AnimatedTouchable>
    );
  };

  // Header component
  const ListHeaderComponent = () => (
    <Animated.View entering={FadeInUp} className="px-4 py-2">
      <Text className="text-gray-600 text-sm">
        {rides.length} ride{rides.length !== 1 ? "s" : ""} found
      </Text>
    </Animated.View>
  );

  // Empty state component
  const ListEmptyComponent = () => (
    <Animated.View entering={FadeInUp} className="flex-1 justify-center items-center py-20">
      <View className="bg-blue-50 p-6 rounded-full mb-4">
        <MapPin size={32} color="#3B82F6" />
      </View>
      <Text className="text-gray-800 text-lg font-semibold mb-2">No rides yet</Text>
      <Text className="text-gray-600 text-center px-8">Start your journey and your ride history will appear here</Text>
    </Animated.View>
  );

  return (
    <SafeAreaView className="flex-1 bg-gray-50">
      {/* Header */}
      <Animated.View entering={FadeInUp} className="bg-white px-4 py-3 border-b border-gray-200">
        <View className="flex-row items-center justify-between pt-8">
          <TouchableOpacity onPress={handleBackPress} className="p-2 -ml-2" activeOpacity={0.7}>
            <ChevronLeft size={24} color="#374151" />
          </TouchableOpacity>

          <Text className="text-xl font-bold text-gray-800">Ride History</Text>

          <View className="w-8" />
        </View>
      </Animated.View>

      {/* Rides List */}
      <FlatList
        data={rides}
        keyExtractor={(item) => item.ride_id}
        renderItem={renderRideItem}
        ListHeaderComponent={ListHeaderComponent}
        ListEmptyComponent={ListEmptyComponent}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{
          paddingVertical: 8,
          flexGrow: 1,
        }}
        initialNumToRender={10}
        maxToRenderPerBatch={5}
        windowSize={10}
        removeClippedSubviews={true}
        getItemLayout={(data, index) => ({
          length: 140, // Approximate height of each item
          offset: 140 * index,
          index,
        })}
      />
    </SafeAreaView>
  );
};

export default History;
