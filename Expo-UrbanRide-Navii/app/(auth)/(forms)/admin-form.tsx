import InputField from "@/components/InputFields";
import { LucideIcons } from "@/constants/icons";
import { images } from "@/constants/images";
import { pickDocument, pickImage } from "@/core/utils/file_picker";
import Toast from "@/core/utils/ToastNotifier";
import { useAdminStore } from "@/global/use.admin.store";
import { loginAdmin } from "@/lib/admin";
import { zodResolver } from "@hookform/resolvers/zod";
import { Link, router } from "expo-router";
import React, { useEffect, useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { Image, KeyboardAvoidingView, Platform, ScrollView, Text, TouchableOpacity, View } from "react-native";
import Animated, { useAnimatedStyle, useSharedValue, withSequence, withSpring, withTiming } from "react-native-reanimated";
import { z } from "zod";

// Admin Login Schema
const adminLoginSchema = z.object({
  employeeId: z
    .string()
    .min(1, "Employee ID is required")
    .min(4, "Employee ID must be at least 4 characters")
    .max(20, "Employee ID must be less than 20 characters")
    .regex(/^[A-Z0-9]+$/, "Employee ID can only contain uppercase letters and numbers"),
  email: z
    .string()
    .min(1, "Email is required")
    .email("Please enter a valid email address")
    .refine((email) => email.endsWith("@company.com") || email.endsWith("@navii.com"), {
      message: "Please use your official company email address",
    }),
  department: z.string().min(1, "Department is required"),
});

type AdminLoginData = z.infer<typeof adminLoginSchema>;

export default function AdminForm() {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [toastVisible, setToastVisible] = useState(false);
  const [toastMessage, setToastMessage] = useState("");
  const [toastType, setToastType] = useState<"success" | "error">("success");
  const [verificationCardUrl, setVerificationCardUrl] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);

  // Animation values
  const fadeAnim = useSharedValue(0);
  const slideAnim = useSharedValue(50);
  const scaleAnim = useSharedValue(0.9);
  const buttonScale = useSharedValue(1);

  const {
    control,
    handleSubmit,
    formState: { errors },
  } = useForm<AdminLoginData>({
    resolver: zodResolver(adminLoginSchema),
    defaultValues: {
      employeeId: "",
      email: "",
      department: "",
    },
  });

  const { setAdmin, setLoading, setError, isLoading } = useAdminStore();

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

  const handleAdminLogin = async (data: AdminLoginData) => {
    buttonScale.value = withSequence(withTiming(0.95, { duration: 100 }), withTiming(1, { duration: 100 }));
    setIsSubmitting(true);
    setLoading(true);
    setError(null);

    try {
      // Send login request to API
      const adminProfile = await loginAdmin({ ...data,  });
      setAdmin(adminProfile);

      showToast("Admin login successful! Welcome to the admin panel.", "success");
      setTimeout(() => {
        router.replace("/(main)");
      }, 1500);
    } catch (err: any) {
      console.error("Admin login error:", err);
      const errorMessage = err?.message || "Login failed. Please try again.";
      setError(errorMessage);
      showToast(errorMessage, "error");
    } finally {
      setIsSubmitting(false);
      setLoading(false);
    }
  };

  // Handler for picking and uploading verification card (image or document)
  const handleVerificationCardUpload = async () => {
    setUploading(true);
    try {
      // Let user pick either image or document
      let picked = await pickImage();
      if (!picked) {
        picked = await pickDocument();
      }
      if (picked) {
        let result;
        if (picked.type === "image" || picked.mimeType?.startsWith("image/")) {
          // result = await uploadImage(picked, { folder: "admin-verification" });
        } else {
          // result = await uploadDocument(picked, { folder: "admin-verification" });
        }
        // setVerificationCardUrl(result.url);
        showToast("Verification card uploaded!", "success");
      } else {
        showToast("No file selected.", "error");
      }
    } catch (error) {
      showToast("Upload failed. Try again.", "error");
    } finally {
      setUploading(false);
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

  const departments = [
    { label: "Operations", value: "operations" },
    { label: "Customer Support", value: "customer_support" },
    { label: "Finance", value: "finance" },
    { label: "Technology", value: "technology" },
    { label: "Marketing", value: "marketing" },
    { label: "Human Resources", value: "hr" },
    { label: "Legal & Compliance", value: "legal" },
  ];

  return (
    <KeyboardAvoidingView className="flex-1" behavior={Platform.OS === "ios" ? "padding" : "height"} keyboardVerticalOffset={Platform.OS === "ios" ? 80 : 30}>
      <ScrollView className="flex-1 bg-gray-50" showsVerticalScrollIndicator={false} bounces={false} contentContainerStyle={{ flexGrow: 1 }} keyboardShouldPersistTaps="handled">
        <View className="flex-1">
          {/* Header Section */}
          <View className="relative w-full h-[280px] bg-white">
            <Image source={images.signUpCar} className="w-full h-[280px]" resizeMode="cover" />
            <View className="absolute inset-0 bg-purple-900/40" />
            <Animated.View style={containerAnimatedStyle} className="absolute bottom-0 left-0 right-0 p-5 bg-black/60 mb-4 rounded-t-3xl">
              <View className="flex-row items-center">
                <View className="bg-purple-600 rounded-full p-3 mr-4">
                  <LucideIcons.shield size={24} color="#FFFFFF" />
                </View>
                <View className="flex-1">
                  <Text className="text-xl text-white font-JakartaBold">Admin Access</Text>
                  <Text className="text-md text-white/90 font-Jakarta">Secure login for authorized personnel</Text>
                </View>
              </View>
            </Animated.View>
          </View>

          <Animated.View style={containerAnimatedStyle} className="flex-1 bg-gray-50 -mt-6">
            <View className="p-6 pt-8">
              {/* Security Notice */}
              <View className="bg-amber-50 border border-amber-200 rounded-2xl p-4 mb-6">
                <View className="flex-row items-center">
                  <LucideIcons.alertTriangle size={20} color="#D97706" />
                  <Text className="text-amber-800 font-JakartaSemiBold ml-2 flex-1">Authorized Personnel Only</Text>
                </View>
                <Text className="text-amber-700 text-sm mt-2">This area is restricted to verified admin staff. All access attempts are logged and monitored.</Text>
              </View>

              {/* Form Section */}
              <View className="mb-3">
                {/* Employee ID Field */}
                <Controller
                  control={control}
                  name="employeeId"
                  render={({ field: { onChange, onBlur, value } }) => (
                    <View className="mb-4">
                      <InputField label="Employee ID" icon={LucideIcons.badgeCheck} placeholder="Enter your employee ID" value={value} onChangeText={onChange} onBlur={onBlur} autoCapitalize="characters" />
                      {errors.employeeId && <Text className="text-red-500/70 text-sm mt-1 ml-1">{errors.employeeId.message}</Text>}
                    </View>
                  )}
                />

                {/* Email Field */}
                <Controller
                  control={control}
                  name="email"
                  render={({ field: { onChange, onBlur, value } }) => (
                    <View className="mb-4">
                      <InputField label="Official Email Address" icon={LucideIcons.email} placeholder="admin@company.com" value={value} onChangeText={onChange} onBlur={onBlur} keyboardType="email-address" autoCapitalize="none" textContentType="emailAddress" />
                      {errors.email && <Text className="text-red-500/70 text-sm mt-1 ml-1">{errors.email.message}</Text>}
                    </View>
                  )}
                />

                {/* Department Selection */}
                <Controller
                  control={control}
                  name="department"
                  render={({ field: { onChange, onBlur, value } }) => (
                    <View className="mb-4">
                      <Text className="text-base font-JakartaSemiBold text-gray-800 mb-3">Department</Text>
                      <ScrollView horizontal showsHorizontalScrollIndicator={false} className="mb-2" contentContainerStyle={{ paddingHorizontal: 4 }}>
                        <View className="flex-row space-x-3">
                          {departments.map((dept) => (
                            <TouchableOpacity key={dept.value} onPress={() => onChange(dept.value)} className={`px-4 py-3 rounded-2xl border-2 min-w-[120px] ${value === dept.value ? "border-purple-500 bg-purple-50" : "border-gray-200 bg-white"}`}>
                              <Text className={`font-JakartaMedium text-center text-sm ${value === dept.value ? "text-purple-700" : "text-gray-700"}`}>{dept.label}</Text>
                            </TouchableOpacity>
                          ))}
                        </View>
                      </ScrollView>
                      {errors.department && <Text className="text-red-500/70 text-sm mt-1 ml-1">{errors.department.message}</Text>}
                    </View>
                  )}
                />

                {/* Verification Card Upload Section */}
                <Text className="font-JakartaSemiBold text-base mb-2">Upload Verification Card (Image or Document)</Text>
                <View className="flex-row items-center mb-4">
                  <TouchableOpacity onPress={handleVerificationCardUpload} disabled={uploading} className="bg-purple-100 rounded-xl px-4 py-3 mr-3">
                    <Text className="text-purple-700 font-JakartaSemiBold">{uploading ? "Uploading..." : "Upload File"}</Text>
                  </TouchableOpacity>
                  {verificationCardUrl && <Text className="text-green-700 font-JakartaSemiBold">Uploaded</Text>}
                </View>
                {verificationCardUrl && (
                  <View className="mb-4">
                    <Text className="text-xs text-gray-600">File URL:</Text>
                    <Text className="text-xs text-blue-600">{verificationCardUrl}</Text>
                  </View>
                )}

                {/* Login Button */}
                <Animated.View style={buttonAnimatedStyle} className="mt-8">
                  <TouchableOpacity onPress={handleSubmit(handleAdminLogin)} disabled={isSubmitting} className={`bg-purple-600 rounded-2xl py-4 ${isSubmitting ? "opacity-70" : ""}`}>
                    <View className="flex-row items-center justify-center">
                      <LucideIcons.shield size={20} color="#FFFFFF" />
                      <Text className="text-white text-center font-JakartaBold text-lg ml-2">{isSubmitting ? "Verifying..." : "Secure Login"}</Text>
                    </View>
                  </TouchableOpacity>
                </Animated.View>

                {/* Help Section */}
                <View className="mt-8 p-4 bg-gray-100 rounded-2xl">
                  <Text className="text-gray-700 font-JakartaSemiBold text-sm mb-2">Need Help?</Text>
                  <Text className="text-gray-600 text-xs">Contact IT Support: support@company.com or call ext. 2024</Text>
                  <Text className="text-gray-600 text-xs mt-1">For emergency access, contact the system administrator.</Text>
                </View>

                {/* Back to Options */}
                <View className="flex-row justify-center items-center mt-6 mb-6">
                  <Text className="text-gray-600 font-Jakarta text-base">Not an admin? </Text>
                  <Link href="/options" asChild>
                    <TouchableOpacity>
                      <Text className="text-purple-600 font-JakartaBold text-base">Go Back</Text>
                    </TouchableOpacity>
                  </Link>
                </View>
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
