import { images } from "@/constants/images";
import { useUser } from "@clerk/clerk-expo";
import { Calculator, Car, CreditCard, Gift, HelpCircle, Info, Shield, Smartphone, Star, User, X } from "lucide-react-native";
import React from "react";
import { Dimensions, Image, SafeAreaView, ScrollView, Text, TouchableOpacity, View } from "react-native";
import Animated, { useAnimatedStyle, useSharedValue, withTiming } from "react-native-reanimated";

const { width: SCREEN_WIDTH } = Dimensions.get("window");
const SIDEBAR_WIDTH = SCREEN_WIDTH * 0.8;

interface SidebarProps {
  isVisible: boolean;
  onClose: () => void;
}

const Sidebar: React.FC<SidebarProps> = ({ isVisible, onClose }) => {
  // Add error handling for useUser hook
  const userHook = useUser();
  const user = userHook?.user || null;

  // Fix the useSharedValue initialization with explicit number conversion
  const translateX = useSharedValue(Number(-SIDEBAR_WIDTH));
  const overlayOpacity = useSharedValue(Number(0));

  React.useEffect(() => {
    if (isVisible) {
      translateX.value = withTiming(Number(0), { duration: 300 });
      overlayOpacity.value = withTiming(Number(0.5), { duration: 300 });
    } else {
      translateX.value = withTiming(Number(-SIDEBAR_WIDTH), { duration: 300 });
      overlayOpacity.value = withTiming(Number(0), { duration: 300 });
    }
  }, [isVisible]);

  const sidebarStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: translateX.value }],
  }));

  const overlayStyle = useAnimatedStyle(() => ({
    opacity: overlayOpacity.value,
  }));

  const menuItems = [
    { id: "payment", title: "Payment", icon: CreditCard, color: "#3B82F6" },
    { id: "promotion", title: "Promotion", icon: Gift, color: "#3B82F6" },
    { id: "myrides", title: "My Rides", icon: Car, color: "#3B82F6" },
    { id: "safety", title: "Safety", icon: Shield, color: "#3B82F6" },
    { id: "expense", title: "Expense Your Rides", icon: Calculator, color: "#3B82F6" },
    { id: "support", title: "Support", icon: HelpCircle, color: "#3B82F6" },
    { id: "about", title: "About", icon: Info, color: "#3B82F6" },
  ];

  if (!isVisible) return null;

  return (
    <View className="absolute bg-gray-50 inset-0 z-[50]">
      {/* Overlay */}
      <Animated.View style={[overlayStyle]} className="absolute inset-0 bg-black">
        <TouchableOpacity className="flex-1" activeOpacity={1} onPress={onClose} />
      </Animated.View>

      {/* Sidebar */}
      <Animated.View
        style={[
          sidebarStyle,
          {
            width: SIDEBAR_WIDTH,
            position: "absolute",
            left: 0,
            top: 0,
            bottom: 0,
            backgroundColor: "#F9FAFB", // bg-gray-50
          },
        ]}
      >
        <SafeAreaView className="flex-1">
          <ScrollView className="flex-1 pt-8" showsVerticalScrollIndicator={false}>
            {/* Header with Close Button */}
            <View className="flex-row justify-between items-center px-6 py-4 border-b border-gray-200">
              <Image
                source={images.logo3}
                style={{
                  width: 100,
                  height: 50,
                }}
                resizeMode="contain"
              />
              <TouchableOpacity onPress={onClose} className="w-10 h-10 rounded-full bg-gray-100 items-center justify-center" activeOpacity={0.7}>
                <X size={20} color="#6B7280" />
              </TouchableOpacity>
            </View>

            {/* Profile Section */}
            <View className="px-6 py-3 border-b border-gray-200">
              <View className="flex-row items-center mb-2 pt-2">
                <View className="w-12 h-12 rounded-full bg-blue-100 items-center justify-center mr-4">{user?.imageUrl ? <Image source={{ uri: user.imageUrl }} className="w-12 h-12 rounded-full" /> : <User size={32} color="#3B82F6" />}</View>
                <View className="flex-1">
                  <Text className="text-lg font-JakartaBold text-gray-800">{user?.firstName ? `${user.firstName} ${user.lastName || ""}` : "User"}</Text>
                  <View className="flex-row items-center mt-1">
                    <Star size={16} color="#F59E0B" fill="#F59E0B" />
                    <Text className="ml-2 text-gray-600 font-JakartaMedium">4.8</Text>
                  </View>
                </View>
              </View>
            </View>

            {/* App Update Section */}
            <View className="mx-6 my-4">
              <View className="bg-blue-600 rounded-2xl p-4 relative overflow-hidden">
                <View className="absolute top-0 right-0 w-20 h-20 bg-white/10 rounded-full -mr-10 -mt-10" />
                <View className="absolute bottom-0 left-0 w-16 h-16 bg-white/10 rounded-full -ml-8 -mb-8" />

                <View className="flex-row items-center justify-between">
                  <View className="flex-1">
                    <View className="flex-row items-center mb-2">
                      <Smartphone size={20} color="white" />
                      <Text className="ml-2 text-white font-JakartaBold text-base">Your app needs an update</Text>
                    </View>
                    <Text className="text-blue-100 text-sm font-JakartaMedium mb-3">Get the latest features and improvements</Text>
                    <TouchableOpacity className="bg-white/20 rounded-full px-4 py-2 self-start">
                      <Text className="text-white font-JakartaBold text-sm">Update Now</Text>
                    </TouchableOpacity>
                  </View>
                  <View className="w-12 h-12 bg-white/20 rounded-full items-center justify-center ml-4">
                    <Smartphone size={24} color="white" />
                  </View>
                </View>
              </View>
            </View>

            {/* Menu Items */}
            <View className="px-6 py-2">
              {menuItems.map((item, index) => (
                <TouchableOpacity key={item.id} className="flex-row items-center py-2 border-b border-gray-50" activeOpacity={0.7}>
                  <View className="w-12 h-12 rounded-full items-center justify-center mr-4" style={{ backgroundColor: `${item.color}15` }}>
                    <item.icon size={20} color={item.color} />
                  </View>
                  <Text className="flex-1 text-gray-800 font-JakartaBold text-base">{item.title}</Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* App Version */}
            <View className="px-6 py-4 mt-4">
              <Text className="text-gray-400 text-sm font-JakartaMedium text-center">Version 2.1.4</Text>
            </View>
          </ScrollView>
        </SafeAreaView>
      </Animated.View>
    </View>
  );
};

export default Sidebar;
