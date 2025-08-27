
import { LucideIcons } from "@/constants/icons";
import { images } from "@/constants/images";
import Toast from "@/core/utils/ToastNotifier";
import { fetchAPI } from "@/lib/fetch";
import { useSignUp } from "@clerk/clerk-expo";
import { router, useLocalSearchParams } from "expo-router";
import React, { useEffect, useRef, useState } from "react";
import { Image, SafeAreaView, Text, TextInput, TouchableOpacity, View } from "react-native";
import Animated, { useAnimatedStyle, useSharedValue, withSpring, withTiming } from "react-native-reanimated";


const OTPScreen = () => {
  const { signUp, setActive } = useSignUp();
  const { email, name } = useLocalSearchParams<{ email: string; name: string }>();
  const [otp, setOtp] = useState("");
  const [isVerifying, setIsVerifying] = useState(false);
  const [toastVisible, setToastVisible] = useState(false);
  const [toastMessage, setToastMessage] = useState("");
  const [toastType, setToastType] = useState<"success" | "error">("success");
  const otpInputRef = useRef<TextInput>(null);

  // Animation values
  const fadeAnim = useSharedValue(0);
  const slideAnim = useSharedValue(30);
  const logoScale = useSharedValue(0.8);
  const buttonScale = useSharedValue(1);

  useEffect(() => {
    // Entrance animations
    fadeAnim.value = withTiming(1, { duration: 600 });
    slideAnim.value = withSpring(0, { damping: 12, stiffness: 100 });
    logoScale.value = withSpring(1, { damping: 10, stiffness: 150 });

    // Auto-focus OTP input
    setTimeout(() => {
      otpInputRef.current?.focus();
    }, 500);
  }, []);

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
  if (!signUp || isVerifying || otp.length !== 6) {
    if (otp.length !== 6) {
      showToast("Please enter a 6-digit verification code", "error");
    }
    return;
  }

  buttonScale.value = withSpring(0.95, { damping: 10, stiffness: 200 }, () => {
    buttonScale.value = withSpring(1, { damping: 10, stiffness: 200 });
  });

  setIsVerifying(true);
  try {
    const completeSignUp = await signUp.attemptEmailAddressVerification({
      code: otp,
    });

    if (completeSignUp.status === "complete") {
      await fetchAPI("/(api)/user", {
        method: "POST", // Use POST since we're creating a new user
        body: JSON.stringify({
          name: name,
          email: email,
          clerkId: completeSignUp.createdUserId, // Real Clerk ID
        }),
      });

      await setActive({ session: completeSignUp.createdSessionId });

      showToast("Account verified successfully!", "success");

      // Navigate to home screen after toast
      setTimeout(() => {
        router.replace("/(main)");
      }, 1500);
    } else {
      showToast("Verification failed. Please try again.", "error");
    }
  } catch (err: any) {
    console.log(JSON.stringify(err, null, 2));
    const errorMessage = err?.errors?.[0]?.longMessage || "Verification failed. Please try again.";
    showToast(errorMessage, "error");
  } finally {
    setIsVerifying(false);
  }
};

  const onResendCode = async () => {
    if (!signUp) return;

    try {
      await signUp.prepareEmailAddressVerification({ strategy: "email_code" });
      showToast("New verification code sent!", "success");
      setOtp("");
    } catch (err: any) {
      showToast("Failed to resend code. Please try again.", "error");
    }
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
        <TouchableOpacity onPress={() => router.back()} className="w-10 h-10 items-center justify-center" hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
          <LucideIcons.backArrow size={24} color="#6B7280" />
        </TouchableOpacity>

        {/* Brand - centered */}
        <Animated.View style={logoAnimatedStyle} className="absolute left-0 right-0 flex-row items-center justify-center">
          <Text className="text-lg font-JakartaBold text-gray-800 ">Navii</Text>
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
            />
            {otp.length > 0 && (
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
          <TouchableOpacity onPress={onResendCode}>
            <Text className="text-blue-600 font-JakartaSemiBold text-base">Resend Code</Text>
          </TouchableOpacity>
        </View>
      </Animated.View>

      {/* Toast */}
      <Toast visible={toastVisible} message={toastMessage} type={toastType} onHide={() => setToastVisible(false)} />
    </SafeAreaView>
  );
};

export default OTPScreen;
