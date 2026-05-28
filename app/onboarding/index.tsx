import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Dimensions,
  TouchableOpacity,
  ScrollView,
  Animated,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Mic, Bell, Shield, Sparkles, Cpu, Zap, ChevronRight, ClipboardList } from 'lucide-react-native';
import { router } from 'expo-router';
import { Colors, Spacing, FontSizes, BorderRadius } from '../../constants/theme';
import GlowButton from '../../components/GlowButton';

const { width } = Dimensions.get('window');

const slides = [
  {
    title: 'Riuka AI',
    subtitle: 'The On-Device Jarvis',
    description:
      'An autonomous system-level executive assistant that operates entirely within your device. Zero cloud. Zero latency. Absolute privacy.',
    icon: Sparkles,
    gradient: [Colors.background, '#0D0A1A'] as const,
  },
  {
    title: 'Sensor Layer',
    subtitle: 'Always-On Background Awareness',
    description:
      'Riuka silently monitors your notification stream (WhatsApp, Telegram, Slack, SMS), clipboard buffer, and device context — continuously, in the background.',
    icon: Bell,
    gradient: [Colors.background, '#0A0A1A'] as const,
  },
  {
    title: 'On-Device Brain',
    subtitle: '100% Offline Intelligence',
    description:
      'All data is processed by a compact language model running directly on your hardware. Your messages, documents, and location data never leave your phone.',
    icon: Cpu,
    gradient: [Colors.background, '#120A1A'] as const,
  },
  {
    title: 'Clipboard Engine',
    subtitle: 'Instant Copy Analysis',
    description:
      'Copy a code snippet, tracking number, or contract text — Riuka wakes instantly and surfaces analysis in an overlay panel without interrupting your workflow.',
    icon: ClipboardList,
    gradient: [Colors.background, '#0A120A'] as const,
  },
  {
    title: 'Interface Pilot',
    subtitle: 'Autonomous App Control',
    description:
      'Once the on-device brain decides on an action, it physically pilots the interface — opening apps, typing, tapping, and sending — completely invisibly.',
    icon: Zap,
    gradient: [Colors.background, '#1A0A0A'] as const,
  },
  {
    title: 'Privacy Fortress',
    subtitle: 'Zero Cloud Architecture',
    description:
      'Riuka\'s on-device design makes data leakage structurally impossible. Your private communications and financial data stay on your hardware — always.',
    icon: Shield,
    gradient: [Colors.background, '#0A1A12'] as const,
  },
];

function PulsingIcon({ IconComponent }: { IconComponent: React.ComponentType<any> }) {
  const glowOpacity = useRef(new Animated.Value(0.4)).current;

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(glowOpacity, { toValue: 1, duration: 1200, useNativeDriver: true }),
        Animated.timing(glowOpacity, { toValue: 0.4, duration: 1200, useNativeDriver: true }),
      ])
    ).start();
  }, []);

  return (
    <View style={styles.iconCircleWrapper}>
      <Animated.View style={[styles.iconGlow, { opacity: glowOpacity }]} />
      <View style={styles.iconCircle}>
        <IconComponent color={Colors.primary} size={48} strokeWidth={1.5} />
      </View>
    </View>
  );
}

export default function OnboardingScreen() {
  const [currentSlide, setCurrentSlide] = useState(0);
  const scrollViewRef = useRef<ScrollView>(null);

  const goToSlide = (index: number) => {
    setCurrentSlide(index);
    scrollViewRef.current?.scrollTo({ x: index * width, animated: true });
  };

  const handleNext = () => {
    if (currentSlide < slides.length - 1) goToSlide(currentSlide + 1);
  };

  const handleSkip = () => goToSlide(slides.length - 1);

  const handleGetStarted = () => router.replace('/(tabs)');

  return (
    <View style={styles.container}>
      <ScrollView
        ref={scrollViewRef}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onMomentumScrollEnd={(e) => {
          const index = Math.round(e.nativeEvent.contentOffset.x / width);
          setCurrentSlide(index);
        }}
        scrollEventThrottle={16}
      >
        {slides.map((slide, index) => {
          const IconComponent = slide.icon;
          return (
            <View key={index} style={[styles.slide, { width }]}>
              <LinearGradient colors={slide.gradient} style={styles.slideGradient}>
                <PulsingIcon IconComponent={IconComponent} />
                <Text style={styles.title}>{slide.title}</Text>
                <Text style={styles.subtitle}>{slide.subtitle}</Text>
                <Text style={styles.description}>{slide.description}</Text>
              </LinearGradient>
            </View>
          );
        })}
      </ScrollView>

      <View style={styles.footer}>
        <View style={styles.dots}>
          {slides.map((_, index) => (
            <TouchableOpacity key={index} onPress={() => goToSlide(index)}>
              <View
                style={[
                  styles.dot,
                  index === currentSlide && styles.activeDot,
                  index < currentSlide && styles.completedDot,
                ]}
              />
            </TouchableOpacity>
          ))}
        </View>

        <View style={styles.actions}>
          {currentSlide < slides.length - 1 ? (
            <>
              <TouchableOpacity onPress={handleSkip}>
                <Text style={styles.skipText}>Skip</Text>
              </TouchableOpacity>
              <GlowButton
                title="Next"
                onPress={handleNext}
                icon={<ChevronRight color="#ffffff" size={18} />}
              />
            </>
          ) : (
            <GlowButton
              title="Activate Riuka"
              onPress={handleGetStarted}
              size="lg"
              style={styles.getStartedButton}
            />
          )}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  slide: { flex: 1 },
  slideGradient: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: Spacing.xl,
    paddingBottom: 200,
  },
  iconCircleWrapper: {
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.xxl,
  },
  iconGlow: {
    position: 'absolute',
    width: 160,
    height: 160,
    borderRadius: 80,
    backgroundColor: 'transparent',
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 1,
    shadowRadius: 40,
    elevation: 20,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  iconCircle: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: 'rgba(168, 85, 247, 0.08)',
    borderWidth: 2,
    borderColor: 'rgba(168, 85, 247, 0.3)',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.4,
    shadowRadius: 30,
    elevation: 10,
  },
  title: {
    fontSize: FontSizes.huge,
    fontWeight: '700',
    color: Colors.text,
    marginBottom: Spacing.sm,
    textAlign: 'center',
    letterSpacing: 1,
  },
  subtitle: {
    fontSize: FontSizes.xl,
    fontWeight: '600',
    color: Colors.primary,
    marginBottom: Spacing.lg,
    textAlign: 'center',
  },
  description: {
    fontSize: FontSizes.md,
    color: Colors.textSecondary,
    textAlign: 'center',
    lineHeight: 24,
    maxWidth: 320,
  },
  footer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: Spacing.xl,
    paddingBottom: Spacing.xxl,
    paddingTop: Spacing.lg,
    backgroundColor: Colors.background,
  },
  dots: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginBottom: Spacing.xl,
    gap: Spacing.sm,
  },
  dot: { width: 8, height: 8, borderRadius: 4, backgroundColor: Colors.border },
  activeDot: {
    width: 24,
    backgroundColor: Colors.primary,
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.6,
    shadowRadius: 8,
    elevation: 4,
  },
  completedDot: { backgroundColor: Colors.primaryDark },
  actions: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  skipText: { fontSize: FontSizes.md, color: Colors.textTertiary, fontWeight: '500' },
  getStartedButton: { flex: 1 },
});
