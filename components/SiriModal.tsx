import React, { useEffect } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, Dimensions, Platform,
} from 'react-native';
import Animated, {
  useSharedValue, useAnimatedStyle, withRepeat, withSequence,
  withTiming, withSpring, Easing, interpolate,
} from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import { X, Mic } from 'lucide-react-native';
import { Colors, FontSizes, Spacing } from '../constants/theme';

const { width: W, height: H } = Dimensions.get('window');
const BAR_COUNT = 26;

// Single animated waveform bar
function WaveBar({ index, isActive }: { index: number; isActive: boolean }) {
  const h = useSharedValue(3);

  useEffect(() => {
    if (isActive) {
      const minH = 4 + (index % 3) * 3;
      const maxH = 18 + ((index * 7 + 13) % 28);
      const dur = 280 + (index * 37) % 320;
      setTimeout(() => {
        h.value = withRepeat(
          withSequence(
            withTiming(maxH, { duration: dur, easing: Easing.inOut(Easing.sin) }),
            withTiming(minH, { duration: dur, easing: Easing.inOut(Easing.sin) }),
          ),
          -1, false,
        );
      }, index * 45);
    } else {
      h.value = withTiming(3, { duration: 350 });
    }
  }, [isActive]);

  const style = useAnimatedStyle(() => ({ height: h.value }));

  // Gradient colour sweep: purple → indigo → cyan → emerald
  const t = index / (BAR_COUNT - 1);
  let color: string;
  if (t < 0.33) color = `rgba(168,85,247,${0.6 + t * 1.2})`;
  else if (t < 0.66) color = `rgba(99,102,241,${0.8 + (t - 0.33)})`;
  else color = `rgba(16,185,129,${0.7 + (t - 0.66) * 0.8})`;

  return (
    <Animated.View
      style={[styles.bar, style, { backgroundColor: color, shadowColor: color }]}
    />
  );
}

interface SiriModalProps {
  visible: boolean;
  isListening: boolean;
  transcript: string;
  onClose: () => void;
}

