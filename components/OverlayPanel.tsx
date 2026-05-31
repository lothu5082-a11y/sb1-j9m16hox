import React, { useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Dimensions,
  Platform,
} from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
  withRepeat,
  withSequence,
  Easing,
  FadeIn,
  FadeOut,
} from 'react-native-reanimated';
import Svg, { Path, Defs, LinearGradient as SvgLinearGradient, Stop } from 'react-native-svg';
import { X, Mic } from 'lucide-react-native';
import { Colors, Spacing, FontSizes, BorderRadius } from '../constants/theme';

const { width: W, height: H } = Dimensions.get('window');

// ── 4-pointed Vexsora star ───────────────────────────────────────────────────

function VexsoraStarSmall({ size = 32 }: { size?: number }) {
  const s = size;
  const cx = s / 2, cy = s / 2;
  const outer = s * 0.46, inner = s * 0.14;
  const pts: string[] = [];
  for (let i = 0; i < 8; i++) {
    const angle = (i * Math.PI) / 4 - Math.PI / 2;
    const r = i % 2 === 0 ? outer : inner;
    pts.push(`${cx + r * Math.cos(angle)},${cy + r * Math.sin(angle)}`);
  }
  return (
    <Svg width={s} height={s}>
      <Defs>
        <SvgLinearGradient id="sg" x1="0" y1="0" x2="1" y2="1">
          <Stop offset="0%" stopColor="#A855F7" stopOpacity="1" />
          <Stop offset="100%" stopColor="#3B82F6" stopOpacity="1" />
        </SvgLinearGradient>
      </Defs>
      <Path d={`M${pts.join('L')}Z`} fill="url(#sg)" />
    </Svg>
  );
}

// ── Waveform animation ────────────────────────────────────────────────────────

function WaveformAnim({ active }: { active: boolean }) {
  const bars = [0.4, 0.7, 1.0, 0.8, 0.5, 0.9, 0.6, 1.0, 0.4, 0.7];
  const vals = bars.map(() => useSharedValue(0.3));

  useEffect(() => {
    if (active) {
      vals.forEach((v, i) => {
        const target = bars[i];
        v.value = withRepeat(
          withSequence(
            withTiming(target, { duration: 300 + i * 60, easing: Easing.inOut(Easing.ease) }),
            withTiming(0.2, { duration: 300 + i * 60, easing: Easing.inOut(Easing.ease) })
          ),
          -1,
          false
        );
      });
    } else {
      vals.forEach((v) => { v.value = withTiming(0.3, { duration: 200 }); });
    }
  }, [active]);

  return (
    <View style={waveStyles.row}>
      {vals.map((v, i) => {
        const barStyle = useAnimatedStyle(() => ({ height: v.value * 28 }));
        return <Animated.View key={i} style={[waveStyles.bar, barStyle]} />;
      })}
    </View>
  );
}

const waveStyles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 3, height: 32 },
  bar: { width: 3, borderRadius: 3, backgroundColor: Colors.primary, opacity: 0.85 },
});

// ── Main OverlayPanel ─────────────────────────────────────────────────────────

interface OverlayPanelProps {
  visible: boolean;
  response: string;
  onDismiss: () => void;
  isListening?: boolean;
  isSpeaking?: boolean;
}

