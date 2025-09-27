import { useAuth } from "@clerk/clerk-expo";
import { Redirect } from "expo-router";

const Page = () => {
  const { isSignedIn } = useAuth();

  if (isSignedIn) return <Redirect href="/(main)" />;

  return <Redirect href="/(auth)/onboarding" />;
};

export default Page;

// import { useAuth } from "@clerk/clerk-expo";
// import { Redirect, useRouter } from "expo-router";
// import { useEffect, useState } from "react";
// import { ActivityIndicator, Text, View } from "react-native";
// import Animated, { FadeInUp } from "react-native-reanimated";

// const Page = () => {
//   const { isSignedIn, isLoaded, signOut } = useAuth();
//   const [isReady, setIsReady] = useState(false);
//   const [timeoutReached, setTimeoutReached] = useState(false);
//   const [showWarning, setShowWarning] = useState(false);
//   const [forcedSignOut, setForcedSignOut] = useState(false);
//   const router = useRouter();

//   useEffect(() => {
//     let timer: ReturnType<typeof setTimeout>;
//     let warningTimer: ReturnType<typeof setTimeout>;

//     if (!isLoaded) {
//       // Warning after 55s
//       warningTimer = setTimeout(() => {
//         setShowWarning(true);
//       }, 55000);

//       // Timeout after 60s
//       timer = setTimeout(async () => {
//         setTimeoutReached(true);
//         setForcedSignOut(true);
//         await signOut();
//         router.replace("/(auth)/sign-in");
//       }, 60000);
//     }

//     if (isLoaded) {
//       setIsReady(true);
//     }

//     return () => {
//       clearTimeout(timer);
//       clearTimeout(warningTimer);
//     };
//   }, [isLoaded]);

//   // Show loading screen
//   if (!isReady && !timeoutReached) {
//     return (
//       <View className="flex-1 items-center justify-center bg-gray-50">
//         <ActivityIndicator size="large" color="#3B82F6" />
//         <Text className="text-gray-500 mt-4 text-lg font-semibold">Loading...</Text>

//         {showWarning && (
//           <Animated.View entering={FadeInUp.duration(800)} className="mt-6 px-6">
//             <Text className="text-red-500 text-center text-base font-medium">App is taking too long, please try again.</Text>
//           </Animated.View>
//         )}
//       </View>
//     );
//   }

//   if (isSignedIn) {
//     return <Redirect href="/(main)" />;
//   }
//   if (forcedSignOut) {
//     return <Redirect href="/(auth)/sign-in" />;
//   }
//   return <Redirect href="/(auth)/onboarding" />;
// };

// export default Page;
