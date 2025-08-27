import { Stack } from "expo-router";

const Layout = () => {
  return (
    <Stack>
      <Stack.Screen name="find-ride" options={{ headerShown: false }} />
      <Stack.Screen name="confirm-ride" />
      <Stack.Screen name="book-ride" />
      <Stack.Screen name="search-ride" />
    </Stack>
  );
};

export default Layout;
