import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Dimensions,
  TouchableOpacity,
  ScrollView,
  TextInput,
  Platform,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withSequence,
  withTiming,
  withSpring,
  Easing,
  FadeIn,
  FadeOut,
  SlideInRight,
  SlideOutLeft,
  interpolateColor,
} from 'react-native-reanimated';
import Svg, { Path, Defs, LinearGradient as SvgLinearGradient, Stop } from 'react-native-svg';
import { ChevronRight, Cpu, Zap, Hand, Brain, Shield, Star } from 'lucide-react-native';
import { router } from 'expo-router';
import { Colors, Spacing, FontSizes, BorderRadius } from '../../constants/theme';
import { memoryService } from '../../lib/memoryService';

const { width: W, height: H } = Dimensions.get('window');

// ── Slide data ────────────────────────────────────────────────────────────────
const SLIDES = [
  {
    id: 0,
    title: 'Vexsora',
    subtitle: 'Your Offline AI Companion',
    description: '100% private, zero cloud, zero API keys. Runs entirely on your device using a local AI brain.',
    accentColor: '#A855F7',
    secondaryColor: '#3B82F6',
    icon: 'star' as const,
  },
  {
    id: 1,
    title: 'Pranalis',
    subtitle: 'Adaptive Personality',
    description: 'Vexsora reads your profile and adapts her tone, attitude, and response style specifically to you.',
    accentColor: '#EC4899',
    secondaryColor: '#A855F7',
    icon: 'brain' as const,
    hasInput: true,
  },
  {
    id: 2,
    title: 'On-Device Brain',
    subtitle: 'Local LLM Engine',
    description: 'Powered by llama.cpp running Llama 3.2 1B directly on your ARM chipset. No internet required.',
    accentColor: '#3B82F6',
    secondaryColor: '#10B981',
    icon: 'cpu' as const,
  },
  {
    id: 3,
    title: 'Hardware Control',
    subtitle: 'Deep Android Integration',
    description: 'Toggle flashlight, control volume, read notifications, send WhatsApp messages — all via voice.',
    accentColor: '#10B981',
    secondaryColor: '#3B82F6',
    icon: 'zap' as const,
  },
  {
    id: 4,
    title: 'Smart Gestures',
    subtitle: 'Hands-Free Control',
    description: 'Double-shake to wake Vexsora. Flip phone face-down to instantly mute her voice.',
    accentColor: '#F59E0B',
    secondaryColor: '#EC4899',
    icon: 'hand' as const,
  },
  {
    id: 5,
    title: 'Self-Learning',
    subtitle: 'Grows With You',
    description: 'Vexsora remembers corrections and expands her knowledge base completely offline.',
    accentColor: '#A855F7',
    secondaryColor: '#3B82F6',
    icon: 'shield' as const,
  },
];

// ── 4-pointed star SVG ────────────────────────────────────────────────────────
function VexsoraStar({ size = 56, color1 = '#A855F7', color2 = '#3B82F6' }: { size?: number; color1?: string; color2?: string }) {
  const cx = size / 2; const cy = size / 2;
  const outer = size * 0.46; const inner = size * 0.14;
  const pts: string[] = [];
  for (let i = 0; i < 8; i++) {
    const angle = (i * Math.PI) / 4 - Math.PI / 2;
    const r = i % 2 === 0 ? outer : inner;
    pts.push(`${cx + r * Math.cos(angle)},${cy + r * Math.sin(angle)}`);
  }
  const starPath = `M${pts.join('L')}Z`;
  const gradId = `sg_${color1.replace('#', '')}`;
  return (
    <Svg width={size} height={size}>
      <Defs>
        <SvgLinearGradient id={gradId} x1="0" y1="0" x2="1" y2="1">
          <Stop offset="0%" stopColor={color1} />
          <Stop offset="100%" stopColor={color2} />
        </SvgLinearGradient>
      </Defs>
      <Path d={starPath} fill={`url(#${gradId})`} />
    </Svg>
  );
}

// ── Icon selector ─────────────────────────────────────────────────────────────
function SlideIcon({ type, color1, color2 }: { type: string; color1: string; color2: string }) {
  const iconSize = 28;
  const iconColor = '#fff';
  const icons: Record<string, React.ReactNode> = {
    star: <VexsoraStar size={56} color1={color1} color2={color2} />,
    brain: <Brain size={iconSize} color={iconColor} />,
    cpu: <Cpu size={iconSize} color={iconColor} />,
    zap: <Zap size={iconSize} color={iconColor} />,
    hand: <Hand size={iconSize} color={iconColor} />,
    shield: <Shield size={iconSize} color={iconColor} />,
  };
  return <>{icons[type] ?? <Star size={iconSize} color={iconColor} />}</>;
}

