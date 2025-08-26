import { useEffect } from "react";
import { useAnimatedStyle, useSharedValue, withSequence, withSpring, withTiming } from "react-native-reanimated";

export const useSplashAnimation = () => {
  const logoScale = useSharedValue(0.5);
  const logoOpacity = useSharedValue(0);
  const textOpacity = useSharedValue(0);
  const containerOpacity = useSharedValue(1);

  useEffect(() => {
    // Logo entrance animation
    logoOpacity.value = withTiming(1, { duration: 600 });
    logoScale.value = withSpring(1, {
      damping: 8,
      stiffness: 100,
    });

    // Text fade in after logo (1300ms delay)
    setTimeout(() => {
      textOpacity.value = withTiming(1, { duration: 500 });
    }, 1100);

    // Logo pulse effect after 1500ms
    setTimeout(() => {
      logoScale.value = withSequence(withTiming(1.1, { duration: 300 }), withTiming(1, { duration: 300 }));
    }, 1500);

    // Exit animation after 2500ms total
    setTimeout(() => {
      containerOpacity.value = withTiming(0, { duration: 400 });
    }, 2500);
  }, []);

  const logoAnimatedStyle = useAnimatedStyle(() => ({
    opacity: logoOpacity.value,
    transform: [{ scale: logoScale.value }],
  }));

  const textAnimatedStyle = useAnimatedStyle(() => ({
    opacity: textOpacity.value,
  }));

  const containerAnimatedStyle = useAnimatedStyle(() => ({
    opacity: containerOpacity.value,
  }));

  const loadingDotAnimatedStyle = useAnimatedStyle(() => ({
    opacity: textOpacity.value,
  }));

  return {
    logoAnimatedStyle,
    textAnimatedStyle,
    containerAnimatedStyle,
    loadingDotAnimatedStyle,
  };
};
