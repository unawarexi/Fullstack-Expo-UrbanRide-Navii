import { ClerkProvider } from "@clerk/clerk-expo";
import { tokenCache } from "@clerk/clerk-expo/token-cache";
import { useFonts } from 'expo-font';
import { Stack } from 'expo-router';
import * as SplashScreen from "expo-splash-screen";
import { StatusBar } from 'expo-status-bar';
import React, { useEffect } from "react";
import 'react-native-reanimated';



import "../global.css";


export default function RootLayout() {
  // const colorScheme = useColorScheme();
  const [loaded] = useFonts({
    "Jakarta-Bold": require("../assets/fonts/PlusJakartaSans-Bold.ttf"),
    "Jakarta-ExtraBold": require("../assets/fonts/PlusJakartaSans-ExtraBold.ttf"),
    "Jakarta-ExtraLight": require("../assets/fonts/PlusJakartaSans-ExtraLight.ttf"),
    "Jakarta-Light": require("../assets/fonts/PlusJakartaSans-Light.ttf"),
    "Jakarta-Medium": require("../assets/fonts/PlusJakartaSans-Medium.ttf"),
    Jakarta: require("../assets/fonts/PlusJakartaSans-Regular.ttf"),
    "Jakarta-SemiBold": require("../assets/fonts/PlusJakartaSans-SemiBold.ttf"),
  });


    useEffect(() => {
      if (loaded) {
        SplashScreen.hideAsync();
      }
    }, [loaded]);


  if (!loaded) {
    // Async font loading only occurs in development.
    return null;
  }

  return (
    <>
      <ClerkProvider tokenCache={tokenCache}>
        <Stack screenOptions={{ headerShown: false }}>
          <Stack.Screen name="index" />
          <Stack.Screen name="(auth)" />
          <Stack.Screen name="(root)" />
          {/* <Stack.Screen name="(tabs)" options={{ headerShown: false }} /> */}
          <Stack.Screen name="+not-found" />
        </Stack>
        <StatusBar style="auto" />
      </ClerkProvider>
    </>
  );
}
