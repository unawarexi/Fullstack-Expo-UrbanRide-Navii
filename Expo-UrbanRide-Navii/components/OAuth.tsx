import { images } from "@/constants/images";
import Toast from "@/core/utils/ToastNotifier";
import { useUserStore } from "@/global/use.user.store";
import { useGoogleAuth } from "@/lib/auth";
import { router } from "expo-router";
import React, { useState } from "react";
import { ActivityIndicator, Image, StyleSheet, Text, View } from "react-native";
import CustomButton from "./CustomButton";

const OAuth = () => {
  const { signInWithGoogle, loading } = useGoogleAuth();
  const userStore = useUserStore();
  const [toastVisible, setToastVisible] = useState(false);
  const [toastMessage, setToastMessage] = useState("");
  const [toastType, setToastType] = useState<"success" | "error">("success");

  const showToast = (message: string, type: "success" | "error" = "success") => {
    setToastMessage(message);
    setToastType(type);
    setToastVisible(true);
  };

  const handleGoogleSignIn = async () => {
    if (loading) return;

    try {
      const result = await signInWithGoogle(userStore.createUser);

      if (result.success) {
        showToast("Successfully signed in with Google!", "success");

        // Navigate to home after a short delay to show success message
        setTimeout(() => {
          router.replace("/(main)");
        }, 1500);
      } else {
        showToast(result.message || "Google sign-in failed", "error");
      }
    } catch (error: any) {
      console.error("Google sign-in error:", error);
      showToast("Failed to sign in with Google. Please try again.", "error");
    }
  };

  return (
    <View>
      <View className="flex flex-row justify-center items-center mt-4 gap-x-3">
        <View className="flex-1 h-[1px] bg-general-100" />
        <Text className="text-lg text-gray-600 font-Jakarta">Or</Text>
        <View className="flex-1 h-[1px] bg-general-100" />
      </View>

      <CustomButton
        title={loading ? "Signing in..." : "Continue with Google"}
        className="mt-5 w-full shadow-none"
        IconLeft={() => (loading ? <ActivityIndicator size="small" color="#3B82F6" style={{ marginHorizontal: 8 }} /> : <Image source={images.google} resizeMode="contain" className="w-5 h-5 mx-2" />)}
        bgVariant="outline"
        textVariant="primary"
        onPress={handleGoogleSignIn}
        disabled={loading}
      />

      {/* Toast Component */}
      <Toast visible={toastVisible} message={toastMessage} type={toastType} onHide={() => setToastVisible(false)} />
    </View>
  );
};

export default OAuth;

const styles = StyleSheet.create({});
