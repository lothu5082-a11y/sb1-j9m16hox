import React, { useMemo } from 'react';
import { View, ViewStyle } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withSequence,
  withTiming,
  withDelay,
} from 'react-native-reanimated';
import { Colors } from '../constants/theme';

const PARTICLE_COLORS = [
  Colors.primary,
  Colors.secondary,
  Colors.primaryLight,
  '#FFFFFF',
];

interface ParticleConfig {
  id: number;
  x: number;
  y: number;
  size: number;
  color: string;
  opacity: number;
  floatDuration: number;
  driftDuration: number;
  driftRange: number;
  delay: number;
}

function rng(min: number, max: number) {
  return min + Math.random() * (max - min);
}

function buildParticles(): ParticleConfig[] {
  return Array.from({ length: 12 }, (_, i) => ({
    id: i,
    x: rng(5, 375),
    y: rng(80, 820),
    size: rng(3, 6),
    color: PARTICLE_COLORS[Math.floor(rng(0, PARTICLE_COLORS.length))],
    opacity: rng(0.08, 0.25),
    floatDuration: rng(8000, 15000),
    driftDuration: rng(4000, 8000),
    driftRange: rng(10, 30),
    delay: rng(0, 5000),
  }));
}

interface ParticleProps {
  config: ParticleConfig;
}

function Particle({ config }: ParticleProps) {
  const translateY = useSharedValue(0);
  const translateX = useSharedValue(0);

  React.useEffect(() => {
    translateY.value = withDelay(
      config.delay,
      withRepeat(
        withSequence(
          withTiming(-300, { duration: config.floatDuration }),
          withTiming(0, { duration: 100 }),
        ),
        -1,
        false,
      ),
    );

    translateX.value = withDelay(
      config.delay,
      withRepeat(
        withSequence(
          withTiming(config.driftRange, { duration: config.driftDuration }),
          withTiming(-config.driftRange, { duration: config.driftDuration }),
        ),
        -1,
        false,
      ),
    );
  }, []);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [
      { translateY: translateY.value },
      { translateX: translateX.value },
    ],
  }));

  return (
    <Animated.View
      style={[
        {
          position: 'absolute',
          left: config.x,
          top: config.y,
          width: config.size,
          height: config.size,
          borderRadius: config.size / 2,
          backgroundColor: config.color,
          opacity: config.opacity,
        },
        animatedStyle,
      ]}
    />
  );
}

interface ParticleSystemProps {
  style?: ViewStyle;
}

export default function ParticleSystem({ style }: ParticleSystemProps) {
  const particles = useMemo(() => buildParticles(), []);

  return (
    <View
      style={[{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, overflow: 'hidden' }, style]}
      pointerEvents="none"
    >
      {particles.map((p) => (
        <Particle key={p.id} config={p} />
      ))}
    </View>
  );
}
