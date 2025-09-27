import { images } from "@/constants/images";
import { useAuth, useUser } from "@clerk/clerk-expo";
import { useRouter } from "expo-router";
import { Calculator, Car, CreditCard, Gift, HelpCircle, Info, LogOut, Shield, Smartphone, Star, User, X } from "lucide-react-native";
import React from "react";
import { Dimensions, Image, SafeAreaView, ScrollView, Text, TouchableOpacity, View } from "react-native";
import Animated, { useAnimatedStyle, useSharedValue, withTiming } from "react-native-reanimated";

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get("window");
const SIDEBAR_WIDTH = SCREEN_WIDTH * 0.75; // Reduced width

interface SidebarProps {
  isVisible: boolean;
  onClose: () => void;
}

const Sidebar: React.FC<SidebarProps> = ({ isVisible, onClose }) => {
  const userHook = useUser();
  const user = userHook?.user || null;
  const { signOut } = useAuth();
  const router = useRouter();

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
    height: SCREEN_HEIGHT,
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

  // Sign out handler
  const handleSignOut = async () => {
    await signOut();
    onClose();
    router.replace("/(auth)/sign-in");
  };

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
            backgroundColor: "#F9FAFB",
          },
        ]}
      >
        <SafeAreaView className="flex-1">
          <ScrollView className="flex-1 pt-4" showsVerticalScrollIndicator={false} contentContainerStyle={{ minHeight: SCREEN_HEIGHT }}>
            {/* Header with Close Button */}
            <View className="flex-row justify-between items-center px-4 py-2 border-b border-gray-200">
              <Image
                source={images.logo3}
                style={{
                  width: 80, // reduced
                  height: 40, // reduced
                }}
                resizeMode="contain"
              />
              <TouchableOpacity onPress={onClose} className="w-8 h-8 rounded-full bg-gray-100 items-center justify-center" activeOpacity={0.7}>
                <X size={18} color="#6B7280" />
              </TouchableOpacity>
            </View>

            {/* Profile Section */}
            <View className="px-4 py-2 border-b border-gray-200">
              <View className="flex-row items-center mb-1 pt-1">
                <View className="w-10 h-10 rounded-full bg-blue-100 items-center justify-center mr-3">
                  {user?.imageUrl ? (
                    <Image source={{ uri: user.imageUrl }} className="w-10 h-10 rounded-full" />
                  ) : (
                    <User size={24} color="#3B82F6" />
                  )}
                </View>
                <View className="flex-1">
                  <Text className="text-base font-JakartaBold text-gray-800">
                    {user?.firstName ? `${user.firstName} ${user.lastName || ""}` : "User"}
                  </Text>
                  <View className="flex-row items-center mt-0.5">
                    <Star size={12} color="#F59E0B" fill="#F59E0B" />
                    <Text className="ml-1 text-gray-600 font-JakartaMedium text-xs">4.8</Text>
                  </View>
                </View>
              </View>
            </View>

            {/* App Update Section */}
            <View className="mx-4 my-2">
              <View className="bg-blue-600 rounded-xl p-3 relative overflow-hidden">
                <View className="absolute top-0 right-0 w-14 h-14 bg-white/10 rounded-full -mr-7 -mt-7" />
                <View className="absolute bottom-0 left-0 w-10 h-10 bg-white/10 rounded-full -ml-5 -mb-5" />

                <View className="flex-row items-center justify-between">
                  <View className="flex-1">
                    <View className="flex-row items-center mb-1">
                      <Smartphone size={16} color="white" />
                      <Text className="ml-1 text-white font-JakartaBold text-sm">Your app needs an update</Text>
                    </View>
                    <Text className="text-blue-100 text-xs font-JakartaMedium mb-2">Get the latest features and improvements</Text>
                    <TouchableOpacity className="bg-white/20 rounded-full px-3 py-1 self-start">
                      <Text className="text-white font-JakartaBold text-xs">Update Now</Text>
                    </TouchableOpacity>
                  </View>
                  <View className="w-8 h-8 bg-white/20 rounded-full items-center justify-center ml-2">
                    <Smartphone size={16} color="white" />
                  </View>
                </View>
              </View>
            </View>

            {/* Menu Items */}
            <View className="px-4 py-1">
              {menuItems.map((item, index) => (
                <TouchableOpacity key={item.id} className="flex-row items-center py-1 border-b border-gray-50" activeOpacity={0.7}>
                  <View className="w-9 h-9 rounded-full items-center justify-center mr-3" style={{ backgroundColor: `${item.color}15` }}>
                    <item.icon size={16} color={item.color} />
                  </View>
                  <Text className="flex-1 text-gray-800 font-JakartaBold text-sm">{item.title}</Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* Sign Out Button */}
            <View className="px-4 py-2 mt-2">
              <TouchableOpacity
                className="flex-row items-center bg-red-50 rounded-lg px-3 py-2"
                activeOpacity={0.8}
                onPress={handleSignOut}
              >
                <LogOut size={16} color="#EF4444" />
                <Text className="ml-2 text-red-600 font-JakartaBold text-sm">Sign Out</Text>
              </TouchableOpacity>
            </View>

            {/* App Version */}
            <View className="px-4 py-2 mt-2">
              <Text className="text-gray-400 text-xs font-JakartaMedium text-center">Version 2.1.4</Text>
            </View>
          </ScrollView>
        </SafeAreaView>
      </Animated.View>
    </View>
  );
};

export default Sidebar;
