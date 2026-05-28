import React, { useEffect } from 'react';
import { View, Text, StyleSheet, ViewStyle } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated';
import { Colors, Spacing, FontSizes, BorderRadius } from '../constants/theme';

interface AIStatusBarProps {
  provider: string;
  isOnline: boolean;
  style?: ViewStyle;
}

export default function AIStatusBar({ provider, isOnline, style }: AIStatusBarProps) {
  const dotScale = useSharedValue(1);
  const dotOpacity = useSharedValue(1);

  useEffect(() => {
    if (isOnline) {
      dotScale.value = withRepeat(
        withSequence(
          withTiming(1.4, { duration: 700 }),
          withTiming(1, { duration: 700 }),
        ),
        -1,
        false,
      );
      dotOpacity.value = withRepeat(
        withSequence(
          withTiming(0.5, { duration: 700 }),
          withTiming(1, { duration: 700 }),
        ),
        -1,
        false,
      );
    } else {
      dotScale.value = withTiming(1, { duration: 300 });
      dotOpacity.value = withTiming(1, { duration: 300 });
    }
  }, [isOnline]);

  const dotAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: dotScale.value }],
    opacity: dotOpacity.value,
  }));

  const dotColor = isOnline ? Colors.success : Colors.textTertiary;
  const statusLabel = isOnline ? 'Online' : 'Offline';

  return (
    <View style={[styles.container, style]}>
      {/* Pulse dot */}
      <Animated.View
        style={[
          styles.dot,
          { backgroundColor: dotColor },
          dotAnimatedStyle,
        ]}
      />

      {/* Provider name */}
      <Text style={styles.provider} numberOfLines={1}>
        {provider}
      </Text>

      {/* Status badge */}
      <View
        style={[
          styles.badge,
          { borderColor: isOnline ? Colors.success : Colors.border },
        ]}
      >
        <Text
          style={[
            styles.badgeText,
            { color: isOnline ? Colors.success : Colors.textTertiary },
          ]}
        >
          {statusLabel}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 40,
    gap: Spacing.sm,
    paddingHorizontal: Spacing.sm,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  provider: {
    flex: 1,
    fontSize: FontSizes.sm,
    fontWeight: '600',
    color: Colors.text,
  },
  badge: {
    borderWidth: 1,
    borderRadius: BorderRadius.full,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 2,
  },
  badgeText: {
    fontSize: FontSizes.xs,
    fontWeight: '600',
  },
});
