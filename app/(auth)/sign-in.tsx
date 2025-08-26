import OAuth from "@/components/OAuth";
import { LucideIcons } from "@/constants/icons";
import { images } from "@/constants/images";
import { useSignIn } from "@clerk/clerk-expo";
import { zodResolver } from "@hookform/resolvers/zod";
import { Link, router } from "expo-router";
import { useCallback, useEffect, useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { Alert, Image, ScrollView, Text, TextInput, TouchableOpacity, View } from "react-native";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSequence,
  withSpring,
  withTiming
} from 'react-native-reanimated';
import { z } from "zod";

// const { width: screenWidth, height: screenHeight } = Dimensions.get('window');

// Validation schema
const signInSchema = z.object({
  email: z.string().min(1, "Email is required").email("Please enter a valid email address"),
  password: z.string().min(1, "Password is required").min(6, "Password must be at least 6 characters"),
});

type SignInFormData = z.infer<typeof signInSchema>;

const SignIn = () => {
  const { signIn, setActive, isLoaded } = useSignIn();
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Animation values
  const fadeAnim = useSharedValue(0);
  const slideAnim = useSharedValue(50);
  const scaleAnim = useSharedValue(0.9);
  const buttonScale = useSharedValue(1);

  const {
    control,
    handleSubmit,
    formState: { errors },
  } = useForm<SignInFormData>({
    resolver: zodResolver(signInSchema),
    defaultValues: {
      email: "",
      password: "",
    },
  });

  useEffect(() => {
    // Entrance animations
    fadeAnim.value = withTiming(1, { duration: 800 });
    slideAnim.value = withSpring(0, { damping: 15, stiffness: 100 });
    scaleAnim.value = withSpring(1, { damping: 12, stiffness: 120 });
  }, []);

  const onSignInPress = useCallback(
    async (data: SignInFormData) => {
      if (!isLoaded || isSubmitting) return;

      // Button press animation
      buttonScale.value = withSequence(
        withTiming(0.95, { duration: 100 }),
        withTiming(1, { duration: 100 })
      );

      setIsSubmitting(true);
      try {
        const signInAttempt = await signIn.create({
          identifier: data.email,
          password: data.password,
        });

        if (signInAttempt.status === "complete") {
          await setActive({ session: signInAttempt.createdSessionId });
          router.replace("/(root)/(tabs)/home");
        } else {
          console.log(JSON.stringify(signInAttempt, null, 2));
          Alert.alert("Error", "Log in failed. Please try again.");
        }
      } catch (err: any) {
        console.log(JSON.stringify(err, null, 2));
        const errorMessage = err?.errors?.[0]?.longMessage || "An error occurred. Please try again.";
        Alert.alert("Error", errorMessage);
      } finally {
        setIsSubmitting(false);
      }
    },
    [isLoaded, signIn, setActive, isSubmitting, buttonScale]
  );

  // Animated styles
  const containerAnimatedStyle = useAnimatedStyle(() => ({
    opacity: fadeAnim.value,
    transform: [
      { translateY: slideAnim.value },
      { scale: scaleAnim.value }
    ]
  }));

  const buttonAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: buttonScale.value }]
  }));

  return (
    <ScrollView className="flex-1 bg-gray-50" showsVerticalScrollIndicator={false} bounces={false}>
      <View className="flex-1">
        {/* Header Section */}
        <View className="relative w-full h-[280px] bg-white">
          <Image source={images.signUpCar} className="w-full h-[280px]" resizeMode="cover" />
          <View className="absolute inset-0 bg-white/10" />
          <Animated.View style={containerAnimatedStyle} className="absolute bottom-0 left-0 right-0 p-5 bg-black/60 mb-4 rounded-t-3xl">
            <Text className="text-xl text-white font-JakartaBold">Welcome Back</Text>
            <Text className="text-md text-white/90 font-Jakarta">Sign in to continue your journey</Text>
          </Animated.View>
        </View>

        <Animated.View style={containerAnimatedStyle} className="flex-1 bg-gray-50 -mt-6">
          <View className="p-6 pt-8">
            {/* Form Section */}
            <View className="mb-6">
              {/* Email Field */}
              <Controller
                control={control}
                name="email"
                render={({ field: { onChange, onBlur, value } }) => (
                  <View className="mb-5">
                    <Text className="text-base font-JakartaSemiBold text-gray-800 mb-3">Email Address</Text>
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
                    {errors.email && <Text className="text-red-500 text-sm mt-2 ml-1">{errors.email.message}</Text>}
                  </View>
                )}
              />

              {/* Password Field */}
              <Controller
                control={control}
                name="password"
                render={({ field: { onChange, onBlur, value } }) => (
                  <View>
                    <Text className="text-base font-JakartaSemiBold text-gray-800 mb-3">Password</Text>
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
                        textContentType="password"
                      />
                      <TouchableOpacity onPress={() => setShowPassword(!showPassword)} className="absolute right-4 top-1/2 -mt-3 p-1" hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
                        {showPassword ? <LucideIcons.eyecross size={20} color="#6B7280" /> : <LucideIcons.eye size={20} color="#6B7280" />}
                      </TouchableOpacity>
                    </View>
                    {errors.password && <Text className="text-red-500 text-sm mt-2 ml-1">{errors.password.message}</Text>}
                  </View>
                )}
              />
            </View>
          </View>

          {/* Sign In Button */}
          <Animated.View style={buttonAnimatedStyle} className="mt-8 w-[90%] mx-auto">
            <TouchableOpacity onPress={handleSubmit(onSignInPress)} disabled={isSubmitting} className={`bg-blue-600 rounded-2xl py-4 ${isSubmitting ? "opacity-70" : ""}`}>
              <Text className="text-white text-center font-JakartaBold text-lg">{isSubmitting ? "Signing In..." : "Sign In"}</Text>
            </TouchableOpacity>
          </Animated.View>

          {/* OAuth Section */}
          <View className="my-8 mx-6">
            <OAuth />
          </View>

          {/* Sign Up Link */}
          <View className="flex-row justify-center items-center">
            <Text className="text-gray-600 font-Jakarta text-base">Don&apos;t have an account? </Text>
            <Link href="/sign-up" asChild>
              <TouchableOpacity>
                <Text className="text-blue-600 font-JakartaBold text-base">Sign Up</Text>
              </TouchableOpacity>
            </Link>
          </View>
        </Animated.View>
      </View>
    </ScrollView>
  );
};

export default SignIn;