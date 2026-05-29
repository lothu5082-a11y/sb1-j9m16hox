import React, { useEffect } from 'react';
import { View, StyleSheet, Dimensions } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withSequence,
  withTiming,
  Easing,
  interpolateColor,
} from 'react-native-reanimated';
import { Colors } from '../constants/theme';

const { width: W, height: H } = Dimensions.get('window');
const GRID_COLS = 8;
const GRID_ROWS = 14;
const CELL_W = W / GRID_COLS;
const CELL_H = H / GRID_ROWS;

interface AnimatedBackgroundProps {
  children?: React.ReactNode;
}

export default function AnimatedBackground({ children }: AnimatedBackgroundProps) {
  const glowOpacity      = useSharedValue(0.1);
  const orbOpacity       = useSharedValue(0.06);
  const scanY            = useSharedValue(0);
  const accentGlow       = useSharedValue(0.04);
  const orbColorPhase    = useSharedValue(0);
  const centerColorPhase = useSharedValue(0);
  const accentColorPhase = useSharedValue(0);
  const scanColorPhase   = useSharedValue(0);

  useEffect(() => {
    glowOpacity.value = withRepeat(
      withSequence(withTiming(0.28, { duration: 3200 }), withTiming(0.08, { duration: 3200 })),
      -1, false,
    );
    orbOpacity.value = withRepeat(
      withSequence(withTiming(0.16, { duration: 4500 }), withTiming(0.05, { duration: 4500 })),
      -1, false,
    );
    scanY.value = withRepeat(withTiming(1, { duration: 6000, easing: Easing.linear }), -1, false);
    accentGlow.value = withRepeat(
      withSequence(withTiming(0.1, { duration: 5000 }), withTiming(0.03, { duration: 5000 })),
      -1, false,
    );
    orbColorPhase.value    = withRepeat(withTiming(1, { duration: 7000, easing: Easing.linear }), -1, false);
    centerColorPhase.value = withRepeat(withTiming(1, { duration: 5500, easing: Easing.linear }), -1, false);
    accentColorPhase.value = withRepeat(withTiming(1, { duration: 9000, easing: Easing.linear }), -1, false);
    scanColorPhase.value   = withRepeat(withTiming(1, { duration: 6000, easing: Easing.linear }), -1, false);
  }, []);

  const orbStyle = useAnimatedStyle(() => ({
    opacity: orbOpacity.value,
    backgroundColor: interpolateColor(orbColorPhase.value,
      [0, 0.25, 0.5, 0.75, 1],
      ['#7C3AED', '#3B82F6', '#0891B2', '#A855F7', '#7C3AED'],
    ),
  }));

  const centerGlowStyle = useAnimatedStyle(() => ({
    opacity: glowOpacity.value,
    backgroundColor: interpolateColor(centerColorPhase.value,
      [0, 0.25, 0.5, 0.75, 1],
      ['#A855F7', '#EC4899', '#7C3AED', '#3B82F6', '#A855F7'],
    ),
  }));

  const accentStyle = useAnimatedStyle(() => ({
    opacity: accentGlow.value,
    backgroundColor: interpolateColor(accentColorPhase.value,
      [0, 0.25, 0.5, 0.75, 1],
      ['#10B981', '#0891B2', '#A855F7', '#EC4899', '#10B981'],
    ),
  }));

  const scanStyle = useAnimatedStyle(() => ({
    top: `${scanY.value * 100}%` as any,
    backgroundColor: interpolateColor(scanColorPhase.value,
      [0, 0.25, 0.5, 0.75, 1],
      ['rgba(168,85,247,0.18)', 'rgba(59,130,246,0.18)', 'rgba(16,185,129,0.15)', 'rgba(236,72,153,0.15)', 'rgba(168,85,247,0.18)'],
    ),
  }));

  return (
    <View style={styles.container}>
      {/* Base gradient */}
      <LinearGradient
        colors={[Colors.background, Colors.backgroundSecondary, Colors.backgroundTertiary]}
        locations={[0, 0.55, 1]}
        style={StyleSheet.absoluteFill}
      />

      {/* Grid lines */}
      <View style={[StyleSheet.absoluteFill, styles.grid]} pointerEvents="none">
        {Array.from({ length: GRID_COLS + 1 }).map((_, i) => (
          <View key={`v${i}`} style={[styles.gridLineV, { left: i * CELL_W }]} />
        ))}
        {Array.from({ length: GRID_ROWS + 1 }).map((_, i) => (
          <View key={`h${i}`} style={[styles.gridLineH, { top: i * CELL_H }]} />
        ))}
      </View>

      {/* Color-cycling scan line */}
      <Animated.View style={[styles.scanLine, scanStyle]} pointerEvents="none" />

      {/* Top-center orb — color-morphing purple→blue→cyan→violet */}
      <Animated.View
        style={[
          styles.orb,
          { width: W * 0.7, height: W * 0.7, borderRadius: W * 0.35, left: W * 0.15, top: -W * 0.25 },
          orbStyle,
        ]}
        pointerEvents="none"
      />

      {/* Center pulse glow — color-morphing purple→pink→violet→blue */}
      <Animated.View
        style={[
          styles.centerGlow,
          { width: W * 0.85, height: W * 0.85, borderRadius: W * 0.425, left: W * 0.075 },
          centerGlowStyle,
        ]}
        pointerEvents="none"
      />

      {/* Bottom-right accent orb — color-morphing emerald→cyan→purple→pink */}
      <Animated.View
        style={[
          styles.accentOrb,
          { width: W * 0.5, height: W * 0.5, borderRadius: W * 0.25, right: -W * 0.15, bottom: H * 0.1 },
          accentStyle,
        ]}
        pointerEvents="none"
      />

      {/* HUD corner decorations */}
      <View style={[styles.hudCorner, styles.hudTL]} pointerEvents="none" />
      <View style={[styles.hudCorner, styles.hudTR]} pointerEvents="none" />

      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  grid: {
    overflow: 'hidden',
  },
  gridLineV: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    width: 1,
    backgroundColor: 'rgba(168,85,247,0.04)',
  },
  gridLineH: {
    position: 'absolute',
    left: 0,
    right: 0,
    height: 1,
    backgroundColor: 'rgba(168,85,247,0.04)',
  },
  scanLine: {
    position: 'absolute',
    left: 0,
    right: 0,
    height: 1.5,
    shadowColor: Colors.primary,
    shadowOpacity: 0.4,
    shadowRadius: 6,
  },
  orb: {
    position: 'absolute',
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 1,
    shadowRadius: 60,
    elevation: 0,
  },
  centerGlow: {
    position: 'absolute',
    top: '28%',
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 1,
    shadowRadius: 80,
    elevation: 0,
  },
  accentOrb: {
    position: 'absolute',
    shadowColor: Colors.secondary,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 1,
    shadowRadius: 60,
    elevation: 0,
  },
  hudCorner: {
    position: 'absolute',
    width: 24,
    height: 24,
    borderColor: 'rgba(168,85,247,0.2)',
  },
  hudTL: { top: 6, left: 6, borderTopWidth: 1.5, borderLeftWidth: 1.5 },
  hudTR: { top: 6, right: 6, borderTopWidth: 1.5, borderRightWidth: 1.5 },
});
