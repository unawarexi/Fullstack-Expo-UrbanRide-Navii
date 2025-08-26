import { useUser } from "@clerk/clerk-expo";
import { ActivityIndicator, SafeAreaView, Text, View } from "react-native";
// import { recentRides } from "@/core/data/data";

export default function Home() {
  const { user, isLoaded } = useUser();

  // Show loading while user data is being fetched
  if (!isLoaded) {
    return (
      <SafeAreaView className="flex-1 bg-gray-50 justify-center items-center">
        <ActivityIndicator size="large" color="#3B82F6" />
        <Text className="mt-4 text-gray-600">Loading...</Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-gray-50">
      <View className="flex-1 justify-center items-center p-6">
        {user ? (
          <View className="items-center">
            <Text className="text-2xl font-JakartaBold text-gray-800 mb-4">Welcome Home!</Text>
            <Text className="text-lg font-JakartaMedium text-gray-600 mb-2">Hello, {user.firstName || user.emailAddresses[0]?.emailAddress}</Text>
            <Text className="text-base text-gray-500 text-center">You&apos;re successfully signed in to the app</Text>
          </View>
        ) : (
          <View className="items-center">
            <Text className="text-xl font-JakartaBold text-gray-800 mb-4">No User Data</Text>
            <Text className="text-base text-gray-500 text-center">Unable to load user information</Text>
          </View>
        )}
      </View>
    </SafeAreaView>
  );
}
