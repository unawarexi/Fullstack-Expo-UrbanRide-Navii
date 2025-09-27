import { Stack } from "expo-router";

const Layout = () => {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="admin-form" />
      <Stack.Screen name="driver-form" />
    </Stack>
  );
};

export default Layout;
