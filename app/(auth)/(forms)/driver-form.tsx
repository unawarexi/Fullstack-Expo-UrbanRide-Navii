import InputField from "@/components/InputFields";
import { LucideIcons } from "@/constants/icons";
import { images } from "@/constants/images";
import Toast from "@/core/utils/ToastNotifier";
import { pickImage } from "@/core/utils/file_picker";
import { useDriverStore } from "@/global/use.driver.store";
import { zodResolver } from "@hookform/resolvers/zod";
import { Link, router } from "expo-router";
import React, { useEffect, useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { Image, KeyboardAvoidingView, Platform, ScrollView, Text, TouchableOpacity, View } from "react-native";
import Animated, { useAnimatedStyle, useSharedValue, withSequence, withSpring, withTiming } from "react-native-reanimated";
import { z } from "zod";

// Step 1: Personal Information Schema
const personalInfoSchema = z.object({
  licenseNumber: z
    .string()
    .min(1, "License number is required")
    .min(6, "License number must be at least 6 characters")
    .max(20, "License number must be less than 20 characters")
    .regex(/^[A-Z0-9]+$/, "License number can only contain uppercase letters and numbers"),
  licenseExpiry: z
    .string()
    .min(1, "License expiry date is required")
    .regex(/^\d{4}-\d{2}-\d{2}$/, "Please use format YYYY-MM-DD"),
  identityType: z.string().min(1, "Identity type is required"),
  identityNumber: z.string().min(1, "Identity number is required").min(8, "Identity number must be at least 8 characters").max(20, "Identity number must be less than 20 characters"),
  bankAccountNumber: z.string().min(1, "Bank account number is required").min(10, "Bank account number must be at least 10 digits").regex(/^\d+$/, "Bank account number can only contain numbers"),
  bankName: z.string().min(1, "Bank name is required").min(2, "Bank name must be at least 2 characters").max(50, "Bank name must be less than 50 characters"),
});

// Step 2: Vehicle Information Schema
const vehicleInfoSchema = z.object({
  make: z.string().min(1, "Vehicle make is required").min(2, "Vehicle make must be at least 2 characters").max(30, "Vehicle make must be less than 30 characters"),
  model: z.string().min(1, "Vehicle model is required").min(2, "Vehicle model must be at least 2 characters").max(30, "Vehicle model must be less than 30 characters"),
  year: z
    .string()
    .min(1, "Vehicle year is required")
    .regex(/^\d{4}$/, "Please enter a valid 4-digit year")
    .refine((year) => {
      const currentYear = new Date().getFullYear();
      const vehicleYear = parseInt(year);
      return vehicleYear >= 2000 && vehicleYear <= currentYear;
    }, "Vehicle year must be between 2000 and current year"),
  color: z
    .string()
    .min(1, "Vehicle color is required")
    .min(3, "Vehicle color must be at least 3 characters")
    .max(20, "Vehicle color must be less than 20 characters")
    .regex(/^[a-zA-Z\s]+$/, "Color can only contain letters and spaces"),
  plateNumber: z
    .string()
    .min(1, "Plate number is required")
    .min(4, "Plate number must be at least 4 characters")
    .max(15, "Plate number must be less than 15 characters")
    .regex(/^[A-Z0-9\s-]+$/, "Plate number can only contain uppercase letters, numbers, spaces, and hyphens"),
  seats: z
    .string()
    .min(1, "Number of seats is required")
    .regex(/^[1-8]$/, "Seats must be between 1 and 8"),
  insuranceExpiry: z
    .string()
    .min(1, "Insurance expiry date is required")
    .regex(/^\d{4}-\d{2}-\d{2}$/, "Please use format YYYY-MM-DD"),
  registrationExpiry: z
    .string()
    .min(1, "Registration expiry date is required")
    .regex(/^\d{4}-\d{2}-\d{2}$/, "Please use format YYYY-MM-DD"),
});

type PersonalInfoData = z.infer<typeof personalInfoSchema>;
type VehicleInfoData = z.infer<typeof vehicleInfoSchema>;

const DriverRegisterForm = () => {
  const [currentStep, setCurrentStep] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [toastVisible, setToastVisible] = useState(false);
  const [toastMessage, setToastMessage] = useState("");
  const [toastType, setToastType] = useState<"success" | "error">("success");
  const [personalData, setPersonalData] = useState<PersonalInfoData | null>(null);
  const driverStore = useDriverStore();

  // Animation values
  const fadeAnim = useSharedValue(0);
  const slideAnim = useSharedValue(50);
  const scaleAnim = useSharedValue(0.9);
  const buttonScale = useSharedValue(1);
  const stepIndicatorAnim = useSharedValue(0);

  // Step 1 Form
  const personalForm = useForm<PersonalInfoData>({
    resolver: zodResolver(personalInfoSchema),
    defaultValues: {
      licenseNumber: "",
      licenseExpiry: "",
      identityType: "",
      identityNumber: "",
      bankAccountNumber: "",
      bankName: "",
    },
  });

  // Step 2 Form
  const vehicleForm = useForm<VehicleInfoData>({
    resolver: zodResolver(vehicleInfoSchema),
    defaultValues: {
      make: "",
      model: "",
      year: "",
      color: "",
      plateNumber: "",
      seats: "",
      insuranceExpiry: "",
      registrationExpiry: "",
    },
  });

  useEffect(() => {
    // Entrance animations
    fadeAnim.value = withTiming(1, { duration: 800 });
    slideAnim.value = withSpring(0, { damping: 15, stiffness: 100 });
    scaleAnim.value = withSpring(1, { damping: 12, stiffness: 120 });
    stepIndicatorAnim.value = withTiming(currentStep === 1 ? 0 : 1, { duration: 300 });
  }, [currentStep]);

  const showToast = (message: string, type: "success" | "error" = "success") => {
    setToastMessage(message);
    setToastType(type);
    setToastVisible(true);
  };

  const handleIdentityImagePick = async (index: number) => {
    const image = await pickImage();
    if (image) {
      const updated = [...driverStore.form.personal.identityImages];
      updated[index] = image;
      driverStore.setPersonal({ identityImages: updated });
    }
  };

  const handleVehicleImagePick = async (index: number) => {
    const image = await pickImage();
    if (image) {
      const updated = [...driverStore.form.vehicle.vehicleImages];
      updated[index] = image;
      driverStore.setVehicle({ vehicleImages: updated });
    }
  };

  const handleStep1Continue = (data: PersonalInfoData) => {
    buttonScale.value = withSequence(withTiming(0.95, { duration: 100 }), withTiming(1, { duration: 100 }));
    setPersonalData(data);
    setCurrentStep(2);
    showToast("Personal information saved! Now add your vehicle details.", "success");
    driverStore.setPersonal(data);
  };

  const handleBackToStep1 = () => {
    setCurrentStep(1);
  };

  const handleFinalSubmit = async (vehicleData: VehicleInfoData) => {
    if (!personalData) return;

    // Ensure all images are picked before submitting
    if (
      driverStore.form.personal.identityImages.length < 2 ||
      driverStore.form.personal.identityImages.some((img) => !img?.uri)
    ) {
      showToast("Please upload both front and back identity images.", "error");
      return;
    }
    if (
      driverStore.form.vehicle.vehicleImages.length < 6 ||
      driverStore.form.vehicle.vehicleImages.some((img) => !img?.uri)
    ) {
      showToast("Please upload all 6 vehicle images.", "error");
      return;
    }

    buttonScale.value = withSequence(withTiming(0.95, { duration: 100 }), withTiming(1, { duration: 100 }));
    setIsSubmitting(true);

    try {
      // Here you would combine personalData and vehicleData and submit to your API
      const driverRegistrationData = {
        ...personalData,
        ...vehicleData,
      };

      console.log("Driver Registration Data:", driverRegistrationData);

      // Simulate API call
      await new Promise((resolve) => setTimeout(resolve, 2000));

      // Replace with your userId logic
      const userId = "CURRENT_USER_ID";
      const result = await driverStore.submit(userId);

      showToast("Driver registration submitted successfully! Please wait for verification.", "success");

      // Navigate to success screen or back to options
      setTimeout(() => {
        router.replace("/(main)");
      }, 2000);
    } catch (err: any) {
      console.error("Registration error:", err);
      showToast("Registration failed. Please try again.", "error");
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

  const stepIndicatorStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: stepIndicatorAnim.value * 120 }],
  }));

  const identityTypes = [
    { label: "National ID", value: "national_id" },
    { label: "Passport", value: "passport" },
    { label: "Driver's License", value: "drivers_license" },
  ];

  return (
    <KeyboardAvoidingView className="flex-1" behavior={Platform.OS === "ios" ? "padding" : "height"} keyboardVerticalOffset={Platform.OS === "ios" ? 80 : 30}>
      <ScrollView className="flex-1 bg-gray-50" showsVerticalScrollIndicator={false} bounces={false} contentContainerStyle={{ flexGrow: 1 }} keyboardShouldPersistTaps="handled">
        <View className="flex-1">
          {/* Header Section */}
          <View className="relative w-full h-[280px] bg-white">
            <Image source={images.signUpCar} className="w-full h-[280px]" resizeMode="cover" />
            <View className="absolute inset-0 bg-black/20" />
            <Animated.View style={containerAnimatedStyle} className="absolute bottom-0 left-0 right-0 p-5 bg-black/60 mb-4 rounded-t-3xl">
              <Text className="text-xl text-white font-JakartaBold">{currentStep === 1 ? "Personal Information" : "Vehicle Information"}</Text>
              <Text className="text-md text-white/90 font-Jakarta">{currentStep === 1 ? "Step 1 of 2 - Enter your personal details" : "Step 2 of 2 - Add your vehicle details"}</Text>
            </Animated.View>
          </View>

          {/* Step Indicator */}
          <View className="px-6 py-4 bg-white">
            <View className="flex-row items-center justify-center">
              <View className="flex-row bg-gray-200 rounded-full p-1">
                <Animated.View style={stepIndicatorStyle} className="absolute top-1 left-1 w-[120px] h-8 bg-blue-600 rounded-full" />
                <TouchableOpacity onPress={() => setCurrentStep(1)} className="px-6 py-2 rounded-full z-10">
                  <Text className={`font-JakartaSemiBold text-sm ${currentStep === 1 ? "text-white" : "text-gray-600"}`}>Personal</Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={() => personalData && setCurrentStep(2)} className="px-6 py-2 rounded-full z-10" disabled={!personalData}>
                  <Text className={`font-JakartaSemiBold text-sm ${currentStep === 2 ? "text-white" : "text-gray-600"}`}>Vehicle</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>

          <Animated.View style={containerAnimatedStyle} className="flex-1 bg-gray-50 -mt-2">
            <View className="p-6 pt-8">
              {currentStep === 1 ? (
                // Step 1: Personal Information Form
                <View className="mb-3">
                  <Controller
                    control={personalForm.control}
                    name="licenseNumber"
                    render={({ field: { onChange, onBlur, value } }) => (
                      <View className="mb-4">
                        <InputField label="Driver's License Number" icon={LucideIcons.person} placeholder="Enter your license number" value={value} onChangeText={onChange} onBlur={onBlur} autoCapitalize="characters" />
                        {personalForm.formState.errors.licenseNumber && <Text className="text-red-500/70 text-sm mt-1 ml-1">{personalForm.formState.errors.licenseNumber.message}</Text>}
                      </View>
                    )}
                  />

                  <Controller
                    control={personalForm.control}
                    name="licenseExpiry"
                    render={({ field: { onChange, onBlur, value } }) => (
                      <View className="mb-4">
                        <InputField label="License Expiry Date" icon={LucideIcons.calendar} placeholder="YYYY-MM-DD" value={value} onChangeText={onChange} onBlur={onBlur} />
                        {personalForm.formState.errors.licenseExpiry && <Text className="text-red-500/70 text-sm mt-1 ml-1">{personalForm.formState.errors.licenseExpiry.message}</Text>}
                      </View>
                    )}
                  />

                  <Controller
                    control={personalForm.control}
                    name="identityType"
                    render={({ field: { onChange, onBlur, value } }) => (
                      <View className="mb-4">
                        <Text className="text-base font-JakartaSemiBold text-gray-800 mb-3">Identity Document Type</Text>
                        <View className="space-y-2">
                          {identityTypes.map((type) => (
                            <TouchableOpacity key={type.value} onPress={() => onChange(type.value)} className={`p-4 rounded-2xl border-2 ${value === type.value ? "border-blue-500 bg-blue-50" : "border-gray-200 bg-white"}`}>
                              <Text className={`font-JakartaMedium ${value === type.value ? "text-blue-700" : "text-gray-700"}`}>{type.label}</Text>
                            </TouchableOpacity>
                          ))}
                        </View>
                        {personalForm.formState.errors.identityType && <Text className="text-red-500/70 text-sm mt-1 ml-1">{personalForm.formState.errors.identityType.message}</Text>}
                      </View>
                    )}
                  />

                  <Controller
                    control={personalForm.control}
                    name="identityNumber"
                    render={({ field: { onChange, onBlur, value } }) => (
                      <View className="mb-4">
                        <InputField label="Identity Document Number" icon={LucideIcons.person} placeholder="Enter your identity number" value={value} onChangeText={onChange} onBlur={onBlur} />
                        {personalForm.formState.errors.identityNumber && <Text className="text-red-500/70 text-sm mt-1 ml-1">{personalForm.formState.errors.identityNumber.message}</Text>}
                      </View>
                    )}
                  />

                  <Controller
                    control={personalForm.control}
                    name="bankName"
                    render={({ field: { onChange, onBlur, value } }) => (
                      <View className="mb-4">
                        <InputField label="Bank Name" icon={LucideIcons.bank} placeholder="Enter your bank name" value={value} onChangeText={onChange} onBlur={onBlur} />
                        {personalForm.formState.errors.bankName && <Text className="text-red-500/70 text-sm mt-1 ml-1">{personalForm.formState.errors.bankName.message}</Text>}
                      </View>
                    )}
                  />

                  <Controller
                    control={personalForm.control}
                    name="bankAccountNumber"
                    render={({ field: { onChange, onBlur, value } }) => (
                      <View className="mb-4">
                        <InputField label="Bank Account Number" icon={LucideIcons.bank} placeholder="Enter your account number" value={value} onChangeText={onChange} onBlur={onBlur} keyboardType="numeric" />
                        {personalForm.formState.errors.bankAccountNumber && <Text className="text-red-500/70 text-sm mt-1 ml-1">{personalForm.formState.errors.bankAccountNumber.message}</Text>}
                      </View>
                    )}
                  />

                  {/* Identity Images Upload */}
                  <Text className="font-JakartaSemiBold text-base mb-2">Upload Identity Images (Front & Back)</Text>
                  <View className="flex-row space-x-4 mb-4">
                    {[0, 1].map((idx) => (
                      <TouchableOpacity key={idx} onPress={() => handleIdentityImagePick(idx)} className="w-24 h-24 bg-gray-200 rounded-xl items-center justify-center">
                        {driverStore.form.personal.identityImages[idx]?.uri ? (
                          <Image source={{ uri: driverStore.form.personal.identityImages[idx].uri }} className="w-24 h-24 rounded-xl" />
                        ) : (
                          <Text className="text-gray-500">Upload</Text>
                        )}
                      </TouchableOpacity>
                    ))}
                  </View>

                  {/* Continue Button */}
                  <Animated.View style={buttonAnimatedStyle} className="mt-8">
                    <TouchableOpacity onPress={personalForm.handleSubmit(handleStep1Continue)} className="bg-blue-600 rounded-2xl py-4">
                      <Text className="text-white text-center font-JakartaBold text-lg">Continue to Vehicle Info</Text>
                    </TouchableOpacity>
                  </Animated.View>
                </View>
              ) : (
                // Step 2: Vehicle Information Form
                <View className="mb-3">
                  <Controller
                    control={vehicleForm.control}
                    name="make"
                    render={({ field: { onChange, onBlur, value } }) => (
                      <View className="mb-4">
                        <InputField label="Vehicle Make" icon={LucideIcons.car} placeholder="e.g., Toyota, Honda, Ford" value={value} onChangeText={onChange} onBlur={onBlur} />
                        {vehicleForm.formState.errors.make && <Text className="text-red-500/70 text-sm mt-1 ml-1">{vehicleForm.formState.errors.make.message}</Text>}
                      </View>
                    )}
                  />

                  <Controller
                    control={vehicleForm.control}
                    name="model"
                    render={({ field: { onChange, onBlur, value } }) => (
                      <View className="mb-4">
                        <InputField label="Vehicle Model" icon={LucideIcons.car} placeholder="e.g., Camry, Civic, Focus" value={value} onChangeText={onChange} onBlur={onBlur} />
                        {vehicleForm.formState.errors.model && <Text className="text-red-500/70 text-sm mt-1 ml-1">{vehicleForm.formState.errors.model.message}</Text>}
                      </View>
                    )}
                  />

                  <View className="flex-row space-x-4 mb-4">
                    <View className="flex-1">
                      <Controller
                        control={vehicleForm.control}
                        name="year"
                        render={({ field: { onChange, onBlur, value } }) => (
                          <View>
                            <InputField label="Year" icon={LucideIcons.calendar} placeholder="2020" value={value} onChangeText={onChange} onBlur={onBlur} keyboardType="numeric" />
                            {vehicleForm.formState.errors.year && <Text className="text-red-500/70 text-sm mt-1 ml-1">{vehicleForm.formState.errors.year.message}</Text>}
                          </View>
                        )}
                      />
                    </View>
                    <View className="flex-1">
                      <Controller
                        control={vehicleForm.control}
                        name="seats"
                        render={({ field: { onChange, onBlur, value } }) => (
                          <View>
                            <InputField label="Seats" icon={LucideIcons.users} placeholder="4" value={value} onChangeText={onChange} onBlur={onBlur} keyboardType="numeric" />
                            {vehicleForm.formState.errors.seats && <Text className="text-red-500/70 text-sm mt-1 ml-1">{vehicleForm.formState.errors.seats.message}</Text>}
                          </View>
                        )}
                      />
                    </View>
                  </View>

                  <Controller
                    control={vehicleForm.control}
                    name="color"
                    render={({ field: { onChange, onBlur, value } }) => (
                      <View className="mb-4">
                        <InputField label="Vehicle Color" icon={LucideIcons.palette} placeholder="e.g., White, Black, Red" value={value} onChangeText={onChange} onBlur={onBlur} />
                        {vehicleForm.formState.errors.color && <Text className="text-red-500/70 text-sm mt-1 ml-1">{vehicleForm.formState.errors.color.message}</Text>}
                      </View>
                    )}
                  />

                  <Controller
                    control={vehicleForm.control}
                    name="plateNumber"
                    render={({ field: { onChange, onBlur, value } }) => (
                      <View className="mb-4">
                        <InputField label="License Plate Number" icon={LucideIcons.car} placeholder="ABC-123" value={value} onChangeText={onChange} onBlur={onBlur} autoCapitalize="characters" />
                        {vehicleForm.formState.errors.plateNumber && <Text className="text-red-500/70 text-sm mt-1 ml-1">{vehicleForm.formState.errors.plateNumber.message}</Text>}
                      </View>
                    )}
                  />

                  <Controller
                    control={vehicleForm.control}
                    name="insuranceExpiry"
                    render={({ field: { onChange, onBlur, value } }) => (
                      <View className="mb-4">
                        <InputField label="Insurance Expiry Date" icon={LucideIcons.calendar} placeholder="YYYY-MM-DD" value={value} onChangeText={onChange} onBlur={onBlur} />
                        {vehicleForm.formState.errors.insuranceExpiry && <Text className="text-red-500/70 text-sm mt-1 ml-1">{vehicleForm.formState.errors.insuranceExpiry.message}</Text>}
                      </View>
                    )}
                  />

                  <Controller
                    control={vehicleForm.control}
                    name="registrationExpiry"
                    render={({ field: { onChange, onBlur, value } }) => (
                      <View className="mb-4">
                        <InputField label="Registration Expiry Date" icon={LucideIcons.calendar} placeholder="YYYY-MM-DD" value={value} onChangeText={onChange} onBlur={onBlur} />
                        {vehicleForm.formState.errors.registrationExpiry && <Text className="text-red-500/70 text-sm mt-1 ml-1">{vehicleForm.formState.errors.registrationExpiry.message}</Text>}
                      </View>
                    )}
                  />

                  {/* Vehicle Images Upload */}
                  <Text className="font-JakartaSemiBold text-base mb-2">Upload Vehicle Images (6 required)</Text>
                  <View className="flex-row flex-wrap gap-2 mb-4">
                    {[0, 1, 2, 3, 4, 5].map((idx) => (
                      <TouchableOpacity key={idx} onPress={() => handleVehicleImagePick(idx)} className="w-20 h-20 bg-gray-200 rounded-xl items-center justify-center">
                        {driverStore.form.vehicle.vehicleImages[idx]?.uri ? (
                          <Image source={{ uri: driverStore.form.vehicle.vehicleImages[idx].uri }} className="w-20 h-20 rounded-xl" />
                        ) : (
                          <Text className="text-gray-500">Upload</Text>
                        )}
                      </TouchableOpacity>
                    ))}
                  </View>

                  {/* Action Buttons */}
                  <View className="mt-8 space-y-4">
                    {/* Back Button */}
                    <TouchableOpacity onPress={handleBackToStep1} className="bg-gray-200 rounded-2xl py-4">
                      <Text className="text-gray-700 text-center font-JakartaBold text-lg">Back to Personal Info</Text>
                    </TouchableOpacity>

                    {/* Submit Button */}
                    <Animated.View style={buttonAnimatedStyle}>
                      <TouchableOpacity onPress={vehicleForm.handleSubmit(handleFinalSubmit)} disabled={isSubmitting} className={`bg-blue-600 rounded-2xl py-4 ${isSubmitting ? "opacity-70" : ""}`}>
                        <Text className="text-white text-center font-JakartaBold text-lg">{isSubmitting ? "Registering..." : "Complete Registration"}</Text>
                      </TouchableOpacity>
                    </Animated.View>
                  </View>
                </View>
              )}

              {/* Sign In Link */}
              <View className="flex-row justify-center items-center mt-8 mb-6">
                <Text className="text-gray-600 font-Jakarta text-base">Already a driver? </Text>
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

export default DriverRegisterForm;
