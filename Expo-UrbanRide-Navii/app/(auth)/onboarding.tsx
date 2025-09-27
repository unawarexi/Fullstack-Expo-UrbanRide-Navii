import { useRouter } from "expo-router";
import React, { useRef, useState } from "react";
import { Animated, Image, Text, TouchableOpacity, View } from "react-native";
import Swiper from "react-native-swiper";

import CustomButton from "@/components/CustomButton";
import { onboarding } from "@/constants/texts";

const Onboarding = () => {
  const swiperRef = useRef<Swiper>(null);
  const [activeIndex, setActiveIndex] = useState(0);
  const router = useRouter();
  const slideAnimation = useRef(new Animated.Value(0)).current;
  const appNameAnimation = useRef(new Animated.Value(0)).current;

  const isLastSlide = activeIndex === onboarding.length - 1;

  const animateTextIn = () => {
    slideAnimation.setValue(0);
    appNameAnimation.setValue(0);

    // Animate app name from top
    Animated.timing(appNameAnimation, {
      toValue: 1,
      duration: 800,
      useNativeDriver: true,
    }).start();

    // Animate content from bottom
    Animated.timing(slideAnimation, {
      toValue: 1,
      duration: 800,
      useNativeDriver: true,
    }).start();
  };

  const handleIndexChanged = (index: number) => {
    setActiveIndex(index);
    animateTextIn();
  };

  // Initialize animation on first load
  React.useEffect(() => {
    animateTextIn();
  }, []);

  // App name animation from top
  const appNameTranslateY = appNameAnimation.interpolate({
    inputRange: [0, 1],
    outputRange: [-100, 0],
  });

  const appNameOpacity = appNameAnimation.interpolate({
    inputRange: [0, 0.3, 1],
    outputRange: [0, 0.5, 1],
  });

  // Content animation from bottom
  const textTranslateY = slideAnimation.interpolate({
    inputRange: [0, 1],
    outputRange: [100, 0],
  });

  const textOpacity = slideAnimation.interpolate({
    inputRange: [0, 0.3, 1],
    outputRange: [0, 0.5, 1],
  });

  return (
    <View className="flex h-full bg-black">
      {/* Skip Button - Overlay */}
      <View className="absolute top-0 left-0 right-0 z-20 pt-12">
        <TouchableOpacity
          onPress={() => {
            router.replace("/(auth)/sign-up");
          }}
          className="w-full flex justify-end items-end p-5"
        >
          <View className="bg-black/40 rounded-full px-4 py-2">
            <Text className="text-white text-md font-JakartaBold">Skip</Text>
          </View>
        </TouchableOpacity>
      </View>

      {/* Fullscreen Swiper */}
      <Swiper ref={swiperRef} loop={false} showsPagination={false} onIndexChanged={handleIndexChanged}>
        {onboarding.map((item) => (
          <View key={item.id} className="flex-1 relative">
            {/* Fullscreen Background Image */}
            <Image source={item.image} className="absolute inset-0 w-full h-full" resizeMode="cover" />

            {/* Dark Overlay for text visibility */}
            <View className="absolute inset-0 bg-black/50" />

            {/* App Name - Top 30% */}
            <View className="absolute top-0 left-0 right-0 h-[30%] z-10">
              <Animated.View
                className="flex-1 justify-center px-6 pt-6"
                style={{
                  opacity: appNameOpacity,
                  transform: [{ translateY: appNameTranslateY }],
                }}
              >
                <Text className="text-white text-5xl font-JakartaBold  text-start pl-6 tracking-wider">
                  Nav<Text className="text-blue-500">ii</Text>
                </Text>
              </Animated.View>
            </View>

            {/* Content - Bottom 40% */}
            <View className="absolute bottom-0 left-0 right-0 h-[40%] z-10 mb-6">
              <Animated.View
                className="flex-1 justify-center items-center px-8"
                style={{
                  opacity: textOpacity,
                  transform: [{ translateY: textTranslateY }],
                }}
              >
                <View className="flex items-center justify-center w-full">
                  <Text className="text-white text-3xl font-bold text-center leading-tight">{item.title}</Text>
                </View>
                <Text className="text-lg font-JakartaSemiBold text-center text-white/90 mt-4 leading-relaxed">{item.description}</Text>
              </Animated.View>
            </View>
          </View>
        ))}
      </Swiper>

      {/* Bottom Section - Pagination and Button */}
      <View className="absolute bottom-0 left-0 right-0 z-20 pb-8">
        {/* Custom Pagination */}
        <View className="flex-row justify-center items-center mb-8">
          {onboarding.map((_, index) => (
            <View key={index} className={`w-[32px] h-[4px] mx-1 rounded-full ${index === activeIndex ? "bg-white" : "bg-white/30"}`} />
          ))}
        </View>

        {/* Action Button */}
        <View className="px-8">
          <CustomButton title={isLastSlide ? "Get Started" : "Next"} onPress={() => (isLastSlide ? router.replace("/(auth)/sign-up") : swiperRef.current?.scrollBy(1))} className="w-full" />
        </View>
      </View>
    </View>
  );
};

export default Onboarding;
