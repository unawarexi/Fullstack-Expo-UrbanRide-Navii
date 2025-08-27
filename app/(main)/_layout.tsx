import { Tabs } from "expo-router";
import * as LucideIcons from "lucide-react-native";
import React from "react";
import { Platform, StatusBar, View } from "react-native";

export default function ScreenLayout() {
  return (
    <View style={{ flex: 1 }}>
      <StatusBar backgroundColor="#0f172a" barStyle="light-content" translucent={false} />

      <Tabs
        initialRouteName="index"
        screenOptions={{
          headerShown: false,
          tabBarShowLabel: false,
          tabBarStyle: {
            backgroundColor: "#f8fafc",
            position: "absolute",
            bottom: 0,
            left: 0,
            right: 0,
            elevation: 8,
            shadowColor: "#000",
            shadowOffset: {
              width: 0,
              height: -4,
            },
            shadowOpacity: 0.1,
            shadowRadius: 8,
            borderTopWidth: 1,
            borderTopColor: "#e2e8f0",
            height: Platform.OS === "ios" ? 90 : 70,
            paddingBottom: Platform.OS === "ios" ? 30 : 15,
           paddingTop: 10,
            paddingHorizontal: 20,
          },
          tabBarActiveTintColor: "#ffffff",
          tabBarInactiveTintColor: "#64748b",
          tabBarItemStyle: {
            borderRadius: 16,
            marginHorizontal: 4,
            paddingVertical: 8,
          },
        }}
      >
        <Tabs.Screen
          name="index"
          options={{
            title: "Home",
            tabBarIcon: ({ size, color, focused }) => (
              <View
                style={{
                  width: 40,
                  height: 40,
                  backgroundColor: focused ? "#dbeafe" : "transparent",
                  borderRadius: 25,
                  borderWidth: focused ? 1 : 0,
                  borderColor: focused ? "#2563eb" : "transparent",
                  justifyContent: "center",
                  alignItems: "center",
                }}
              >
                <LucideIcons.Home size={24} color={focused ? "#2563eb" : "#64748b"} strokeWidth={focused ? 2 : 1.5} />
              </View>
            ),
          }}
        />
        <Tabs.Screen
          name="rides"
          options={{
            title: "Rides",
            tabBarIcon: ({ size, color, focused }) => (
              <View
                style={{
                  width: 40,
                  height: 40,
                  backgroundColor: focused ? "#dbeafe" : "transparent",
                  borderRadius: 25,
                  borderWidth: focused ? 1 : 0,
                  borderColor: focused ? "#2563eb" : "transparent",
                  justifyContent: "center",
                  alignItems: "center",
                }}
              >
                <LucideIcons.CarTaxiFront size={24} color={focused ? "#2563eb" : "#64748b"} strokeWidth={focused ? 2 : 1.5} />
              </View>
            ),
          }}
        />
        <Tabs.Screen
          name="chat"
          options={{
            title: "Chat",
            tabBarIcon: ({ size, color, focused }) => (
              <View
                style={{
                  width: 40,
                  height: 40,
                  backgroundColor: focused ? "#dbeafe" : "transparent",
                  borderRadius: 25,
                  borderWidth: focused ? 1 : 0,
                  borderColor: focused ? "#2563eb" : "transparent",
                  justifyContent: "center",
                  alignItems: "center",
                }}
              >
                <LucideIcons.MessagesSquare size={24} color={focused ? "#2563eb" : "#64748b"} strokeWidth={focused ? 2 : 1.5} />
              </View>
            ),
          }}
        />
        <Tabs.Screen
          name="profile"
          options={{
            title: "Profile",
            tabBarIcon: ({ size, color, focused }) => (
              <View
                style={{
                  width: 40,
                  height: 40,
                  backgroundColor: focused ? "#dbeafe" : "transparent",
                  borderRadius: 25,
                  borderWidth: focused ? 1 : 0,
                  borderColor: focused ? "#2563eb" : "transparent",
                  justifyContent: "center",
                  alignItems: "center",
                }}
              >
                <LucideIcons.UserCircle size={24} color={focused ? "#2563eb" : "#64748b"} strokeWidth={focused ? 2 : 1.5} />
              </View>
            ),
          }}
        />
      </Tabs>
    </View>
  );
}
