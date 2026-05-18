import React, { useEffect } from 'react';
import { View, StyleSheet } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withTiming,
  withSequence,
  Easing,
} from 'react-native-reanimated';
import { Colors } from '../constants/theme';

interface VoiceOrbProps {
  isListening: boolean;
  size?: number;
}

export default function VoiceOrb({ isListening, size = 180 }: VoiceOrbProps) {
  const scale = useSharedValue(1);
  const pulse1 = useSharedValue(0.8);
  const pulse2 = useSharedValue(0.6);
  const pulse3 = useSharedValue(0.4);
  const rotation = useSharedValue(0);

  useEffect(() => {
    if (isListening) {
      scale.value = withRepeat(withSequence(withTiming(1.15, { duration: 600 }), withTiming(1, { duration: 600 })), -1, false);
      pulse1.value = withRepeat(withTiming(1.4, { duration: 1500, easing: Easing.out(Easing.ease) }), -1, false);
      pulse2.value = withRepeat(withTiming(1.6, { duration: 1800, easing: Easing.out(Easing.ease) }), -1, false);
      pulse3.value = withRepeat(withTiming(1.8, { duration: 2100, easing: Easing.out(Easing.ease) }), -1, false);
      rotation.value = withRepeat(withTiming(360, { duration: 8000, easing: Easing.linear }), -1, false);
    } else {
      scale.value = withTiming(1, { duration: 300 });
      pulse1.value = withTiming(0.8, { duration: 500 });
      pulse2.value = withTiming(0.6, { duration: 500 });
      pulse3.value = withTiming(0.4, { duration: 500 });
      rotation.value = withTiming(0, { duration: 500 });
    }
  }, [isListening]);

  const orbStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const pulse1Style = useAnimatedStyle(() => ({
    transform: [{ scale: pulse1.value }],
    opacity: 0.3 - (pulse1.value - 0.8) * 0.3,
  }));

  const pulse2Style = useAnimatedStyle(() => ({
    transform: [{ scale: pulse2.value }],
    opacity: 0.2 - (pulse2.value - 0.6) * 0.15,
  }));

  const pulse3Style = useAnimatedStyle(() => ({
    transform: [{ scale: pulse3.value }],
    opacity: 0.15 - (pulse3.value - 0.4) * 0.1,
  }));

  const ringStyle = useAnimatedStyle(() => ({
    transform: [{ rotate: `${rotation.value}deg` }],
  }));

  return (
    <View style={[styles.container, { width: size * 2.2, height: size * 2.2 }]}>
      <Animated.View style={[styles.pulseRing, pulse3Style, { width: size * 2, height: size * 2, borderRadius: size }]} />
      <Animated.View style={[styles.pulseRing, pulse2Style, { width: size * 1.6, height: size * 1.6, borderRadius: size * 0.8 }]} />
      <Animated.View style={[styles.pulseRing, pulse1Style, { width: size * 1.3, height: size * 1.3, borderRadius: size * 0.65 }]} />
      <Animated.View style={[styles.orbContainer, orbStyle, { width: size, height: size, borderRadius: size / 2 }]}>
        <Animated.View style={[styles.rotatingRing, ringStyle, { width: size * 0.9, height: size * 0.9, borderRadius: size * 0.45 }]}>
          <View style={[styles.ringSegment, { top: 0, left: '50%', transform: [{ translateX: -2 }] }]} />
          <View style={[styles.ringSegment, { bottom: 0, left: '50%', transform: [{ translateX: -2 }] }]} />
          <View style={[styles.ringSegmentH, { left: 0, top: '50%', transform: [{ translateY: -2 }] }]} />
          <View style={[styles.ringSegmentH, { right: 0, top: '50%', transform: [{ translateY: -2 }] }]} />
        </Animated.View>
        <View style={[styles.innerOrb, { width: size * 0.55, height: size * 0.55, borderRadius: size * 0.275 }]}>
          <View style={[styles.core, { width: size * 0.25, height: size * 0.25, borderRadius: size * 0.125 }]} />
        </View>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  pulseRing: {
    position: 'absolute',
    borderWidth: 1,
    borderColor: Colors.primary,
    backgroundColor: 'transparent',
  },
  orbContainer: {
    backgroundColor: Colors.backgroundSecondary,
    borderWidth: 2,
    borderColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 30,
    elevation: 15,
  },
  rotatingRing: {
    position: 'absolute',
    borderWidth: 1,
    borderColor: 'rgba(0, 229, 255, 0.4)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  ringSegment: {
    position: 'absolute',
    width: 4,
    height: 12,
    backgroundColor: Colors.primary,
    borderRadius: 2,
  },
  ringSegmentH: {
    position: 'absolute',
    width: 12,
    height: 4,
    backgroundColor: Colors.primary,
    borderRadius: 2,
  },
  innerOrb: {
    backgroundColor: 'rgba(0, 229, 255, 0.15)',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 999,
  },
  core: {
    backgroundColor: Colors.primary,
    borderRadius: 999,
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 1,
    shadowRadius: 20,
    elevation: 10,
  },
});