// ── Pulsing icon circle ───────────────────────────────────────────────────────
function PulsingIconCircle({ slide }: { slide: typeof SLIDES[0] }) {
  const scale = useSharedValue(1);
  const glow = useSharedValue(0.3);
  useEffect(() => {
    scale.value = withRepeat(
      withSequence(
        withTiming(1.12, { duration: 1800, easing: Easing.inOut(Easing.sin) }),
        withTiming(0.94, { duration: 1800, easing: Easing.inOut(Easing.sin) })
      ),
      -1,
      false
    );
    glow.value = withRepeat(
      withSequence(
        withTiming(0.7, { duration: 1800, easing: Easing.inOut(Easing.sin) }),
        withTiming(0.15, { duration: 1800, easing: Easing.inOut(Easing.sin) })
      ),
      -1,
      false
    );
  }, []);

  const circleStyle = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));
  const glowStyle = useAnimatedStyle(() => ({ opacity: glow.value }));

  return (
    <View style={styles.iconWrap}>
      <Animated.View
        style={[
          glowStyle,
          {
            position: 'absolute',
            width: 130,
            height: 130,
            borderRadius: 65,
            backgroundColor: slide.accentColor + '30',
          },
        ]}
      />
      <Animated.View style={[circleStyle, styles.iconCircle, { borderColor: slide.accentColor + '60' }]}>
        <LinearGradient
          colors={[slide.accentColor + 'CC', slide.secondaryColor + 'CC']}
          style={styles.iconGradient}
        >
          <SlideIcon type={slide.icon} color1={slide.accentColor} color2={slide.secondaryColor} />
        </LinearGradient>
      </Animated.View>
    </View>
  );
}

// ── Dot progress indicators ───────────────────────────────────────────────────
function DotIndicators({ total, active, accentColor }: { total: number; active: number; accentColor: string }) {
  return (
    <View style={styles.dotsRow}>
      {Array.from({ length: total }).map((_, i) => (
        <View
          key={i}
          style={[
            styles.dot,
            {
              width: i === active ? 20 : 6,
              backgroundColor: i === active ? accentColor : 'rgba(255,255,255,0.25)',
            },
          ]}
        />
      ))}
    </View>
  );
}

