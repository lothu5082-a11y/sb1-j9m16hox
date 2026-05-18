import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Colors, Spacing, FontSizes, BorderRadius } from '../constants/theme';

interface StatusBadgeProps {
  label: string;
  color?: string;
  active?: boolean;
}

export default function StatusBadge({ label, color = Colors.primary, active = true }: StatusBadgeProps) {
  return (
    <View style={[styles.badge, { borderColor: active ? color : Colors.border }]}>
      {active && <View style={[styles.dot, { backgroundColor: color }]} />}
      <Text style={[styles.text, { color: active ? color : Colors.textTertiary }]}>{label}</Text>
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
