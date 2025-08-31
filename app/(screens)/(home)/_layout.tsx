import { Stack } from "expo-router";

const Layout = () => {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="history"  />
      <Stack.Screen name="history-ride-details"  />
      <Stack.Screen name="search-input-field" />
      <Stack.Screen name="map-results" />
    </Stack>
  );
};

export default Layout;
