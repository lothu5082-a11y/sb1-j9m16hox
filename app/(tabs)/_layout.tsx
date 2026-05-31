import React, { useEffect, Component } from 'react';
import { Tabs } from 'expo-router';
import { Sparkles, MessageSquare, Zap, Activity, Settings } from 'lucide-react-native';
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

const GLOW_COLORS = ['#A855F7', '#3B82F6', '#A855F7', '#C084FC', '#A855F7'] as const;

function VexsoraTabIcon({ Icon, focused, size }: { Icon: any; focused: boolean; size: number }) {
  const phase = useSharedValue(0);

  useEffect(() => {
    if (focused) {
      phase.value = withRepeat(
        withTiming(1, { duration: 3500, easing: Easing.linear }),
        -1,
        false
      );
    }
  }, [focused]);

  const dotStyle = useAnimatedStyle(() => ({
    backgroundColor: interpolateColor(phase.value, [0, 0.25, 0.5, 0.75, 1], [...GLOW_COLORS]),
    shadowColor: interpolateColor(phase.value, [0, 0.5, 1], ['#A855F7', '#3B82F6', '#A855F7']),
    shadowOpacity: focused ? 0.8 : 0,
    shadowRadius: focused ? 4 : 0,
  }));

  const color = focused ? Colors.primary : Colors.textMuted;

  return (
    <View style={styles.wrap}>
      <Icon size={size} color={color} strokeWidth={focused ? 2 : 1.5} />
      {focused && <Animated.View style={[styles.dot, dotStyle]} />}
    </View>
  );
}

// Error boundary so a reanimated JS crash falls back to a plain icon rather
// than crashing the entire app.
class SafeTabIcon extends Component<
  { Icon: any; focused: boolean; size: number },
  { error: boolean }
> {
  state = { error: false };
  static getDerivedStateFromError() { return { error: true }; }
  render() {
    if (this.state.error) {
      const { Icon, focused, size } = this.props;
      return (
        <View style={styles.wrap}>
          <Icon
            size={size}
            color={focused ? Colors.primary : Colors.textMuted}
            strokeWidth={focused ? 2 : 1.5}
          />
        </View>
      );
    }
    return <VexsoraTabIcon {...this.props} />;
  }
}

const styles = StyleSheet.create({
  wrap: { alignItems: 'center', justifyContent: 'center', gap: 2 },
  dot: {
    width: 4,
    height: 4,
    borderRadius: 2,
    marginTop: 1,
    elevation: 4,
  },
});

export default function TabLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          backgroundColor: Colors.backgroundSecondary,
          borderTopColor: Colors.border,
          borderTopWidth: StyleSheet.hairlineWidth,
          height: 68,
          paddingBottom: 10,
          paddingTop: 8,
        },
        tabBarActiveTintColor: Colors.primary,
        tabBarInactiveTintColor: Colors.textMuted,
        tabBarLabelStyle: {
          fontSize: FontSizes.xs,
          fontWeight: '600',
          letterSpacing: 0.3,
        },
        tabBarShowLabel: true,
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Vexsora',
          tabBarIcon: ({ size, focused }) => (
            <SafeTabIcon Icon={Sparkles} focused={focused} size={size} />
          ),
        }}
      />
      <Tabs.Screen
        name="chat"
        options={{
          title: 'Chat',
          tabBarIcon: ({ size, focused }) => (
            <SafeTabIcon Icon={MessageSquare} focused={focused} size={size} />
          ),
        }}
      />
      <Tabs.Screen
        name="automation"
        options={{
          title: 'Automate',
          tabBarIcon: ({ size, focused }) => (
            <SafeTabIcon Icon={Zap} focused={focused} size={size} />
          ),
        }}
      />
      <Tabs.Screen
        name="sensors"
        options={{
          title: 'Hardware',
          tabBarIcon: ({ size, focused }) => (
            <SafeTabIcon Icon={Activity} focused={focused} size={size} />
          ),
        }}
      />
      <Tabs.Screen
        name="settings"
        options={{
          title: 'Settings',
          tabBarIcon: ({ size, focused }) => (
            <SafeTabIcon Icon={Settings} focused={focused} size={size} />
          ),
        }}
      />
    </Tabs>
  );
}
