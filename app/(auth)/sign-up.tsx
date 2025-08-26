import OAuth from "@/components/OAuth";
import { LucideIcons } from "@/constants/icons";
import { images } from "@/constants/images";
import Toast from "@/core/utils/ToastNotifier";
import { useSignUp } from "@clerk/clerk-expo";
import { zodResolver } from "@hookform/resolvers/zod";
import { Link, router } from "expo-router";
import React, { useEffect, useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { Image, KeyboardAvoidingView, Platform, ScrollView, Text, TextInput, TouchableOpacity, View } from "react-native";
import Animated, { useAnimatedStyle, useSharedValue, withSequence, withSpring, withTiming } from "react-native-reanimated";
import { z } from "zod";


// Validation schema
const signUpSchema = z
  .object({
    name: z
      .string()
      .min(1, "Name is required")
      .min(2, "Name must be at least 2 characters")
      .max(50, "Name must be less than 50 characters")
      .regex(/^[a-zA-Z\s]+$/, "Name can only contain letters and spaces"),
    email: z.string().min(1, "Email is required").email("Please enter a valid email address"),
    password: z
      .string()
      .min(1, "Password is required")
      .min(8, "Password must be at least 8 characters")
      .regex(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/, "Password must contain uppercase, lowercase, and number"),
    confirmPassword: z.string().min(1, "Please confirm your password"),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords don't match",
    path: ["confirmPassword"],
  });

type SignUpFormData = z.infer<typeof signUpSchema>;

const SignUp = () => {
  const { isLoaded, signUp } = useSignUp();
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [toastVisible, setToastVisible] = useState(false);
  const [toastMessage, setToastMessage] = useState("");
  const [toastType, setToastType] = useState<"success" | "error">("success");

  // Animation values
  const fadeAnim = useSharedValue(0);
  const slideAnim = useSharedValue(50);
  const scaleAnim = useSharedValue(0.9);
  const buttonScale = useSharedValue(1);

  const {
    control,
    handleSubmit,
    formState: { errors },
  } = useForm<SignUpFormData>({
    resolver: zodResolver(signUpSchema),
    defaultValues: {
      name: "",
      email: "",
      password: "",
      confirmPassword: "",
    },
  });

  useEffect(() => {
    // Entrance animations
    fadeAnim.value = withTiming(1, { duration: 800 });
    slideAnim.value = withSpring(0, { damping: 15, stiffness: 100 });
    scaleAnim.value = withSpring(1, { damping: 12, stiffness: 120 });
  }, []);

  const showToast = (message: string, type: "success" | "error" = "success") => {
    setToastMessage(message);
    setToastType(type);
    setToastVisible(true);
  };

  // Handle submission of sign-up form
  const onSignUpPress = async (data: SignUpFormData) => {
    if (!isLoaded || isSubmitting) return;

    buttonScale.value = withSequence(withTiming(0.95, { duration: 100 }), withTiming(1, { duration: 100 }));

    setIsSubmitting(true);
    try {
      await signUp.create({
        emailAddress: data.email,
        password: data.password,
      });
      await signUp.prepareEmailAddressVerification({ strategy: "email_code" });

      showToast("Verification code sent to your email!", "success");

      // Navigate to OTP screen
      setTimeout(() => {
        router.push({
          pathname: "/otp",
          params: {
            email: data.email,
            name: data.name,
          },
        });
      }, 1500);
    } catch (err: any) {
      console.log(JSON.stringify(err, null, 2));
      const errorMessage = err?.errors?.[0]?.longMessage || "An error occurred. Please try again.";
      showToast(errorMessage, "error");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Animated styles
  const containerAnimatedStyle = useAnimatedStyle(() => ({
    opacity: fadeAnim.value,
    transform: [{ translateY: slideAnim.value }, { scale: scaleAnim.value }],
  }));

  const buttonAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: buttonScale.value }],
  }));

  return (
    <KeyboardAvoidingView
      className="flex-1"
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      keyboardVerticalOffset={Platform.OS === "ios" ? 80 : 30} // tweak if header overlaps
    >
      <ScrollView className="flex-1 bg-gray-50" showsVerticalScrollIndicator={false} bounces={false} contentContainerStyle={{ flexGrow: 1 }} keyboardShouldPersistTaps="handled" >
        <View className="flex-1">
          {/* Header Section */}
          <View className="relative w-full h-[280px] bg-white">
            <Image source={images.signUpCar} className="w-full h-[280px]" resizeMode="cover" />
            <View className="absolute inset-0 bg-white/10" />
            <Animated.View style={containerAnimatedStyle} className="absolute bottom-0 left-0 right-0 p-5 bg-black/60 mb-4 rounded-t-3xl">
              <Text className="text-xl text-white font-JakartaBold">Join Us Today</Text>
              <Text className="text-md text-white/90 font-Jakarta">Create your account and get started</Text>
            </Animated.View>
          </View>

          <Animated.View style={containerAnimatedStyle} className="flex-1 bg-gray-50 -mt-6 ">
            <View className="p-6 pt-8">
              {/* Form Section */}
              <View className="mb-3">
                {/* Name Field */}
                <Controller
                  control={control}
                  name="name"
                  render={({ field: { onChange, onBlur, value } }) => (
                    <View className="mb-3">
                      <Text className="text-base font-JakartaSemiBold text-gray-800 mb-1">Full Name</Text>
                      <View className="relative">
                        <View className="absolute left-4 top-1/2 -mt-3 z-10">
                          <LucideIcons.person size={20} color="#6B7280" />
                        </View>
                        <TextInput
                          className="bg-white border border-gray-200 rounded-2xl pl-12 pr-4 py-4 text-gray-800 font-JakartaMedium text-base focus:border-blue-500 focus:bg-blue-50/30"
                          placeholder="Enter your full name"
                          placeholderTextColor="#9CA3AF"
                          value={value}
                          onChangeText={onChange}
                          onBlur={onBlur}
                          autoCapitalize="words"
                        />
                      </View>
                      {errors.name && <Text className="text-red-500/70 text-sm mt-1 ml-1">{errors.name.message}</Text>}
                    </View>
                  )}
                />

                {/* Email Field */}
                <Controller
                  control={control}
                  name="email"
                  render={({ field: { onChange, onBlur, value } }) => (
                    <View className="mb-3">
                      <Text className="text-base font-JakartaSemiBold text-gray-800 mb-1">Email Address</Text>
                      <View className="relative">
                        <View className="absolute left-4 top-1/2 -mt-3 z-10">
                          <LucideIcons.email size={20} color="#6B7280" />
                        </View>
                        <TextInput
                          className="bg-white border border-gray-200 rounded-2xl pl-12 pr-4 py-4 text-gray-800 font-JakartaMedium text-base focus:border-blue-500 focus:bg-blue-50/30"
                          placeholder="Enter your email"
                          placeholderTextColor="#9CA3AF"
                          value={value}
                          onChangeText={onChange}
                          onBlur={onBlur}
                          keyboardType="email-address"
                          autoCapitalize="none"
                          textContentType="emailAddress"
                        />
                      </View>
                      {errors.email && <Text className="text-red-500/70 text-sm mt-1 ml-1">{errors.email.message}</Text>}
                    </View>
                  )}
                />

                {/* Password Field */}
                <Controller
                  control={control}
                  name="password"
                  render={({ field: { onChange, onBlur, value } }) => (
                    <View className="mb-3">
                      <Text className="text-base font-JakartaSemiBold text-gray-800 mb-1">Password</Text>
                      <View className="relative">
                        <View className="absolute left-4 top-1/2 -mt-3 z-10">
                          <LucideIcons.lock size={20} color="#6B7280" />
                        </View>
                        <TextInput
                          className="bg-white border border-gray-200 rounded-2xl pl-12 pr-12 py-4 text-gray-800 font-JakartaMedium text-base focus:border-blue-500 focus:bg-blue-50/30"
                          placeholder="Enter your password"
                          placeholderTextColor="#9CA3AF"
                          secureTextEntry={!showPassword}
                          value={value}
                          onChangeText={onChange}
                          onBlur={onBlur}
                          autoCapitalize="none"
                          textContentType="newPassword"
                        />
                        <TouchableOpacity onPress={() => setShowPassword(!showPassword)} className="absolute right-4 top-1/2 -mt-3 p-1" hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
                          {showPassword ? <LucideIcons.eyecross size={20} color="#6B7280" /> : <LucideIcons.eye size={20} color="#6B7280" />}
                        </TouchableOpacity>
                      </View>
                      {errors.password && <Text className="text-red-500/70 text-sm mt-1 ml-1">{errors.password.message}</Text>}
                    </View>
                  )}
                />

                {/* Confirm Password Field */}
                <Controller
                  control={control}
                  name="confirmPassword"
                  render={({ field: { onChange, onBlur, value } }) => (
                    <View className="mb-2">
                      <Text className="text-base font-JakartaSemiBold text-gray-800 mb-1">Confirm Password</Text>
                      <View className="relative">
                        <View className="absolute left-4 top-1/2 -mt-3 z-10">
                          <LucideIcons.lock size={20} color="#6B7280" />
                        </View>
                        <TextInput
                          className="bg-white border border-gray-200 rounded-2xl pl-12 pr-12 py-4 text-gray-800 font-JakartaMedium text-base focus:border-blue-500 focus:bg-blue-50/30"
                          placeholder="Confirm your password"
                          placeholderTextColor="#9CA3AF"
                          secureTextEntry={!showConfirmPassword}
                          value={value}
                          onChangeText={onChange}
                          onBlur={onBlur}
                          autoCapitalize="none"
                          textContentType="newPassword"
                        />
                        <TouchableOpacity onPress={() => setShowConfirmPassword(!showConfirmPassword)} className="absolute right-4 top-1/2 -mt-3 p-1" hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
                          {showConfirmPassword ? <LucideIcons.eyecross size={20} color="#6B7280" /> : <LucideIcons.eye size={20} color="#6B7280" />}
                        </TouchableOpacity>
                      </View>
                      {errors.confirmPassword && <Text className="text-red-500/70 text-sm mt-1 ml-1">{errors.confirmPassword.message}</Text>}
                    </View>
                  )}
                />
              </View>

              {/* Sign Up Button */}
              <Animated.View style={buttonAnimatedStyle} className="mt-8">
                <TouchableOpacity onPress={handleSubmit(onSignUpPress)} disabled={isSubmitting} className={`bg-blue-600 rounded-2xl py-4 ${isSubmitting ? "opacity-70" : ""}`}>
                  <Text className="text-white text-center font-JakartaBold text-lg">{isSubmitting ? "Creating Account..." : "Create Account"}</Text>
                </TouchableOpacity>
              </Animated.View>

              {/* OAuth Section */}
              <View className="my-8">
                <OAuth />
              </View>

              {/* Sign In Link */}
              <View className="flex-row justify-center items-center mb-6">
                <Text className="text-gray-600 font-Jakarta text-base">Already have an account? </Text>
                <Link href="/sign-in" asChild>
                  <TouchableOpacity>
                    <Text className="text-blue-600 font-JakartaBold text-base">Sign In</Text>
                  </TouchableOpacity>
                </Link>
              </View>
            </View>
          </Animated.View>
        </View>

        {/* Toast Component */}
        <Toast visible={toastVisible} message={toastMessage} type={toastType} onHide={() => setToastVisible(false)} />
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

export default SignUp;
