import React, { useEffect } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated';
import { Colors, Spacing, FontSizes, BorderRadius } from '../constants/theme';

interface StatusBadgeProps {
  label: string;
  color?: string;
  active?: boolean;
  pulse?: boolean;
}

export default function StatusBadge({
  label,
  color = Colors.primary,
  active = true,
  pulse = false,
}: StatusBadgeProps) {
  const dotScale = useSharedValue(1);
  const dotOpacity = useSharedValue(1);

  useEffect(() => {
    if (pulse && active) {
      dotScale.value = withRepeat(
        withSequence(
          withTiming(1.5, { duration: 600 }),
          withTiming(1, { duration: 600 }),
        ),
        -1,
        false,
      );
      dotOpacity.value = withRepeat(
        withSequence(
          withTiming(0.4, { duration: 600 }),
          withTiming(1, { duration: 600 }),
        ),
        -1,
        false,
      );
    } else {
      dotScale.value = withTiming(1, { duration: 200 });
      dotOpacity.value = withTiming(1, { duration: 200 });
    }
  }, [pulse, active]);

  const dotAnimStyle = useAnimatedStyle(() => ({
    transform: [{ scale: dotScale.value }],
    opacity: dotOpacity.value,
  }));

  return (
    <View style={[styles.badge, { borderColor: active ? color : Colors.border }]}>
      {active && (
        <Animated.View
          style={[styles.dot, { backgroundColor: color }, dotAnimStyle]}
        />
      )}
      <Text style={[styles.text, { color: active ? color : Colors.textTertiary }]}>
        {label}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.sm + 2,
    paddingVertical: Spacing.xs + 1,
    borderRadius: BorderRadius.full,
    borderWidth: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
    gap: Spacing.xs,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  text: {
    fontSize: FontSizes.xs,
    fontWeight: '600',
  },
});
