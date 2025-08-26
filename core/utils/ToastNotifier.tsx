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
      opacity.value = withTiming(1, { duration: 350 });
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
    opacity.value = withTiming(0, { duration: 250 });
    translateY.value = withSpring(-200, {
      damping: 15,
      stiffness: 150,
      mass: 1,
    });
    scale.value = withTiming(0.9, { duration: 250 }, () => {
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
          backgroundColor: "rgba(34, 197, 94, 0.08)", 
          borderColor: "#22C55E", // Green-500
          icon: <LucideIcons.checkmark size={22} color="#FFFFFF" />,
          iconBg: "#22C55E",
        };
      case "error":
        return {
          backgroundColor: "rgba(239, 68, 68, 0.08)", 
          borderColor: "#EF4444", // Red-500
          icon: <LucideIcons.close size={22} color="#FFFFFF" />,
          iconBg: "#EF4444",
        };
      case "warning":
        return {
          backgroundColor: "rgba(245, 158, 11, 0.08)",
          borderColor: "#F59E0B", // Amber-500
          icon: <LucideIcons.AlertTriangle size={22} color="#FFFFFF" />,
          iconBg: "#F59E0B",
        };
      case "info":
        return {
          backgroundColor: "rgba(59, 130, 246, 0.08)",
          borderColor: "#3B82F6", // Blue-500
          icon: <LucideIcons.Info size={22} color="#FFFFFF" />,
          iconBg: "#3B82F6",
        };
      default:
        return {
          backgroundColor: "rgba(34, 197, 94, 0.08)",
          borderColor: "#22C55E",
          icon: <LucideIcons.checkmark size={22} color="#FFFFFF" />,
          iconBg: "#22C55E",
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
            marginTop: 65, // Add top margin for status bar
            marginHorizontal: 20,
            backgroundColor: config.backgroundColor,
            borderColor: config.borderColor,
            borderWidth: 3,
            shadowColor: config.borderColor,
            shadowOffset: {
              width: 0,
              height: 8,
            },
            shadowOpacity: 0.25,
            shadowRadius: 12,
            elevation: 12,
          },
        ]}
        className="rounded-2xl px-5 py-4 flex-row items-center"
      >
        {/* Icon Container */}
        <View className="rounded-full p-2.5 mr-4" style={{ backgroundColor: config.iconBg }}>
          {config.icon}
        </View>

        {/* Message Container */}
        <View className="flex-1 pr-2">
          <Text
            className="text-white font-JakartaSemiBold text-base leading-5"
            numberOfLines={3}
            style={{
              textShadowColor: "rgba(0, 0, 0, 0.3)",
              textShadowOffset: { width: 0, height: 1 },
              textShadowRadius: 2,
            }}
          >
            {message}
          </Text>
        </View>
      </Animated.View>
    </View>
  );
};

export default Toast;
