import { LucideIcons } from "@/constants/icons";
import { pickImage } from "@/core/utils/file_picker";
import { useUserStore } from "@/global/use.user.store";
import React, { useState } from "react";
import { ActivityIndicator, Image, StyleSheet, Text, TouchableOpacity, View } from "react-native";

const ProfileScreen = () => {
  const userStore = useUserStore();
  const clerkId = userStore.user?.clerkId;
  const [profileImagePreview, setProfileImagePreview] = useState<string | null>(userStore.user?.profileImageUrl || null);
  const [loading, setLoading] = useState(false);

  const handleProfileImagePick = async () => {
    const image = await pickImage();
    if (image && clerkId) {
      setLoading(true);
      setProfileImagePreview(image.uri);
      // Upload to ImageKit and update user profile
      try {
        const uploadResult = await userStore.uploadProfileImage(image);
        await userStore.updateUserProfile({ clerkId, profileImageUrl: uploadResult.url });
        setProfileImagePreview(uploadResult.url);
      } catch (err) {
        // Handle error (show toast or message)
      } finally {
        setLoading(false);
      }
    }
  };

  const handleRemoveImage = async () => {
    if (!clerkId) return;
    setLoading(true);
    try {
      await userStore.updateUserProfile({ clerkId, profileImageUrl: "" });
      setProfileImagePreview(null);
    } catch (err) {
      // Handle error
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={{ flex: 1, padding: 24, backgroundColor: "#F9FAFB" }}>
      <Text style={{ fontSize: 24, fontWeight: "bold", marginBottom: 24 }}>Profile</Text>
      <View style={{ alignItems: "center", marginBottom: 32 }}>
        <TouchableOpacity onPress={handleProfileImagePick} style={{ width: 120, height: 120, borderRadius: 60, backgroundColor: "#E5E7EB", alignItems: "center", justifyContent: "center" }}>
          {profileImagePreview ? (
            <View style={{ width: "100%", height: "100%" }}>
              <Image source={{ uri: profileImagePreview }} style={{ width: "100%", height: "100%", borderRadius: 60 }} />
              <TouchableOpacity
                onPress={handleRemoveImage}
                style={{ position: "absolute", top: 4, right: 4, backgroundColor: "#EF4444", borderRadius: 12, padding: 4 }}
              >
                <LucideIcons.close size={16} color="#fff" />
              </TouchableOpacity>
            </View>
          ) : (
            <Text style={{ color: "#6B7280" }}>Upload</Text>
          )}
        </TouchableOpacity>
        {loading && <ActivityIndicator style={{ marginTop: 12 }} color="#3B82F6" />}
      </View>
      {/* ...other profile info and actions... */}
    </View>
  );
};

export default ProfileScreen;

const styles = StyleSheet.create({})