import OAuth from "@/components/OAuth";
import { LucideIcons } from "@/constants/icons";
import { images } from "@/constants/images";
import { fetchAPI } from "@/lib/fetch";
import { useSignUp } from "@clerk/clerk-expo";
import { zodResolver } from "@hookform/resolvers/zod";
import { Link, router } from "expo-router";
import React, { useEffect, useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { Alert, Dimensions, Image, Modal, ScrollView, Text, TextInput, TouchableOpacity, View } from "react-native";
import Animated, { useAnimatedStyle, useSharedValue, withSequence, withSpring, withTiming } from "react-native-reanimated";
import { z } from "zod";

const { width: screenWidth } = Dimensions.get("window");

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

const verificationSchema = z.object({
  code: z.string().min(1, "Verification code is required").length(6, "Code must be 6 digits").regex(/^\d+$/, "Code must contain only numbers"),
});

type SignUpFormData = z.infer<typeof signUpSchema>;
type VerificationFormData = z.infer<typeof verificationSchema>;

const SignUp = () => {
  const { isLoaded, signUp, setActive } = useSignUp();
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);

  // Animation values
  const fadeAnim = useSharedValue(0);
  const slideAnim = useSharedValue(50);
  const scaleAnim = useSharedValue(0.9);
  const buttonScale = useSharedValue(1);
  const modalScale = useSharedValue(0.8);
  const modalOpacity = useSharedValue(0);

  const [verification, setVerification] = useState({
    state: "default",
    error: "",
  });

  const {
    control,
    handleSubmit,
    formState: { errors },
    getValues,
  } = useForm<SignUpFormData>({
    resolver: zodResolver(signUpSchema),
    defaultValues: {
      name: "",
      email: "",
      password: "",
      confirmPassword: "",
    },
  });

  const {
    control: verificationControl,
    handleSubmit: handleVerificationSubmit,
    formState: { errors: verificationErrors },
    setValue: setVerificationValue,
  } = useForm<VerificationFormData>({
    resolver: zodResolver(verificationSchema),
    defaultValues: {
      code: "",
    },
  });

  useEffect(() => {
    // Entrance animations
    fadeAnim.value = withTiming(1, { duration: 800 });
    slideAnim.value = withSpring(0, { damping: 15, stiffness: 100 });
    scaleAnim.value = withSpring(1, { damping: 12, stiffness: 120 });
  }, []);

  useEffect(() => {
    if (verification.state === "pending") {
      modalOpacity.value = withTiming(1, { duration: 300 });
      modalScale.value = withSpring(1, { damping: 15, stiffness: 150 });
    } else {
      modalOpacity.value = withTiming(0, { duration: 200 });
      modalScale.value = withTiming(0.8, { duration: 200 });
    }
  }, [verification.state]);

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
      setVerification({
        state: "pending",
        error: "",
      });
    } catch (err: any) {
      console.log(JSON.stringify(err, null, 2));
      const errorMessage = err?.errors?.[0]?.longMessage || "An error occurred. Please try again.";
      Alert.alert("Error", errorMessage);
    } finally {
      setIsSubmitting(false);
    }
  };

  const onPressVerify = async (verificationData: VerificationFormData) => {
    if (!isLoaded || isVerifying) return;

    setIsVerifying(true);
    try {
      const completeSignUp = await signUp.attemptEmailAddressVerification({
        code: verificationData.code,
      });

      if (completeSignUp.status === "complete") {
        const formData = getValues();
        await fetchAPI("/(api)/user", {
          method: "POST",
          body: JSON.stringify({
            name: formData.name,
            email: formData.email,
            clerkId: completeSignUp.createdUserId,
          }),
        });
        await setActive({ session: completeSignUp.createdSessionId });
        setVerification({
          state: "success",
          error: "",
        });
      } else {
        setVerification({
          state: "failed",
          error: "Verification failed. Please try again.",
        });
      }
    } catch (err: any) {
      console.log(JSON.stringify(err, null, 2));
      const errorMessage = err?.errors?.[0]?.longMessage || "Verification failed. Please try again.";
      setVerification({
        state: "failed",
        error: errorMessage,
      });
    } finally {
      setIsVerifying(false);
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

  const modalAnimatedStyle = useAnimatedStyle(() => ({
    opacity: modalOpacity.value,
    transform: [{ scale: modalScale.value }],
  }));

  return (
    <ScrollView className="flex-1 bg-gray-50" showsVerticalScrollIndicator={false} bounces={false}>
      <View className="flex-1">
        {/* Header Section */}
        <View className="relative w-full h-[280px] bg-white">
          <Image source={images.signUpCar} className="w-full h-[280px]" resizeMode="contain" />
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

        {/* Verification Modal */}
        <Modal visible={verification.state === "pending"} transparent animationType="none">
          <View className="flex-1 bg-black/50 justify-center items-center p-6">
            <Animated.View style={modalAnimatedStyle} className="bg-white rounded-3xl p-8 w-full max-w-sm">
              <View className="items-center mb-6">
                <View className="w-16 h-16 bg-blue-100 rounded-full items-center justify-center mb-4">
                  <LucideIcons.email size={32} color="#3B82F6" />
                </View>
                <Text className="text-2xl font-JakartaBold text-gray-800 text-center">Verify Email</Text>
                <Text className="text-gray-600 font-Jakarta text-center mt-2">
                  We&apos;ve sent a code to{"\n"}
                  <Text className="font-JakartaSemiBold">{getValues("email")}</Text>
                </Text>
              </View>

              <Controller
                control={verificationControl}
                name="code"
                render={({ field: { onChange, onBlur, value } }) => (
                  <View className="mb-4">
                    <View className="relative">
                      <View className="absolute left-4 top-1/2 -mt-3 z-10">
                        <LucideIcons.lock size={20} color="#6B7280" />
                      </View>
                      <TextInput
                        className="bg-gray-50 border border-gray-200 rounded-2xl pl-12 pr-4 py-4 text-gray-800 font-JakartaMedium text-base text-center tracking-widest"
                        placeholder="000000"
                        placeholderTextColor="#9CA3AF"
                        value={value}
                        keyboardType="numeric"
                        onChangeText={(text) => {
                          const numericText = text.replace(/[^0-9]/g, "").slice(0, 6);
                          onChange(numericText);
                          setVerificationValue("code", numericText);
                        }}
                        onBlur={onBlur}
                        maxLength={6}
                      />
                    </View>
                    {verificationErrors.code && <Text className="text-red-500 text-sm mt-2 text-center">{verificationErrors.code.message}</Text>}
                  </View>
                )}
              />

              {verification.error && <Text className="text-red-500 text-sm text-center mb-4">{verification.error}</Text>}

              <TouchableOpacity onPress={handleVerificationSubmit(onPressVerify)} disabled={isVerifying} className={`bg-green-600 rounded-2xl py-4 mb-4 ${isVerifying ? "opacity-70" : ""}`}>
                <Text className="text-white text-center font-JakartaBold text-lg">{isVerifying ? "Verifying..." : "Verify Email"}</Text>
              </TouchableOpacity>

              <TouchableOpacity onPress={() => setVerification({ ...verification, state: "default" })} className="py-2">
                <Text className="text-gray-500 text-center font-Jakarta">Cancel</Text>
              </TouchableOpacity>
            </Animated.View>
          </View>
        </Modal>

        {/* Success Modal */}
        <Modal visible={showSuccessModal} transparent animationType="fade">
          <View className="flex-1 bg-black/50 justify-center items-center p-6">
            <View className="bg-white rounded-3xl p-8 w-full max-w-sm items-center">
              <View className="w-24 h-24 bg-green-100 rounded-full items-center justify-center mb-6">
                <Image source={images.check} className="w-12 h-12" />
              </View>

              <Text className="text-2xl font-JakartaBold text-gray-800 text-center mb-2">Welcome Aboard!</Text>

              <Text className="text-gray-600 font-Jakarta text-center mb-8 leading-6">Your account has been successfully created and verified.</Text>

              <TouchableOpacity onPress={() => router.push(`/(root)/(tabs)/home`)} className="bg-blue-600 rounded-2xl py-4 w-full">
                <Text className="text-white text-center font-JakartaBold text-lg">Get Started</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>
      </View>
    </ScrollView>
  );
};

export default SignUp;
