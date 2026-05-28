import React from 'react';
import { Tabs } from 'expo-router';
import { House, MessageSquare, Zap, Bell, Settings } from 'lucide-react-native';
import { Colors, FontSizes } from '../../constants/theme';

export default function TabLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          backgroundColor: Colors.backgroundSecondary,
          borderTopColor: Colors.border,
          borderTopWidth: 1,
          height: 70,
          paddingBottom: 12,
          paddingTop: 8,
        },
        tabBarActiveTintColor: Colors.primary,
        tabBarInactiveTintColor: Colors.textTertiary,
        tabBarLabelStyle: {
          fontSize: FontSizes.xs,
          fontWeight: '600',
        },
        tabBarActiveBackgroundColor: 'transparent',
        tabBarItemStyle: {
          borderTopWidth: 2,
          borderTopColor: 'transparent',
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Home',
          tabBarIcon: ({ size, color }) => <House size={size} color={color} />,
          tabBarItemStyle: {
            borderTopWidth: 2,
            borderTopColor: Colors.primary,
          } as any,
        }}
      />
      <Tabs.Screen
        name="chat"
        options={{
          title: 'Command',
          tabBarIcon: ({ size, color }) => <MessageSquare size={size} color={color} />,
        }}
      />
      <Tabs.Screen
        name="automation"
        options={{
          title: 'Automate',
          tabBarIcon: ({ size, color }) => <Zap size={size} color={color} />,
        }}
      />
      <Tabs.Screen
        name="sensors"
        options={{
          title: 'Sensors',
          tabBarIcon: ({ size, color }) => <Bell size={size} color={color} />,
        }}
      />
      <Tabs.Screen
        name="settings"
        options={{
          title: 'Settings',
          tabBarIcon: ({ size, color }) => <Settings size={size} color={color} />,
        }}
      />
    </Tabs>
  );
}