export default function OverlayPanel({
  visible,
  response,
  onDismiss,
  isListening = false,
  isSpeaking = false,
}: OverlayPanelProps) {
  const translateY = useSharedValue(H);
  const backdropOpacity = useSharedValue(0);

  useEffect(() => {
    if (visible) {
      translateY.value = withSpring(0, { damping: 22, stiffness: 180 });
      backdropOpacity.value = withTiming(1, { duration: 280 });
    } else {
      translateY.value = withTiming(H, { duration: 320, easing: Easing.in(Easing.ease) });
      backdropOpacity.value = withTiming(0, { duration: 280 });
    }
  }, [visible]);

  const panelStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: translateY.value }],
  }));
  const backdropStyle = useAnimatedStyle(() => ({
    opacity: backdropOpacity.value,
  }));

  if (!visible && translateY.value >= H - 1) return null;

  return (
    <View style={styles.root} pointerEvents={visible ? 'auto' : 'none'}>
      {/* Backdrop */}
      <Animated.View style={[styles.backdrop, backdropStyle]}>
        <TouchableOpacity style={StyleSheet.absoluteFill} onPress={onDismiss} activeOpacity={1} />
      </Animated.View>

      {/* Panel */}
      <Animated.View style={[styles.panel, panelStyle]}>
        {/* Handle bar */}
        <View style={styles.handle} />

        {/* Header */}
        <View style={styles.header}>
          <View style={styles.starWrap}>
            <VexsoraStarSmall size={28} />
          </View>
          <Text style={styles.title}>Vexsora</Text>
          <View style={styles.headerRight}>
            {(isListening || isSpeaking) && (
              <View style={styles.statusDot}>
                <WaveformAnim active={isListening || isSpeaking} />
              </View>
            )}
            <TouchableOpacity onPress={onDismiss} style={styles.closeBtn} hitSlop={12}>
              <X color={Colors.textTertiary} size={18} />
            </TouchableOpacity>
          </View>
        </View>

        {/* Response text */}
        <ScrollView
          style={styles.responseScroll}
          contentContainerStyle={styles.responseContent}
          showsVerticalScrollIndicator={false}
        >
          {isListening ? (
            <View style={styles.listeningRow}>
              <Mic color={Colors.primary} size={20} />
              <Text style={styles.listeningText}>Listening...</Text>
            </View>
          ) : (
            <Text style={styles.responseText}>{response || 'How can I help you?'}</Text>
          )}
        </ScrollView>

        {/* Bottom glow line */}
        <View style={styles.bottomGlow} />
      </Animated.View>
    </View>
  );
}

// ── Stealth dot ───────────────────────────────────────────────────────────────

interface StealthDotProps {
  visible: boolean;
  side?: 'left' | 'right';
}

export function StealthDot({ visible, side = 'right' }: StealthDotProps) {
  const opacity = useSharedValue(0);
  const scale = useSharedValue(0.6);

  useEffect(() => {
    if (visible) {
      opacity.value = withRepeat(
        withSequence(
          withTiming(1, { duration: 600, easing: Easing.inOut(Easing.ease) }),
          withTiming(0.4, { duration: 600, easing: Easing.inOut(Easing.ease) })
        ),
        -1,
        false
      );
      scale.value = withTiming(1, { duration: 300 });
    } else {
      opacity.value = withTiming(0, { duration: 200 });
      scale.value = withTiming(0.6, { duration: 200 });
    }
  }, [visible]);

  const dotAnim = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ scale: scale.value }],
  }));

  if (!visible) return null;

  return (
    <Animated.View
      style={[
        styles.stealthDot,
        side === 'left' ? styles.stealthLeft : styles.stealthRight,
        dotAnim,
      ]}
      pointerEvents="none"
    />
  );
}

const styles = StyleSheet.create({
  root: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 9999,
    pointerEvents: 'box-none',
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.55)',
  },
  panel: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    maxHeight: H * 0.65,
    backgroundColor: Colors.surface,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    overflow: 'hidden',
    paddingBottom: Platform.OS === 'ios' ? 36 : 24,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
    shadowColor: '#A855F7',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.3,
    shadowRadius: 20,
    elevation: 24,
  },
  handle: {
    alignSelf: 'center',
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: Colors.borderLight,
    marginTop: 10,
    marginBottom: 4,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: Colors.border,
  },
  starWrap: { marginRight: Spacing.sm },
  title: {
    flex: 1,
    fontSize: FontSizes.lg,
    fontWeight: '700',
    color: Colors.text,
    letterSpacing: 0.5,
  },
  headerRight: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  statusDot: { marginRight: 4 },
  closeBtn: { padding: 4 },
  responseScroll: { maxHeight: H * 0.45 },
  responseContent: {
    padding: Spacing.lg,
    paddingTop: Spacing.md,
  },
  responseText: {
    fontSize: FontSizes.lg,
    color: Colors.text,
    lineHeight: 26,
    fontWeight: '400',
  },
  listeningRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  listeningText: {
    fontSize: FontSizes.lg,
    color: Colors.primary,
    fontStyle: 'italic',
  },
  bottomGlow: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 2,
    backgroundColor: Colors.primary,
    opacity: 0.4,
  },

  // Stealth dot
  stealthDot: {
    position: 'absolute',
    top: '50%',
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: Colors.primary,
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 1,
    shadowRadius: 8,
    elevation: 10,
    zIndex: 9999,
  },
  stealthLeft: { left: -6 },
  stealthRight: { right: -6 },
});
