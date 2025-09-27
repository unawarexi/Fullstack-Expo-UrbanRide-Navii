import { InputFieldProps } from "@/core/types/type";
import { LucideIcon } from "lucide-react-native";
import React, { useRef, useState } from "react";
import { Image, Keyboard, KeyboardAvoidingView, Platform, TextInput, TouchableWithoutFeedback, View } from "react-native";
import Animated, { interpolateColor, useAnimatedStyle, useSharedValue, withTiming } from "react-native-reanimated";

const InputField = ({ label, icon, secureTextEntry = false, labelStyle, containerStyle, inputStyle, iconStyle, className, onFocus, onBlur, ...props }: InputFieldProps) => {
  const [isFocused, setIsFocused] = useState(false);
  const [hasValue, setHasValue] = useState(false);
  const inputRef = useRef<TextInput>(null);

  const focusAnimation = useSharedValue(0);
  const scaleAnimation = useSharedValue(1);

  const isLucideIcon = icon && typeof icon !== "number" && typeof icon !== "string";

  const handleFocus = (e: any) => {
    setIsFocused(true);
    focusAnimation.value = withTiming(1, { duration: 200 });
    scaleAnimation.value = withTiming(1.02, { duration: 150 });
    onFocus?.(e);
  };

  const handleBlur = (e: any) => {
    setIsFocused(false);
    focusAnimation.value = withTiming(0, { duration: 200 });
    scaleAnimation.value = withTiming(1, { duration: 150 });
    onBlur?.(e);
  };

  const handleChangeText = (text: string) => {
    setHasValue(text.length > 0);
    props.onChangeText?.(text);
  };

  // Animated styles for the container
  const containerAnimatedStyle = useAnimatedStyle(() => {
    const borderColor = interpolateColor(
      focusAnimation.value,
      [0, 1],
      ["#E5E7EB", "#3B82F6"] // gray-200 to blue-500
    );

    const backgroundColor = interpolateColor(
      focusAnimation.value,
      [0, 1],
      ["#FFFFFF", "#EFF6FF"] // white to blue-50
    );

    return {
      borderColor,
      backgroundColor,
      transform: [{ scale: scaleAnimation.value }],
      shadowOpacity: focusAnimation.value * 0.1,
      shadowRadius: focusAnimation.value * 8,
      shadowOffset: {
        width: 0,
        height: focusAnimation.value * 4,
      },
    };
  });

  // Animated styles for the label
  const labelAnimatedStyle = useAnimatedStyle(() => {
    const color = interpolateColor(
      focusAnimation.value,
      [0, 1],
      ["#374151", "#3B82F6"] // gray-700 to blue-500
    );

    return {
      color,
    };
  });

  return (
    <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"}>
      <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
        <View className="w-full">
          {/* Label */}
          {label && (
            <Animated.Text style={labelAnimatedStyle} className={`text-base font-JakartaSemiBold mb-3 ${labelStyle}`}>
              {label}
            </Animated.Text>
          )}

          {/* Input Container */}
          <Animated.View
            style={[
              containerAnimatedStyle,
              {
                shadowColor: "#3B82F6",
                elevation: Platform.OS === "android" ? (isFocused ? 4 : 0) : 0,
              },
            ]}
            className={`flex-row items-center bg-white border border-gray-200 rounded-2xl overflow-hidden ${containerStyle}`}
          >
            {/* Icon */}
            {icon && (
              <View className={`ml-4 ${iconStyle}`}>
                {isLucideIcon ? (
                  (() => {
                    const LucideIconComp = icon as LucideIcon;
                    return <LucideIconComp size={20} color={isFocused ? "#3B82F6" : "#6B7280"} />;
                  })()
                ) : (
                  <Image
                    source={icon}
                    className={`w-5 h-5 ${isFocused ? "opacity-80" : "opacity-60"}`}
                    style={{
                      tintColor: isFocused ? "#3B82F6" : "#6B7280",
                    }}
                  />
                )}
              </View>
            )}

            {/* Text Input */}
            <TextInput
              ref={inputRef}
              className={`flex-1 px-4 py-4 text-gray-800 font-JakartaMedium text-base ${inputStyle}`}
              secureTextEntry={secureTextEntry}
              onFocus={handleFocus}
              onBlur={handleBlur}
              onChangeText={handleChangeText}
              placeholderTextColor="#9CA3AF"
              selectionColor="#3B82F6"
              {...props}
            />
          </Animated.View>

          {/* Helper text or error message space */}
          <View className="h-2 mt-1">{/* This creates consistent spacing for error messages */}</View>
        </View>
      </TouchableWithoutFeedback>
    </KeyboardAvoidingView>
  );
};

export default InputField;
