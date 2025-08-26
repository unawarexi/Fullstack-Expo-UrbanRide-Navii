import { LucideIcons } from "@/constants/icons";
import React, { useEffect } from "react";
import { Text, View } from "react-native";
import Animated, { runOnJS, useAnimatedStyle, useSharedValue, withSpring, withTiming } from "react-native-reanimated";


interface ToastProps {
  visible: boolean;
  message: string;
  type?: "success" | "error" | "info" | "warning";
  duration?: number;
  onHide: () => void;
}

const Toast: React.FC<ToastProps> = ({ visible, message, type = "success", duration = 3000, onHide }) => {
  const translateY = useSharedValue(-200);
  const opacity = useSharedValue(0);
  const scale = useSharedValue(0.9);

  useEffect(() => {
    if (visible) {
      // Show animation - drop down from top
      opacity.value = withTiming(1, { duration: 300 });
      translateY.value = withSpring(0, {
        damping: 15,
        stiffness: 150,
        mass: 1,
      });
      scale.value = withSpring(1, {
        damping: 12,
        stiffness: 200,
        mass: 1,
      });

      // Auto hide after duration
      setTimeout(() => {
        if (visible) {
          hideToast();
        }
      }, duration);
    } else {
      hideToast();
    }
  }, [visible]);

  const hideToast = () => {
    opacity.value = withTiming(0, { duration: 200 });
    translateY.value = withSpring(-200, {
      damping: 15,
      stiffness: 150,
      mass: 1,
    });
    scale.value = withTiming(0.9, { duration: 200 }, () => {
      runOnJS(onHide)();
    });
  };

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: translateY.value }, { scale: scale.value }],
    opacity: opacity.value,
  }));

  const getToastConfig = () => {
    switch (type) {
      case "success":
        return {
          backgroundColor: "bg-green-500",
          icon: <LucideIcons.checkmark size={20} color="white" />,
          borderColor: "border-green-600",
        };
      case "error":
        return {
          backgroundColor: "bg-red-500",
          icon: <LucideIcons.close size={20} color="white" />,
          borderColor: "border-red-600",
        };
      case "warning":
        return {
          backgroundColor: "bg-yellow-500",
          icon: <LucideIcons.AlertTriangle size={20} color="white" />,
          borderColor: "border-yellow-600",
        };
      case "info":
        return {
          backgroundColor: "bg-blue-500",
          icon: <LucideIcons.Info size={20} color="white" />,
          borderColor: "border-blue-600",
        };
      default:
        return {
          backgroundColor: "bg-green-500",
          icon: <LucideIcons.checkmark size={20} color="white" />,
          borderColor: "border-green-600",
        };
    }
  };

  const config = getToastConfig();

  // Always render the container, but make it invisible when not visible
  return (
    <View
      className="absolute top-0 left-0 right-0 z-[9999]"
      style={{
        elevation: 9999, // For Android
        zIndex: 9999, // For iOS
        pointerEvents: visible ? "auto" : "none",
      }}
    >
      <Animated.View
        style={[
          animatedStyle,
          {
            marginTop: 60, // Add top margin for status bar
            marginHorizontal: 16,
            shadowColor: "#000",
            shadowOffset: {
              width: 0,
              height: 4,
            },
            shadowOpacity: 0.3,
            shadowRadius: 6,
            elevation: 10,
          },
        ]}
        className={`${config.backgroundColor} ${config.borderColor} border-l-4 rounded-xl p-4 flex-row items-center`}
      >
        <View className="mr-3 bg-white/20 rounded-full p-1.5">{config.icon}</View>
        <Text className="text-white font-JakartaMedium text-sm flex-1 leading-5" numberOfLines={3}>
          {message}
        </Text>
      </Animated.View>
    </View>
  );
};

export default Toast;
