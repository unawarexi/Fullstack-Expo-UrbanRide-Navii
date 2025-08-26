import { LucideIcons } from "@/constants/icons";
import { Tabs } from "expo-router";
import { LucideIcon } from "lucide-react-native";
import { Image, ImageSourcePropType, View } from "react-native";

// Accepts either PNG asset or Lucide component
type TabIconProps = {
  source: ImageSourcePropType | LucideIcon;
  focused: boolean;
};

const TabIcon = ({ source, focused }: TabIconProps) => {
  const isLucide = typeof source === "function";

  return (
    <View className={`flex flex-row justify-center items-center rounded-full ${focused ? "bg-general-300" : ""}`}>
      <View className={`rounded-full w-12 h-12 items-center justify-center ${focused ? "bg-general-400" : ""}`}>
        {isLucide ? (
          // Render Lucide component
          (() => {
            const IconComp = source as LucideIcon;
            return <IconComp size={28} color="white" />;
          })()
        ) : (
          // Render PNG asset
          <Image source={source as ImageSourcePropType} resizeMode="contain" className="w-7 h-7" style={{ tintColor: "white" }} />
        )}
      </View>
    </View>
  );
};

export default function Layout() {
  return (
    <Tabs
      initialRouteName="index"
      screenOptions={{
        tabBarActiveTintColor: "white",
        tabBarInactiveTintColor: "white",
        tabBarShowLabel: false,
        tabBarStyle: {
          backgroundColor: "#333333",
          borderRadius: 50,
          paddingBottom: 0,
          overflow: "hidden",
          marginHorizontal: 20,
          marginBottom: 20,
          height: 78,
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          flexDirection: "row",
          position: "absolute",
        },
      }}
    >
      <Tabs.Screen
        name="home"
        options={{
          title: "Home",
          headerShown: false,
          tabBarIcon: ({ focused }) => <TabIcon source={LucideIcons.home} focused={focused} />,
        }}
      />
      <Tabs.Screen
        name="rides"
        options={{
          title: "Rides",
          headerShown: false,
          tabBarIcon: ({ focused }) => <TabIcon source={LucideIcons.list} focused={focused} />,
        }}
      />
      <Tabs.Screen
        name="chat"
        options={{
          title: "Chat",
          headerShown: false,
          tabBarIcon: ({ focused }) => <TabIcon source={LucideIcons.chat} focused={focused} />,
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: "Profile",
          headerShown: false,
          tabBarIcon: ({ focused }) => <TabIcon source={LucideIcons.profile} focused={focused} />,
        }}
      />
    </Tabs>
  );
}