export default function SiriModal({ visible, isListening, transcript, onClose }: SiriModalProps) {
  const panelY    = useSharedValue(H);
  const backdrop  = useSharedValue(0);
  const orbScale  = useSharedValue(1);
  const orbGlow   = useSharedValue(0.35);
  const ring1     = useSharedValue(1);
  const ring2     = useSharedValue(1);
  const ring3     = useSharedValue(1);
  const scanPos   = useSharedValue(0);
  const borderGlow = useSharedValue(0.3);

  // Mount / unmount animation
  useEffect(() => {
    if (visible) {
      panelY.value   = withSpring(0, { damping: 22, stiffness: 220 });
      backdrop.value = withTiming(1, { duration: 280 });
    } else {
      panelY.value   = withTiming(H, { duration: 300, easing: Easing.in(Easing.quad) });
      backdrop.value = withTiming(0, { duration: 230 });
    }
  }, [visible]);

  // Active / idle animation
  useEffect(() => {
    if (isListening) {
      orbScale.value  = withRepeat(withSequence(withTiming(1.13, { duration: 650 }), withTiming(1, { duration: 650 })), -1, false);
      orbGlow.value   = withRepeat(withSequence(withTiming(1, { duration: 800 }), withTiming(0.4, { duration: 800 })), -1, false);
      ring1.value     = withRepeat(withTiming(1.55, { duration: 1100, easing: Easing.out(Easing.quad) }), -1, false);
      ring2.value     = withRepeat(withTiming(1.85, { duration: 1500, easing: Easing.out(Easing.quad) }), -1, false);
      ring3.value     = withRepeat(withTiming(2.15, { duration: 1900, easing: Easing.out(Easing.quad) }), -1, false);
      scanPos.value   = withRepeat(withTiming(1, { duration: 2200, easing: Easing.linear }), -1, false);
      borderGlow.value = withRepeat(withSequence(withTiming(0.9, { duration: 900 }), withTiming(0.3, { duration: 900 })), -1, false);
    } else {
      orbScale.value  = withTiming(1, { duration: 350 });
      orbGlow.value   = withTiming(0.3, { duration: 350 });
      ring1.value     = withTiming(1, { duration: 400 });
      ring2.value     = withTiming(1, { duration: 400 });
      ring3.value     = withTiming(1, { duration: 400 });
      borderGlow.value = withTiming(0.3, { duration: 350 });
    }
  }, [isListening]);

  const backdropStyle  = useAnimatedStyle(() => ({ opacity: backdrop.value }));
  const panelStyle     = useAnimatedStyle(() => ({ transform: [{ translateY: panelY.value }] }));
  const orbStyle       = useAnimatedStyle(() => ({ transform: [{ scale: orbScale.value }] }));
  const ring1Style     = useAnimatedStyle(() => ({
    transform: [{ scale: ring1.value }],
    opacity: interpolate(ring1.value, [1, 1.55], [0.55, 0]),
  }));
  const ring2Style     = useAnimatedStyle(() => ({
    transform: [{ scale: ring2.value }],
    opacity: interpolate(ring2.value, [1, 1.85], [0.35, 0]),
  }));
  const ring3Style     = useAnimatedStyle(() => ({
    transform: [{ scale: ring3.value }],
    opacity: interpolate(ring3.value, [1, 2.15], [0.2, 0]),
  }));
  const scanStyle      = useAnimatedStyle(() => ({ top: `${scanPos.value * 100}%` as any }));
  const borderStyle    = useAnimatedStyle(() => ({ borderColor: `rgba(168,85,247,${borderGlow.value})` }));

  if (!visible) return null;

  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="box-none">
      {/* Blurred overlay */}
      <Animated.View style={[StyleSheet.absoluteFill, styles.backdrop, backdropStyle]}>
        <TouchableOpacity style={StyleSheet.absoluteFill} onPress={onClose} activeOpacity={1} />
      </Animated.View>

      {/* Bottom sheet panel */}
      <Animated.View style={[styles.panelWrap, panelStyle]}>
        <Animated.View style={[styles.panel, borderStyle]}>
          <LinearGradient
            colors={['rgba(18,18,28,0.98)', 'rgba(10,10,18,1)']}
            style={StyleSheet.absoluteFill}
          />

          {/* Scan line */}
          {isListening && (
            <Animated.View style={[styles.scanLine, scanStyle]} pointerEvents="none" />
          )}

          {/* HUD corner brackets */}
          <View style={[styles.corner, styles.cTL]} />
          <View style={[styles.corner, styles.cTR]} />
          <View style={[styles.corner, styles.cBL]} />
          <View style={[styles.corner, styles.cBR]} />

          {/* Drag handle */}
          <View style={styles.handle} />

          {/* Status chip */}
          <View style={[styles.statusChip, isListening && styles.statusChipActive]}>
            <View style={[styles.statusDot, isListening && styles.statusDotActive]} />
            <Text style={[styles.statusText, isListening && styles.statusTextActive]}>
              {isListening ? 'LISTENING' : 'STANDBY'}
            </Text>
          </View>

          {/* Orb */}
          <View style={styles.orbArea}>
            <Animated.View style={[styles.ring, ring3Style]} />
            <Animated.View style={[styles.ring, ring2Style]} />
            <Animated.View style={[styles.ring, ring1Style]} />
            <Animated.View style={orbStyle}>
              <LinearGradient
                colors={isListening
                  ? ['#C084FC', '#A855F7', '#7C3AED', '#4F46E5']
                  : ['#2A2A3A', '#1E1E2E', '#18181F']}
                style={styles.orb}
              >
                <Mic color={isListening ? '#fff' : Colors.textTertiary} size={30} />
              </LinearGradient>
            </Animated.View>
          </View>

          {/* Waveform bars */}
          <View style={styles.waveRow}>
            {Array.from({ length: BAR_COUNT }).map((_, i) => (
              <WaveBar key={i} index={i} isActive={isListening} />
            ))}
          </View>

          {/* Transcript */}
          <View style={styles.transcriptBox}>
            <Text style={[styles.transcriptText, !transcript && styles.transcriptPlaceholder]} numberOfLines={3}>
              {transcript || (isListening ? 'Speak now…' : 'Tap the mic button to speak')}
            </Text>
          </View>

          <Text style={styles.hint}>
            {isListening ? 'Listening for your command…' : 'Say "Hey Riuka" or tap the mic'}
          </Text>

          {/* Close */}
          <TouchableOpacity style={styles.closeBtn} onPress={onClose} activeOpacity={0.75}>
            <X color={Colors.textTertiary} size={18} />
          </TouchableOpacity>
        </Animated.View>
      </Animated.View>
    </View>
  );
}