// ── Main Onboarding screen ────────────────────────────────────────────────────
export default function OnboardingScreen() {
  const [currentSlide, setCurrentSlide] = useState(0);
  const [profileName, setProfileName] = useState('');
  const [saving, setSaving] = useState(false);

  const slide = SLIDES[currentSlide];
  const isLast = currentSlide === SLIDES.length - 1;

  const handleNext = useCallback(async () => {
    if (currentSlide === 1 && profileName.trim()) {
      setSaving(true);
      try {
        await memoryService.addMemory(`Name: ${profileName.trim()}`, 'preference', ['profile_name']);
      } catch {}
      setSaving(false);
    }
    if (isLast) {
      router.replace('/(tabs)');
    } else {
      setCurrentSlide((i) => i + 1);
    }
  }, [currentSlide, isLast, profileName]);

  const handleSkip = useCallback(() => {
    router.replace('/(tabs)');
  }, []);

  return (
    <View style={styles.root}>
      <LinearGradient
        colors={['#0B0B0A', '#0F0B1A', '#0B0B0A']}
        style={StyleSheet.absoluteFill}
      />

      {/* Background glow */}
      <Animated.View
        entering={FadeIn.duration(600)}
        style={[
          styles.bgGlow,
          { backgroundColor: slide.accentColor + '18' },
        ]}
      />

      {/* Skip button */}
      {!isLast && (
        <TouchableOpacity style={styles.skipBtn} onPress={handleSkip} activeOpacity={0.7}>
          <Text style={styles.skipText}>Skip</Text>
        </TouchableOpacity>
      )}

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        scrollEnabled={false}
      >
        {/* Icon */}
        <Animated.View entering={FadeIn.duration(500)} key={`icon_${currentSlide}`} style={styles.iconSection}>
          <PulsingIconCircle slide={slide} />
        </Animated.View>

        {/* Text content */}
        <Animated.View
          key={`text_${currentSlide}`}
          entering={SlideInRight.duration(350).springify()}
          exiting={SlideOutLeft.duration(250)}
          style={styles.textSection}
        >
          <Text style={[styles.slideSubtitle, { color: slide.accentColor }]}>
            {slide.subtitle}
          </Text>
          <Text style={styles.slideTitle}>{slide.title}</Text>
          <Text style={styles.slideDesc}>{slide.description}</Text>

          {/* Profile name input on slide 2 */}
          {slide.hasInput && (
            <View style={styles.inputSection}>
              <Text style={styles.inputLabel}>What should Vexsora call you?</Text>
              <TextInput
                style={[styles.nameInput, { borderColor: slide.accentColor + '60' }]}
                placeholder="Enter your name..."
                placeholderTextColor={Colors.textTertiary}
                value={profileName}
                onChangeText={setProfileName}
                autoCapitalize="words"
                returnKeyType="done"
                onSubmitEditing={handleNext}
              />
            </View>
          )}
        </Animated.View>

        {/* Dots */}
        <DotIndicators total={SLIDES.length} active={currentSlide} accentColor={slide.accentColor} />

        {/* CTA button */}
        <TouchableOpacity
          style={[styles.ctaBtn, { backgroundColor: slide.accentColor }]}
          onPress={handleNext}
          activeOpacity={0.85}
        >
          <LinearGradient
            colors={[slide.accentColor, slide.secondaryColor]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.ctaBtnGradient}
          >
            <Text style={styles.ctaBtnText}>
              {isLast ? 'Activate Vexsora' : saving ? 'Saving...' : 'Continue'}
            </Text>
            <ChevronRight size={20} color="#fff" style={{ marginLeft: 4 }} />
          </LinearGradient>
        </TouchableOpacity>

        {/* Already have account / go back */}
        {currentSlide > 0 && !isLast && (
          <TouchableOpacity
            style={styles.backBtn}
            onPress={() => setCurrentSlide((i) => i - 1)}
            activeOpacity={0.7}
          >
            <Text style={styles.backBtnText}>Back</Text>
          </TouchableOpacity>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#0B0B0A' },
  bgGlow: {
    position: 'absolute',
    top: H * 0.1,
    left: W * 0.1,
    right: W * 0.1,
    height: H * 0.5,
    borderRadius: W * 0.4,
    opacity: 0.6,
  },
  skipBtn: {
    position: 'absolute',
    top: Platform.OS === 'android' ? 52 : 60,
    right: Spacing.lg,
    zIndex: 10,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs + 2,
    borderRadius: BorderRadius.full,
    backgroundColor: 'rgba(255,255,255,0.06)',
  },
  skipText: { color: Colors.textSecondary, fontSize: FontSizes.sm, fontWeight: '600' },
  scrollContent: {
    flexGrow: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: Spacing.xl,
    paddingTop: Platform.OS === 'android' ? 80 : 100,
    paddingBottom: Spacing.xxl,
    gap: Spacing.lg,
  },
  iconSection: {
    alignItems: 'center',
    marginBottom: Spacing.md,
  },
  iconWrap: {
    width: 120,
    height: 120,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconCircle: {
    width: 96,
    height: 96,
    borderRadius: 48,
    overflow: 'hidden',
    borderWidth: 2,
  },
  iconGradient: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  textSection: {
    alignItems: 'center',
    width: '100%',
  },
  slideSubtitle: {
    fontSize: FontSizes.sm,
    fontWeight: '700',
    letterSpacing: 1.5,
    textTransform: 'uppercase',
    marginBottom: Spacing.sm,
    textAlign: 'center',
  },
  slideTitle: {
    fontSize: FontSizes.massive,
    fontWeight: '800',
    color: Colors.text,
    textAlign: 'center',
    letterSpacing: -0.5,
    marginBottom: Spacing.md,
  },
  slideDesc: {
    fontSize: FontSizes.md,
    color: Colors.textSecondary,
    textAlign: 'center',
    lineHeight: 24,
    paddingHorizontal: Spacing.sm,
  },
  inputSection: {
    width: '100%',
    marginTop: Spacing.lg,
  },
  inputLabel: {
    fontSize: FontSizes.sm,
    color: Colors.textSecondary,
    marginBottom: Spacing.sm,
    fontWeight: '600',
    textAlign: 'center',
  },
  nameInput: {
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderRadius: BorderRadius.full,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm + 2,
    color: Colors.text,
    fontSize: FontSizes.lg,
    borderWidth: 1.5,
    textAlign: 'center',
    fontWeight: '600',
  },
  dotsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: Spacing.md,
  },
  dot: {
    height: 6,
    borderRadius: 3,
  },
  ctaBtn: {
    width: '100%',
    borderRadius: BorderRadius.full,
    overflow: 'hidden',
    shadowColor: '#A855F7',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.5,
    shadowRadius: 14,
    elevation: 8,
    marginTop: Spacing.lg,
  },
  ctaBtnGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Spacing.md + 2,
  },
  ctaBtnText: {
    color: '#fff',
    fontSize: FontSizes.lg,
    fontWeight: '800',
    letterSpacing: 0.3,
  },
  backBtn: { paddingVertical: Spacing.sm, paddingHorizontal: Spacing.xl },
  backBtnText: { color: Colors.textTertiary, fontSize: FontSizes.sm, textAlign: 'center' },
});
