import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ViewStyle } from 'react-native';
import { Colors, Spacing, FontSizes, BorderRadius } from '../constants/theme';

interface FeatureCardProps {
  icon: React.ReactNode;
  title: string;
  description: string;
  onPress?: () => void;
  style?: ViewStyle;
  active?: boolean;
  badge?: string;
}

export default function FeatureCard({
  icon,
  title,
  description,
  onPress,
  style,
  active = false,
  badge,
}: FeatureCardProps) {
  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.7}
      style={[styles.card, active && styles.activeCard, style]}
    >
      {/* Badge chip — top right */}
      {badge ? (
        <View style={styles.badge}>
          <Text style={styles.badgeText}>{badge}</Text>
        </View>
      ) : null}

      <View style={[styles.iconContainer, active && styles.activeIcon]}>{icon}</View>

      <View style={styles.textContainer}>
        <Text style={[styles.title, active && styles.activeTitle]}>{title}</Text>
        <Text style={styles.description}>{description}</Text>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.lg,
    padding: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.border,
    gap: Spacing.md,
    // Badge positioning context
    position: 'relative',
  },
  activeCard: {
    borderColor: Colors.primary,
    backgroundColor: 'rgba(0, 229, 255, 0.08)',
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 6,
  },
  badge: {
    position: 'absolute',
    top: Spacing.sm,
    right: Spacing.sm,
    backgroundColor: Colors.primary,
    borderRadius: BorderRadius.full,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 2,
    zIndex: 1,
  },
  badgeText: {
    fontSize: FontSizes.xs,
    fontWeight: '700',
    color: Colors.background,
    letterSpacing: 0.3,
  },
  iconContainer: {
    width: 48,
    height: 48,
    borderRadius: BorderRadius.md,
    backgroundColor: Colors.backgroundTertiary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  activeIcon: {
    backgroundColor: 'rgba(0, 229, 255, 0.15)',
  },
  textContainer: {
    flex: 1,
  },
  title: {
    fontSize: FontSizes.md,
    fontWeight: '600',
    color: Colors.text,
    marginBottom: 2,
  },
  activeTitle: {
    color: Colors.primary,
  },
  description: {
    fontSize: FontSizes.sm,
    color: Colors.textTertiary,
    lineHeight: 18,
  },
});