const RING_SIZE = 160;

const styles = StyleSheet.create({
  backdrop: {
    backgroundColor: 'rgba(0,0,0,0.55)',
  },
  panelWrap: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
  },
  panel: {
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingBottom: Platform.OS === 'ios' ? 36 : 28,
    alignItems: 'center',
    overflow: 'hidden',
    borderWidth: 1.5,
    borderBottomWidth: 0,
  },
  scanLine: {
    position: 'absolute',
    left: 0,
    right: 0,
    height: 1,
    backgroundColor: 'rgba(168,85,247,0.25)',
    shadowColor: Colors.primary,
    shadowOpacity: 0.6,
    shadowRadius: 8,
  },
  corner: {
    position: 'absolute',
    width: 18,
    height: 18,
    borderColor: 'rgba(168,85,247,0.45)',
  },
  cTL: { top: 16, left: 16, borderTopWidth: 2, borderLeftWidth: 2 },
  cTR: { top: 16, right: 16, borderTopWidth: 2, borderRightWidth: 2 },
  cBL: { bottom: 14, left: 16, borderBottomWidth: 2, borderLeftWidth: 2 },
  cBR: { bottom: 14, right: 16, borderBottomWidth: 2, borderRightWidth: 2 },
  handle: {
    width: 38,
    height: 4,
    borderRadius: 2,
    backgroundColor: 'rgba(255,255,255,0.13)',
    marginTop: 12,
    marginBottom: 18,
  },
  statusChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 99,
    borderWidth: 1,
    borderColor: 'rgba(100,116,139,0.3)',
    backgroundColor: 'rgba(255,255,255,0.04)',
    marginBottom: 24,
  },
  statusChipActive: {
    borderColor: 'rgba(168,85,247,0.4)',
    backgroundColor: 'rgba(168,85,247,0.08)',
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: Colors.textTertiary,
  },
  statusDotActive: {
    backgroundColor: Colors.primary,
    shadowColor: Colors.primary,
    shadowOpacity: 1,
    shadowRadius: 4,
  },
  statusText: {
    fontSize: 9,
    fontWeight: '700',
    letterSpacing: 2.5,
    color: Colors.textTertiary,
  },
  statusTextActive: {
    color: Colors.primary,
  },
  orbArea: {
    width: RING_SIZE,
    height: RING_SIZE,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 28,
  },
  ring: {
    position: 'absolute',
    width: RING_SIZE,
    height: RING_SIZE,
    borderRadius: RING_SIZE / 2,
    borderWidth: 1.5,
    borderColor: Colors.primary,
  },
  orb: {
    width: 72,
    height: 72,
    borderRadius: 36,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: Colors.primary,
    shadowOpacity: 0.8,
    shadowRadius: 24,
    elevation: 10,
  },
  waveRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2.5,
    height: 56,
    marginBottom: 22,
    paddingHorizontal: Spacing.lg,
  },
  bar: {
    width: 3,
    borderRadius: 2,
    shadowOpacity: 0.7,
    shadowRadius: 3,
    elevation: 2,
  },
  transcriptBox: {
    backgroundColor: 'rgba(168,85,247,0.07)',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(168,85,247,0.18)',
    paddingHorizontal: 20,
    paddingVertical: 14,
    marginHorizontal: 20,
    width: W - 40,
    minHeight: 60,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 14,
  },
  transcriptText: {
    color: Colors.text,
    fontSize: FontSizes.md,
    textAlign: 'center',
    lineHeight: 22,
    fontWeight: '500',
  },
  transcriptPlaceholder: {
    color: Colors.textTertiary,
    fontWeight: '400',
  },
  hint: {
    fontSize: 10,
    color: Colors.textTertiary,
    letterSpacing: 0.4,
    marginBottom: 18,
  },
  closeBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: 'rgba(255,255,255,0.05)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
});
