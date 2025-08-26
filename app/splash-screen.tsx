import { images } from "@/constants/images";
import { useSplashAnimation } from "@/core/animations/splash-animation";
import React from "react";
import { Image, Text, View } from "react-native";
import Animated from "react-native-reanimated";

const SplashScreen = () => {
  const { logoAnimatedStyle, textAnimatedStyle, containerAnimatedStyle, loadingDotAnimatedStyle } = useSplashAnimation();

  return (
    <Animated.View style={[containerAnimatedStyle]} className="flex-1 justify-center items-center bg-white">

      <View className="items-center">
 
        <Animated.View style={[logoAnimatedStyle]} className="">
          <Image
            source={images.logo3}
            style={{
              width: 200,
              height: 200,
            }}
            resizeMode="contain"
          />
        </Animated.View>

        <Animated.View style={[textAnimatedStyle]} className="items-center">
          <Text className="text-sm text-gray-500 mb-2  text-center" style={{ fontFamily: "Jakarta-Bold" }}>
            Zoom! Zooom!! Zoooom!!! 💨
          </Text>
        </Animated.View>

        <Animated.View style={[loadingDotAnimatedStyle]} className="mt-12">
          <View className="flex-row space-x-1">
            {[0, 1, 2].map((index) => (
              <View key={index} className="w-2 h-2 bg-blue-500 rounded-full mx-0.5" />
            ))}
          </View>
        </Animated.View>
      </View>
    </Animated.View>
  );
};

export default SplashScreen;
