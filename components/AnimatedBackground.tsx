import React, { useEffect } from 'react';
import { View, StyleSheet, Dimensions } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated';
import { Colors } from '../constants/theme';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const ORB_SIZE = SCREEN_WIDTH * 0.7;

interface AnimatedBackgroundProps {
  children?: React.ReactNode;
}

export default function AnimatedBackground({ children }: AnimatedBackgroundProps) {
  const glowOpacity = useSharedValue(0.1);
  const orbOpacity = useSharedValue(0.06);

  useEffect(() => {
    glowOpacity.value = withRepeat(
      withSequence(
        withTiming(0.3, { duration: 3000 }),
        withTiming(0.1, { duration: 3000 }),
      ),
      -1,
      false,
    );

    orbOpacity.value = withRepeat(
      withSequence(
        withTiming(0.18, { duration: 4000 }),
        withTiming(0.06, { duration: 4000 }),
      ),
      -1,
      false,
    );
  }, []);

  const glowStyle = useAnimatedStyle(() => ({
    opacity: glowOpacity.value,
  }));

  const orbStyle = useAnimatedStyle(() => ({
    opacity: orbOpacity.value,
  }));

  return (
    <View style={styles.container}>
      {/* Base gradient */}
      <LinearGradient
        colors={[Colors.background, Colors.backgroundSecondary, Colors.backgroundTertiary]}
        locations={[0, 0.55, 1]}
        style={StyleSheet.absoluteFill}
      />

      {/* Top-center orb glow */}
      <Animated.View
        style={[
          styles.orb,
          {
            width: ORB_SIZE,
            height: ORB_SIZE,
            borderRadius: ORB_SIZE / 2,
            left: (SCREEN_WIDTH - ORB_SIZE) / 2,
            top: -ORB_SIZE * 0.35,
          },
          orbStyle,
        ]}
      />

      {/* Center pulse glow */}
      <Animated.View
        style={[
          styles.centerGlow,
          {
            width: SCREEN_WIDTH * 0.9,
            height: SCREEN_WIDTH * 0.9,
            borderRadius: (SCREEN_WIDTH * 0.9) / 2,
            left: SCREEN_WIDTH * 0.05,
          },
          glowStyle,
        ]}
      />

      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  orb: {
    position: 'absolute',
    backgroundColor: Colors.primary,
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 1,
    shadowRadius: 60,
    elevation: 0,
  },
  centerGlow: {
    position: 'absolute',
    top: '30%',
    backgroundColor: Colors.primary,
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 1,
    shadowRadius: 80,
    elevation: 0,
  },
});
