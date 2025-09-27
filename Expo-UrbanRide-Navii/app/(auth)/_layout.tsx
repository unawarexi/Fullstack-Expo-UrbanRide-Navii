import { Stack } from "expo-router";

const Layout = () => {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="onboarding" />
      <Stack.Screen name="sign-up" />
      <Stack.Screen name="sign-in" />
      <Stack.Screen name="options" />
      <Stack.Screen name="otp" />
      <Stack.Screen name="(forms)" />
    </Stack>
  );
};

export default Layout;
