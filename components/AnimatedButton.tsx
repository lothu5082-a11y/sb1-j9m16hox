import React from 'react';
import { Pressable, StyleProp, ViewStyle } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withSpring,
} from 'react-native-reanimated';

interface AnimatedButtonProps {
  onPress?: () => void;
  onLongPress?: () => void;
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  scaleDown?: number;
  disabled?: boolean;
}

export default function AnimatedButton({
  onPress,
  onLongPress,
  children,
  style,
  scaleDown = 0.94,
  disabled = false,
}: AnimatedButtonProps) {
  const scale = useSharedValue(1);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  return (
    <Animated.View style={[animatedStyle, style]}>
      <Pressable
        onPressIn={() => {
          if (!disabled) scale.value = withTiming(scaleDown, { duration: 80 });
        }}
        onPressOut={() => {
          scale.value = withSpring(1, { damping: 12, stiffness: 180 });
        }}
        onPress={disabled ? undefined : onPress}
        onLongPress={disabled ? undefined : onLongPress}
      >
        {children}
      </Pressable>
    </Animated.View>
  );
}
