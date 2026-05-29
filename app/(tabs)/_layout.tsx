import React, { useEffect } from 'react';
import { Tabs } from 'expo-router';
import { House, MessageSquare, Zap, Bell, Settings } from 'lucide-react-native';
import { Colors, FontSizes } from '../../constants/theme';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withTiming,
  Easing,
  interpolateColor,
} from 'react-native-reanimated';
import { View, StyleSheet } from 'react-native';

const GEMINI = ['#A855F7', '#3B82F6', '#10B981', '#EC4899', '#A855F7'];

function GeminiTabIcon({ Icon, focused, size }: { Icon: any; focused: boolean; size: number }) {
  const phase = useSharedValue(0);
  useEffect(() => {
    phase.value = withRepeat(withTiming(1, { duration: 4000, easing: Easing.linear }), -1, false);
  }, []);
  const dotStyle = useAnimatedStyle(() => ({
    backgroundColor: interpolateColor(phase.value, [0, 0.25, 0.5, 0.75, 1], GEMINI),
  }));
  const color = focused ? Colors.primary : Colors.textTertiary;
  return (
    <View style={tabStyles.wrap}>
      <Icon size={size} color={color} />
      {focused && <Animated.View style={[tabStyles.dot, dotStyle]} />}
    </View>
  );
}

const tabStyles = StyleSheet.create({
  wrap: { alignItems: 'center', justifyContent: 'center', gap: 3 },
  dot: { width: 4, height: 4, borderRadius: 2, marginTop: 1 },
});

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
        tabBarShowLabel: true,
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Home',
          tabBarIcon: ({ size, focused }) => <GeminiTabIcon Icon={House} focused={focused} size={size} />,
        }}
      />
      <Tabs.Screen
        name="chat"
        options={{
          title: 'Chat',
          tabBarIcon: ({ size, focused }) => <GeminiTabIcon Icon={MessageSquare} focused={focused} size={size} />,
        }}
      />
      <Tabs.Screen
        name="automation"
        options={{
          title: 'Automate',
          tabBarIcon: ({ size, focused }) => <GeminiTabIcon Icon={Zap} focused={focused} size={size} />,
        }}
      />
      <Tabs.Screen
        name="sensors"
        options={{
          title: 'Sensors',
          tabBarIcon: ({ size, focused }) => <GeminiTabIcon Icon={Bell} focused={focused} size={size} />,
        }}
      />
      <Tabs.Screen
        name="settings"
        options={{
          title: 'Settings',
          tabBarIcon: ({ size, focused }) => <GeminiTabIcon Icon={Settings} focused={focused} size={size} />,
        }}
      />
    </Tabs>
  );
}
