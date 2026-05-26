import React, { useState, useRef } from 'react';
import { View, Text, StyleSheet, Dimensions, TouchableOpacity, ScrollView } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Mic, Shield, Sparkles, Brain, Phone, Wand2, ChevronRight } from 'lucide-react-native';
import { router } from 'expo-router';
import { Colors, Spacing, FontSizes, BorderRadius } from '../../constants/theme';
import GlowButton from '../../components/GlowButton';

const { width } = Dimensions.get('window');

const slides = [
  {
    title: 'Meet Vexora',
    subtitle: 'Your AI-Powered Life Assistant',
    description: 'Vexora is a powerful AI assistant that understands your voice, controls your phone, and helps you accomplish anything — faster.',
    icon: Sparkles,
    gradient: [Colors.background, '#0D1B2A'] as const,
  },
  {
    title: 'Voice Control',
    subtitle: 'Say "Hey Vexora"',
    description: 'Hands-free control of your entire phone. Open apps, send messages, set reminders, and more — all with your voice.',
    icon: Mic,
    gradient: [Colors.background, '#0A1929'] as const,
  },
  {
    title: 'AI Agent',
    subtitle: 'Tasks on Autopilot',
    description: 'Break complex goals into steps. Vexora plans, executes, and tracks your tasks — asking for approval before important actions.',
    icon: Brain,
    gradient: [Colors.background, '#1A0A2E'] as const,
  },
  {
    title: 'Smart Creation',
    subtitle: 'Generate Anything',
    description: 'Create AI images, write code, draft emails, summarize videos, and produce content across all formats.',
    icon: Wand2,
    gradient: [Colors.background, '#1A0A0A'] as const,
  },
  {
    title: 'Privacy First',
    subtitle: 'Secure by Design',
    description: 'Biometric lock, encrypted conversations, and user-controlled memory. Vexora only works fully for you.',
    icon: Shield,
    gradient: [Colors.background, '#0A1A0A'] as const,
  },
  {
    title: 'Smart Calling',
    subtitle: 'Never Miss a Call',
    description: "Vexora answers calls when you're busy, announces callers, and lets you respond with a voice command.",
    icon: Phone,
    gradient: [Colors.background, '#0A1A1A'] as const,
  },
];

export default function OnboardingScreen() {
  const [currentSlide, setCurrentSlide] = useState(0);
  const scrollViewRef = useRef<ScrollView>(null);

  const goToSlide = (index: number) => {
    setCurrentSlide(index);
    scrollViewRef.current?.scrollTo({ x: index * width, animated: true });
  };

  const handleNext = () => {
    if (currentSlide < slides.length - 1) {
      goToSlide(currentSlide + 1);
    }
  };

  const handleSkip = () => {
    goToSlide(slides.length - 1);
  };

  const handleGetStarted = () => {
    router.replace('/(tabs)');
  };

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
                <View style={styles.iconCircle}>
                  <IconComponent color={Colors.primary} size={48} strokeWidth={1.5} />
                </View>
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
              <GlowButton title="Next" onPress={handleNext} icon={<ChevronRight color={Colors.background} size={18} />} />
            </>
          ) : (
            <GlowButton title="Get Started" onPress={handleGetStarted} size="lg" style={styles.getStartedButton} />
          )}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  slide: {
    flex: 1,
  },
  slideGradient: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: Spacing.xl,
    paddingBottom: 200,
  },
  iconCircle: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: 'rgba(0, 229, 255, 0.08)',
    borderWidth: 2,
    borderColor: 'rgba(0, 229, 255, 0.3)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.xxl,
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
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: Colors.border,
  },
  activeDot: {
    width: 24,
    backgroundColor: Colors.primary,
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.6,
    shadowRadius: 8,
    elevation: 4,
  },
  completedDot: {
    backgroundColor: Colors.primaryDark,
  },
  actions: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  skipText: {
    fontSize: FontSizes.md,
    color: Colors.textTertiary,
    fontWeight: '500',
  },
  getStartedButton: {
    flex: 1,
  },
});
