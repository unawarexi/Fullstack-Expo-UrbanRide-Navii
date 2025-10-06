import { LucideIcons } from "@/constants/icons";
import { images } from "@/constants/images";
import Toast from "@/core/utils/ToastNotifier";
import { useUserStore } from "@/global/use.user.store";
import { useOtpVerificationLogic } from "@/lib/auth";
import { router, useLocalSearchParams } from "expo-router";
import React, { useEffect, useRef, useState } from "react";
import { Alert, Image, SafeAreaView, Text, TextInput, TouchableOpacity, View } from "react-native";
import Animated, { useAnimatedStyle, useSharedValue, withSpring, withTiming } from "react-native-reanimated";

const OTPScreen = () => {
  const { email, name, phone } = useLocalSearchParams<{
    email: string;
    name: string;
    phone?: string;
  }>();

  const [otp, setOtp] = useState("");
  const [isVerifying, setIsVerifying] = useState(false);
  const [toastVisible, setToastVisible] = useState(false);
  const [toastMessage, setToastMessage] = useState("");
  const [toastType, setToastType] = useState<"success" | "error">("success");
  const [resendCooldown, setResendCooldown] = useState(0);

  const otpInputRef = useRef<TextInput>(null);
  const userStore = useUserStore();
  const { verifyOtp, resendOtp } = useOtpVerificationLogic();

  // Animation values
  const fadeAnim = useSharedValue(0);
  const slideAnim = useSharedValue(30);
  const logoScale = useSharedValue(0.8);
  const buttonScale = useSharedValue(1);

  useEffect(() => {
    // Check if required params are present
    if (!email || !name) {
      Alert.alert("Missing Information", "Required signup information is missing. Please start over.", [{ text: "OK", onPress: () => router.replace("/sign-up") }]);
      return;
    }

    // Entrance animations
    fadeAnim.value = withTiming(1, { duration: 600 });
    slideAnim.value = withSpring(0, { damping: 12, stiffness: 100 });
    logoScale.value = withSpring(1, { damping: 10, stiffness: 150 });

    // Auto-focus OTP input
    const timer = setTimeout(() => {
      otpInputRef.current?.focus();
    }, 500);

    return () => clearTimeout(timer);
  }, [email, name]);

  // Resend cooldown effect
  useEffect(() => {
    if (resendCooldown > 0) {
      const timer = setTimeout(() => {
        setResendCooldown(resendCooldown - 1);
      }, 1000);
      return () => clearTimeout(timer);
    }
  }, [resendCooldown]);

  const showToast = (message: string, type: "success" | "error" = "success") => {
    setToastMessage(message);
    setToastType(type);
    setToastVisible(true);
  };

  const handleOtpChange = (text: string) => {
    const numericText = text.replace(/[^0-9]/g, "").slice(0, 6);
    setOtp(numericText);
  };

  const onPressVerify = async () => {
    if (isVerifying) return;

    if (otp.length !== 6) {
      showToast("Please enter a 6-digit verification code", "error");
      return;
    }

    // Button animation
    buttonScale.value = withSpring(0.95, { damping: 10, stiffness: 200 }, () => {
      buttonScale.value = withSpring(1, { damping: 10, stiffness: 200 });
    });

    setIsVerifying(true);
    try {
      await verifyOtp({
        code: otp.trim(),
        name: name.trim(),
        email: email.toLowerCase().trim(),
        phone: phone?.trim(),
        createUser: userStore.createUser,
      });

      showToast("Account verified successfully!", "success");

      // Navigate after a short delay to show success message
      setTimeout(() => {
        router.replace("/options");
      }, 1500);
    } catch (err: any) {
      console.error("Verification error:", err);
      showToast(err.message || "Verification failed", "error");

      // Clear OTP on error for user convenience
      if (err.message.includes("Invalid verification code")) {
        setOtp("");
      }
    } finally {
      setIsVerifying(false);
    }
  };

  const onResendCode = async () => {
    if (resendCooldown > 0) {
      showToast(`Please wait ${resendCooldown} seconds before requesting a new code`, "error");
      return;
    }

    try {
      await resendOtp();
      showToast("New verification code sent!", "success");
      setOtp("");
      setResendCooldown(60); // 60 second cooldown
    } catch (err: any) {
      console.error("Resend error:", err);

      if (err.message.includes("already verified")) {
        Alert.alert("Account Already Verified", "Your account is already verified. Please sign in instead.", [
          { text: "Sign In", onPress: () => router.replace("/sign-in") },
          { text: "Cancel", style: "cancel" },
        ]);
      } else {
        showToast(err.message || "Failed to resend code", "error");
      }
    }
  };

  const onBackPress = () => {
    Alert.alert("Go Back?", "Your verification progress will be lost. Are you sure you want to go back?", [
      { text: "Stay", style: "cancel" },
      { text: "Go Back", onPress: () => router.back() },
    ]);
  };

  // Animated styles
  const containerAnimatedStyle = useAnimatedStyle(() => ({
    opacity: fadeAnim.value,
    transform: [{ translateY: slideAnim.value }],
  }));

  const logoAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: logoScale.value }],
  }));

  const buttonAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: buttonScale.value }],
  }));

  return (
    <SafeAreaView className="flex-1 bg-gray-50 py-20">
      {/* Header Row */}
      <View className="flex-row items-center px-6 pt-4 pb-2 justify-between">
        {/* Back Button - pinned to left */}
        <TouchableOpacity onPress={onBackPress} className="w-10 h-10 items-center justify-center" hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
          <LucideIcons.backArrow size={24} color="#6B7280" />
        </TouchableOpacity>

        {/* Brand - centered */}
        <Animated.View style={logoAnimatedStyle} className="absolute left-0 right-0 flex-row items-center justify-center">
          <Text className="text-lg font-JakartaBold text-gray-800">Navii</Text>
          <Image source={images.brandIcon} style={{ width: 32, height: 32 }} resizeMode="contain" />
        </Animated.View>
      </View>

      {/* Main Content */}
      <Animated.View style={containerAnimatedStyle} className="items-center justify-center px-6 pt-20">
        {/* Verify Section */}
        <View className="items-center mb-6">
          <View className="w-16 h-16 bg-blue-100 rounded-full items-center justify-center mb-3">
            <LucideIcons.email size={28} color="#3B82F6" />
          </View>
          <Text className="text-2xl font-JakartaBold text-gray-800 text-center mb-1">Verify Your Email</Text>
          <Text className="text-gray-600 font-Jakarta text-center px-6 leading-5">
            We sent a 6-digit code to{"\n"}
            <Text className="font-JakartaSemiBold text-gray-800">{email}</Text>
          </Text>
        </View>

        {/* OTP Input */}
        <View className="w-full mb-6">
          <View className="relative">
            <TextInput
              ref={otpInputRef}
              className="bg-white border-2 border-gray-200 rounded-2xl px-4 py-5 text-gray-800 font-JakartaBold text-2xl text-center tracking-[8px] focus:border-blue-500 focus:bg-blue-50/30"
              placeholder="000000"
              placeholderTextColor="#9CA3AF"
              value={otp}
              onChangeText={handleOtpChange}
              keyboardType="numeric"
              maxLength={6}
              selectTextOnFocus
              editable={!isVerifying}
            />
            {otp.length > 0 && !isVerifying && (
              <TouchableOpacity onPress={() => setOtp("")} className="absolute right-4 top-1/2 -mt-3" hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
                <LucideIcons.close size={20} color="#6B7280" />
              </TouchableOpacity>
            )}
          </View>
          <Text className="text-sm text-gray-500 text-center mt-2">{otp.length}/6 digits</Text>
        </View>

        {/* Verify Button */}
        <Animated.View style={buttonAnimatedStyle} className="w-full mb-5">
          <TouchableOpacity onPress={onPressVerify} disabled={isVerifying || otp.length !== 6} className={`rounded-2xl py-4 ${otp.length === 6 && !isVerifying ? "bg-green-600" : "bg-gray-300"}`}>
            <Text className="text-white text-center font-JakartaBold text-lg">{isVerifying ? "Verifying..." : "Verify Email"}</Text>
          </TouchableOpacity>
        </Animated.View>

        {/* Resend */}
        <View className="items-center">
          <Text className="text-gray-600 font-Jakarta mb-1">Didn&apos;t receive the code?</Text>
          <TouchableOpacity onPress={onResendCode} disabled={resendCooldown > 0}>
            <Text className={`font-JakartaSemiBold text-base ${resendCooldown > 0 ? "text-gray-400" : "text-blue-600"}`}>{resendCooldown > 0 ? `Resend Code (${resendCooldown}s)` : "Resend Code"}</Text>
          </TouchableOpacity>
        </View>
      </Animated.View>

      {/* Toast */}
      <Toast visible={toastVisible} message={toastMessage} type={toastType} onHide={() => setToastVisible(false)} />
    </SafeAreaView>
  );
};

export default OTPScreen;
