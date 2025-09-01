import * as DocumentPicker from "expo-document-picker";
import * as ImagePicker from "expo-image-picker";
import { Alert } from "react-native";
import { PickedAsset } from "../types/type";



// 1. Image picker for all types of images only
export const pickImage = async (): Promise<PickedAsset | null> => {
  try {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== "granted") {
      Alert.alert("Permission Required", "Permission required to access media library");
      return null;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images, // Images only
      allowsEditing: true,
      quality: 1,
      allowsMultipleSelection: false,
    });

    if (!result.canceled && result.assets && result.assets.length > 0) {
      const asset = result.assets[0];
      const pickedAsset: PickedAsset = {
        uri: asset.uri,
        type: asset.type,
        fileName: asset.fileName || undefined,
        mimeType: asset.mimeType || undefined,
        width: asset.width,
        height: asset.height,
      };

      console.log("Picked image URI:", asset.uri);
      return pickedAsset;
    }
    return null;
  } catch (error) {
    console.error("Error picking image:", error);
    Alert.alert("Error", "Failed to pick image");
    return null;
  }
};

// 2. Media picker for all files including videos, gifs, and audio
export const pickMedia = async (): Promise<PickedAsset | null> => {
  try {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== "granted") {
      Alert.alert("Permission Required", "Permission required to access media library");
      return null;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.All, // Images and videos
      allowsEditing: true,
      quality: 1,
      allowsMultipleSelection: false,
    });

    if (!result.canceled && result.assets && result.assets.length > 0) {
      const asset = result.assets[0];
      const pickedAsset: PickedAsset = {
        uri: asset.uri,
        type: asset.type,
        fileName: asset.fileName || undefined,
        mimeType: asset.mimeType || undefined,
        width: asset.width,
        height: asset.height,
      };

      console.log("Picked media URI:", asset.uri);
      console.log("Media type:", asset.type);
      return pickedAsset;
    }
    return null;
  } catch (error) {
    console.error("Error picking media:", error);
    Alert.alert("Error", "Failed to pick media");
    return null;
  }
};

// 3. Document picker for all types of documents
export const pickDocument = async (): Promise<PickedAsset | null> => {
  try {
    const doc = await DocumentPicker.getDocumentAsync({
      type: "*/*", // Wildcard to allow any file type
      copyToCacheDirectory: true,
      multiple: false,
    });

    if (!doc.canceled && doc.assets && doc.assets.length > 0) {
      const asset = doc.assets[0];
      const pickedAsset: PickedAsset = {
        uri: asset.uri,
        fileName: asset.name,
        mimeType: asset.mimeType || undefined,
        size: asset.size || undefined,
      };

      console.log("Picked document URI:", asset.uri);
      console.log("Document name:", asset.name);
      console.log("Document size:", asset.size);
      return pickedAsset;
    }
    return null;
  } catch (error) {
    console.error("Error picking document:", error);
    Alert.alert("Error", "Failed to pick document");
    return null;
  }
};

// Utility function to pick from camera
export const pickFromCamera = async (): Promise<PickedAsset | null> => {
  try {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== "granted") {
      Alert.alert("Permission Required", "Permission required to access camera");
      return null;
    }

    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.All,
      allowsEditing: true,
      quality: 1,
    });

    if (!result.canceled && result.assets && result.assets.length > 0) {
      const asset = result.assets[0];
      const pickedAsset: PickedAsset = {
        uri: asset.uri,
        type: asset.type,
        fileName: asset.fileName || undefined,
        mimeType: asset.mimeType || undefined,
        width: asset.width,
        height: asset.height,
      };

      console.log("Captured from camera URI:", asset.uri);
      return pickedAsset;
    }
    return null;
  } catch (error) {
    console.error("Error picking from camera:", error);
    Alert.alert("Error", "Failed to capture from camera");
    return null;
  }
};

/* 
Example usage in any component:

import { pickImage, pickMedia, pickDocument, pickFromCamera } from './file_picker';

const MyComponent = () => {
  const handleImagePick = async () => {
    const image = await pickImage();
    if (image) {
      console.log('Selected image:', image.uri);
      // Use the image
    }
  };

  const handleMediaPick = async () => {
    const media = await pickMedia();
    if (media) {
      console.log('Selected media:', media.uri, media.type);
      // Use the media file
    }
  };

  const handleDocumentPick = async () => {
    const document = await pickDocument();
    if (document) {
      console.log('Selected document:', document.fileName);
      // Use the document
    }
  };

  const handleCameraPick = async () => {
    const photo = await pickFromCamera();
    if (photo) {
      console.log('Captured photo:', photo.uri);
      // Use the captured photo
    }
  };

  return (
    <View>
      <TouchableOpacity onPress={handleImagePick}>
        <Text>Pick Image</Text>
      </TouchableOpacity>
      <TouchableOpacity onPress={handleMediaPick}>
        <Text>Pick Media</Text>
      </TouchableOpacity>
      <TouchableOpacity onPress={handleDocumentPick}>
        <Text>Pick Document</Text>
      </TouchableOpacity>
      <TouchableOpacity onPress={handleCameraPick}>
        <Text>Take Photo</Text>
      </TouchableOpacity>
    </View>
  );
};
*/
