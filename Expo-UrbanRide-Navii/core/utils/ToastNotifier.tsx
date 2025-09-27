import { LucideIcons } from "@/constants/icons";
import React, { useEffect } from "react";
import { Dimensions, Text, View } from "react-native";
import Animated, { runOnJS, useAnimatedStyle, useSharedValue, withSpring, withTiming } from "react-native-reanimated";

interface ToastProps {
  visible: boolean;
  message: string;
  type?: "success" | "error" | "info" | "warning";
  duration?: number;
  onHide: () => void;
}

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get("window");

const TOAST_WIDTH = SCREEN_WIDTH * 0.8; // 70% of screen width
const DROP_POSITION = SCREEN_HEIGHT * 0.1; // 30% of screen height

const Toast: React.FC<ToastProps> = ({ visible, message, type = "success", duration = 3000, onHide }) => {
  const translateY = useSharedValue(-200);
  const opacity = useSharedValue(0);
  const scale = useSharedValue(0.95);

  useEffect(() => {
    if (visible) {
      // Show animation - drop down from top to 30% of screen
      opacity.value = withTiming(1, { duration: 250 });
      translateY.value = withSpring(DROP_POSITION, {
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
    scale.value = withTiming(0.95, { duration: 200 }, () => {
      runOnJS(onHide)();
    });
  };

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: translateY.value }, { scale: scale.value }],
    opacity: opacity.value,
  }));

  // Use icons from LucideIcons
  const getToastConfig = () => {
    switch (type) {
      case "success":
        return {
          backgroundColor: "#22C55E",
          borderColor: "#22C55E",
          icon: <LucideIcons.checkmark size={18} color="#FFFFFF" />,
          iconBg: "#16A34A",
        };
      case "error":
        return {
          backgroundColor: "#EF4444",
          borderColor: "#EF4444",
          icon: <LucideIcons.close size={18} color="#FFFFFF" />,
          iconBg: "#B91C1C",
        };
      case "warning":
        return {
          backgroundColor: "#F59E0B",
          borderColor: "#F59E0B",
          icon: <LucideIcons.alertTriangle size={18} color="#FFFFFF" />,
          iconBg: "#B45309",
        };
      case "info":
        return {
          backgroundColor: "#3B82F6",
          borderColor: "#3B82F6",
          icon: <LucideIcons.info size={18} color="#FFFFFF" />,
          iconBg: "#1D4ED8",
        };
      default:
        return {
          backgroundColor: "#22C55E",
          borderColor: "#22C55E",
          icon: <LucideIcons.checkmark size={18} color="#FFFFFF" />,
          iconBg: "#16A34A",
        };
    }
  };

  const config = getToastConfig();

  return (
    <View
      className="absolute left-0 right-0 z-[9999]"
      style={{
        // Center horizontally, drop to 30% of screen
        alignItems: "center",
        elevation: 9999,
        zIndex: 9999,
        pointerEvents: visible ? "auto" : "none",
      }}
    >
      <Animated.View
        style={[
          animatedStyle,
          {
            width: TOAST_WIDTH,
            backgroundColor: config.backgroundColor,
            borderColor: config.borderColor,
            borderWidth: 0,
            shadowColor: config.borderColor,
            shadowOffset: { width: 0, height: 6 },
            shadowOpacity: 0.18,
            shadowRadius: 8,
            elevation: 8,
            borderRadius: 22, // more rounded
            minHeight: 44,
            paddingVertical: 8,
            paddingHorizontal: 14,
          },
        ]}
        className="flex-row items-center"
      >
        {/* Icon Container */}
        <View
          className="rounded-full mr-3"
          style={{
            backgroundColor: config.iconBg,
            padding: 7,
            borderRadius: 999,
          }}
        >
          {config.icon}
        </View>

        {/* Message Container */}
        <View className="flex-1 pr-1">
          <Text
            className="text-white font-JakartaSemiBold"
            numberOfLines={2}
            style={{
              fontSize: 13,
              lineHeight: 17,
              color: "#fff",
              textShadowColor: "rgba(0, 0, 0, 0.18)",
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
