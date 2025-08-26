
import { useAuth } from "@clerk/clerk-expo";
import { Redirect } from "expo-router";
import { useEffect, useState } from "react";

const Page = () => {
  const { isSignedIn, isLoaded } = useAuth();
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    // Wait for auth to be loaded before making navigation decisions
    if (isLoaded) {
      setIsReady(true);
    }
  }, [isLoaded]);

  // Show loading/blank screen while auth is loading
  if (!isReady) {
    return null; // or a loading component
  }

  // If user is signed in, go directly to home
  if (isSignedIn) {
    return <Redirect href="/(tabs)/home" />;
  }

  // If not signed in, go to onboarding
  return <Redirect href="/(auth)/onboarding" />;
};

export default Page;
