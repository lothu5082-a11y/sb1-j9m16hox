import React from 'react';
import { TouchableOpacity, Text, StyleSheet, ViewStyle, TextStyle, ActivityIndicator } from 'react-native';
import { Colors, BorderRadius, Spacing, FontSizes } from '../constants/theme';

interface GlowButtonProps {
  title: string;
  onPress: () => void;
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
  loading?: boolean;
  disabled?: boolean;
  style?: ViewStyle;
  textStyle?: TextStyle;
  icon?: React.ReactNode;
}

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
  const sizeStyles = {
    sm: { paddingVertical: Spacing.sm, paddingHorizontal: Spacing.md, fontSize: FontSizes.sm },
    md: { paddingVertical: Spacing.md, paddingHorizontal: Spacing.lg, fontSize: FontSizes.md },
    lg: { paddingVertical: Spacing.lg, paddingHorizontal: Spacing.xl, fontSize: FontSizes.lg },
  };

  const variantStyles = {
    primary: {
      container: {
        backgroundColor: Colors.primary,
        shadowColor: Colors.primary,
        shadowOffset: { width: 0, height: 0 },
        shadowOpacity: 0.6,
        shadowRadius: 16,
        elevation: 8,
      },
      text: { color: Colors.background, fontWeight: '700' as const },
    },
    secondary: {
      container: {
        backgroundColor: Colors.surface,
        borderWidth: 1,
        borderColor: Colors.primary,
        shadowColor: Colors.primary,
        shadowOffset: { width: 0, height: 0 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
        elevation: 4,
      },
      text: { color: Colors.primary, fontWeight: '600' as const },
    },
    outline: {
      container: {
        backgroundColor: 'transparent',
        borderWidth: 1,
        borderColor: Colors.border,
      },
      text: { color: Colors.textSecondary, fontWeight: '500' as const },
    },
    ghost: {
      container: { backgroundColor: 'transparent' },
      text: { color: Colors.textSecondary, fontWeight: '500' as const },
    },
  };

  const v = variantStyles[variant];
  const s = sizeStyles[size];

  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={disabled || loading}
      activeOpacity={0.7}
      style={[
        styles.base,
        v.container,
        { paddingVertical: s.paddingVertical, paddingHorizontal: s.paddingHorizontal },
        disabled && styles.disabled,
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator color={variant === 'primary' ? Colors.background : Colors.primary} size="small" />
      ) : (
        <>
          {icon}
          <Text style={[v.text, { fontSize: s.fontSize }, textStyle]}>{title}</Text>
        </>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  base: {
    borderRadius: BorderRadius.lg,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: Spacing.sm,
  },
  disabled: {
    opacity: 0.4,
  },
});
