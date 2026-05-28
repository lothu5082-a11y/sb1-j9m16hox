import React from 'react';
import {
  TouchableOpacity,
  Text,
  StyleSheet,
  ViewStyle,
  TextStyle,
  ActivityIndicator,
  View,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Colors, BorderRadius, Spacing, FontSizes } from '../constants/theme';

interface GlowButtonProps {
  title: string;
  onPress: () => void;
  variant?: 'primary' | 'secondary' | 'danger' | 'outline' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
  loading?: boolean;
  disabled?: boolean;
  style?: ViewStyle;
  textStyle?: TextStyle;
  icon?: React.ReactNode;
}

const sizeMap = {
  sm: { paddingVertical: Spacing.sm, paddingHorizontal: Spacing.md, fontSize: FontSizes.sm },
  md: { paddingVertical: Spacing.md, paddingHorizontal: Spacing.lg, fontSize: FontSizes.md },
  lg: { paddingVertical: Spacing.lg, paddingHorizontal: Spacing.xl, fontSize: FontSizes.lg },
};

export default function GlowButton({
  title,
  onPress,
  variant = 'primary',
  size = 'md',
  loading = false,
  disabled = false,
  style,
  textStyle,
  icon,
}: GlowButtonProps) {
  const s = sizeMap[size];
  const isGradient = variant === 'primary' || variant === 'danger';

  const gradientColors: readonly [string, string] =
    variant === 'danger'
      ? [Colors.error, Colors.accent]
      : [Colors.primaryLight, Colors.primaryDark];

  const glowShadow =
    variant === 'primary'
      ? {
          shadowColor: Colors.primary,
          shadowOffset: { width: 0, height: 0 },
          shadowOpacity: 0.55,
          shadowRadius: 16,
          elevation: 8,
        }
      : variant === 'danger'
      ? {
          shadowColor: Colors.error,
          shadowOffset: { width: 0, height: 0 },
          shadowOpacity: 0.5,
          shadowRadius: 12,
          elevation: 6,
        }
      : {};

  const containerStyle: ViewStyle = {
    borderRadius: BorderRadius.lg,
    overflow: isGradient ? 'hidden' : undefined,
    ...glowShadow,
  };

  const flatStyle: ViewStyle =
    variant === 'secondary'
      ? {
          backgroundColor: Colors.surface,
          borderWidth: 1,
          borderColor: Colors.primary,
          shadowColor: Colors.primary,
          shadowOffset: { width: 0, height: 0 },
          shadowOpacity: 0.3,
          shadowRadius: 8,
          elevation: 4,
        }
      : variant === 'outline'
      ? {
          backgroundColor: 'transparent',
          borderWidth: 1,
          borderColor: Colors.border,
        }
      : variant === 'ghost'
      ? { backgroundColor: 'transparent' }
      : {};

  const textColor =
    variant === 'primary' || variant === 'danger'
      ? Colors.background
      : variant === 'secondary'
      ? Colors.primary
      : Colors.textSecondary;

  const textWeight =
    variant === 'primary' || variant === 'danger'
      ? ('700' as const)
      : variant === 'secondary'
      ? ('600' as const)
      : ('500' as const);

  const innerContent = (
    <>
      {loading ? (
        <ActivityIndicator
          color={variant === 'primary' || variant === 'danger' ? Colors.background : Colors.primary}
          size="small"
        />
      ) : (
        <>
          {icon}
          <Text style={[styles.text, { fontSize: s.fontSize, color: textColor, fontWeight: textWeight }, textStyle]}>
            {title}
          </Text>
        </>
      )}
    </>
  );

  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={disabled || loading}
      activeOpacity={0.75}
      style={[containerStyle, !isGradient && flatStyle, !isGradient && styles.flatPadding, { paddingVertical: isGradient ? 0 : s.paddingVertical }, disabled && styles.disabled, style]}
    >
      {isGradient ? (
        <LinearGradient
          colors={gradientColors}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={[styles.gradient, { paddingVertical: s.paddingVertical, paddingHorizontal: s.paddingHorizontal }]}
        >
          {innerContent}
        </LinearGradient>
      ) : (
        <View style={[styles.inner, { paddingVertical: s.paddingVertical, paddingHorizontal: s.paddingHorizontal }]}>
          {innerContent}
        </View>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  gradient: {
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: Spacing.sm,
  },
  inner: {
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: Spacing.sm,
  },
  flatPadding: {
    borderRadius: BorderRadius.lg,
  },
  text: {
    letterSpacing: 0.3,
  },
  disabled: {
    opacity: 0.4,
  },
});
