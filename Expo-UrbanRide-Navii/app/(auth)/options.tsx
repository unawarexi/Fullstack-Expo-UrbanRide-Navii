import { LucideIcons } from "@/constants/icons";
import { router } from "expo-router";
import { User } from "lucide-react-native";
import React, { useEffect } from "react";
import { SafeAreaView, Text, TouchableOpacity, View } from "react-native";
import Animated, { FadeInDown, FadeInUp, useAnimatedStyle, useSharedValue, withDelay, withRepeat, withSequence, withSpring, withTiming } from "react-native-reanimated";

const AnimatedTouchableOpacity = Animated.createAnimatedComponent(TouchableOpacity);

export default function OptionsScreen() {
  // Animation values
  const logoScale = useSharedValue(0);
  const logoRotate = useSharedValue(0);
  const titleOpacity = useSharedValue(0);
  const subtitleOpacity = useSharedValue(0);

  useEffect(() => {
    // Logo entrance animation
    logoScale.value = withSpring(1, { damping: 15, stiffness: 150 });

    // Continuous subtle rotation for logo
    logoRotate.value = withRepeat(withSequence(withTiming(5, { duration: 2000 }), withTiming(-5, { duration: 2000 })), -1, true);

    // Staggered text animations
    titleOpacity.value = withDelay(300, withTiming(1, { duration: 800 }));
    subtitleOpacity.value = withDelay(600, withTiming(1, { duration: 800 }));
  }, []);

  const logoAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: logoScale.value }, { rotate: `${logoRotate.value}deg` }],
  }));

  const titleAnimatedStyle = useAnimatedStyle(() => ({
    opacity: titleOpacity.value,
  }));

  const subtitleAnimatedStyle = useAnimatedStyle(() => ({
    opacity: subtitleOpacity.value,
  }));

  const handleUserPress = () => {
    try {
      // Replace with your actual user dashboard route
      router.push("/(main)");
    } catch (error) {
      console.error("Navigation error:", error);
    }
  };

  const handleDriverPress = () => {
    try {
      // Show DriverForm screen
      router.push("/driver-form");
    } catch (error) {
      console.error("Navigation error:", error);
    }
  };

  const handleAdminPress = () => {
    try {
      // Show AdminForm screen
      router.push("/admin-form");
    } catch (error) {
      console.error("Navigation error:", error);
    }
  };

  return (
    <SafeAreaView className="flex-1 bg-gray-50">
      {/* Background Gradient Effect */}
      <View className="absolute inset-0 bg-gradient-to-br from-blue-50 to-gray-50" />

      {/* Main Content */}
      <View className="flex-1 px-6 justify-center">
        {/* Logo/Icon Section */}
        <Animated.View style={logoAnimatedStyle} className="items-center mb-12">
          <View className="bg-blue-600 rounded-full p-8 shadow-lg">
            <LucideIcons.car size={64} color="#FFFFFF" />
          </View>
        </Animated.View>

        {/* Title Section */}
        <Animated.View style={titleAnimatedStyle} className="items-center mb-2">
          <Text className="text-3xl font-bold text-gray-900">Welcome!</Text>
        </Animated.View>

        <Animated.View style={subtitleAnimatedStyle} className="items-center mb-10">
          <Text className="text-md text-gray-600 text-center leading-relaxed">Choose how you&apos;d like to continue your journey with us</Text>
        </Animated.View>

        {/* Options Section */}
        <View className="space-y-4 gap-4">
          {/* Continue as User */}
          <Animated.View entering={FadeInDown.delay(800).duration(600).springify()}>
            <AnimatedTouchableOpacity
              onPress={handleUserPress}
              className="bg-white rounded-2xl p-6 flex-row items-center border border-gray-100"
              style={{
                shadowColor: "#000",
                shadowOffset: { width: 0, height: 2 },
                shadowOpacity: 0.06,
                shadowRadius: 4,
                elevation: 2,
              }}
              activeOpacity={0.95}
            >
              <View className="bg-blue-100 rounded-full p-4 mr-4">
                <User size={28} color="#3B82F6" />
              </View>
              <View className="flex-1">
                <Text className="text-xl font-bold text-gray-900 mb-1">Continue as User</Text>
                <Text className="text-gray-600">Book rides and travel with ease</Text>
              </View>
              <View className="bg-blue-50 rounded-full p-2 flex-row items-center">
                {/* Forward icon */}
                <LucideIcons.to size={20} color="#3B82F6" />
              </View>
            </AnimatedTouchableOpacity>
          </Animated.View>

          {/* Register as Driver */}
          <Animated.View entering={FadeInDown.delay(1000).duration(600).springify()}>
            <AnimatedTouchableOpacity
              onPress={handleDriverPress}
              className="bg-white rounded-2xl p-6 flex-row items-center border border-gray-100"
              style={{
                shadowColor: "#000",
                shadowOffset: { width: 0, height: 2 },
                shadowOpacity: 0.06,
                shadowRadius: 4,
                elevation: 2,
              }}
              activeOpacity={0.95}
            >
              <View className="bg-green-100 rounded-full p-4 mr-4">
                <LucideIcons.car size={28} color="#10B981" />
              </View>
              <View className="flex-1">
                <Text className="text-xl font-bold text-gray-900 mb-1">Register as Driver</Text>
                <Text className="text-gray-600">Start earning by giving rides</Text>
              </View>
              <View className="bg-green-50 rounded-full p-2 flex-row items-center">
                {/* Forward icon */}
                <LucideIcons.to size={20} color="#10B981" />
              </View>
            </AnimatedTouchableOpacity>
          </Animated.View>

          {/* Sign in as Admin */}
          <Animated.View entering={FadeInDown.delay(1200).duration(600).springify()}>
            <AnimatedTouchableOpacity
              onPress={handleAdminPress}
              className="bg-white rounded-2xl p-6 flex-row items-center border border-gray-100"
              style={{
                shadowColor: "#000",
                shadowOffset: { width: 0, height: 2 },
                shadowOpacity: 0.06,
                shadowRadius: 4,
                elevation: 2,
              }}
              activeOpacity={0.95}
            >
              <View className="bg-purple-100 rounded-full p-4 mr-4">
                <LucideIcons.shield size={28} color="#8B5CF6" />
              </View>
              <View className="flex-1">
                <Text className="text-xl font-bold text-gray-900 mb-1">Sign in as Admin</Text>
                <Text className="text-gray-600">Manage platform operations</Text>
              </View>
              <View className="bg-purple-50 rounded-full p-2 flex-row items-center">
                {/* Forward icon */}
                <LucideIcons.to size={20} color="#8B5CF6" />
              </View>
            </AnimatedTouchableOpacity>
          </Animated.View>
        </View>

        {/* Footer */}
        <Animated.View entering={FadeInUp.delay(1400).duration(600)} className="items-center mt-16">
          <Text className="text-gray-500 text-sm text-center">You can always change your role later in settings</Text>
        </Animated.View>
      </View>
    </SafeAreaView>
  );
}
