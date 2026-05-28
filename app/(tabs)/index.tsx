import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Dimensions,
  Animated as RNAnimated,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, { FadeInUp } from 'react-native-reanimated';
import {
  Mic,
  MessageSquare,
  ImagePlus,
  Gamepad2,
  Settings,
  Youtube,
  Flashlight,
  AlarmClock,
  Camera,
  FileText,
  Zap,
} from 'lucide-react-native';
import { router } from 'expo-router';
import { Colors, Spacing, FontSizes, BorderRadius } from '../../constants/theme';
import VoiceOrb from '../../components/VoiceOrb';

const { width } = Dimensions.get('window');

const DYNAMIC_TEXTS = ['Ready to assist', 'At your service', "What's next?"];

const quickCommands = [
  { label: 'Open YouTube', icon: Youtube },
  { label: 'Turn on flashlight', icon: Flashlight },
  { label: 'Start gaming', icon: Gamepad2 },
  { label: 'Set alarm', icon: AlarmClock },
  { label: 'Summarize page', icon: FileText },
  { label: 'Take photo', icon: Camera },
];

const capabilityCards = [
  {
    title: 'AI Chat',
    description: 'Ask anything, get instant smart answers',
    Icon: MessageSquare,
    color: Colors.primary,
    route: '/chat',
  },
  {
    title: 'Image Create',
    description: 'Generate art with AI in seconds',
    Icon: ImagePlus,
    color: Colors.secondary,
    route: '/generate',
  },
  {
    title: 'Gaming Mode',
    description: 'FPS, ping tracking & voice commands',
    Icon: Gamepad2,
    color: Colors.accent,
    route: '/gaming',
  },
  {
    title: 'Voice AI',
    description: 'Hands-free control with your voice',
    Icon: Mic,
    color: '#A855F7',
    route: null,
  },
];

function getTimeOfDay(): string {
  const hour = new Date().getHours();
  if (hour < 12) return 'Morning';
  if (hour < 17) return 'Afternoon';
  if (hour < 21) return 'Evening';
  return 'Night';
}

export default function HomeScreen() {
  const [isListening, setIsListening] = useState(false);
  const [dynamicTextIndex, setDynamicTextIndex] = useState(0);
  const fadeAnim = useRef(new RNAnimated.Value(1)).current;

  const toggleListening = () => setIsListening((prev) => !prev);

  // Crossfade cycle for dynamic hero text
  useEffect(() => {
    const interval = setInterval(() => {
      RNAnimated.timing(fadeAnim, {
        toValue: 0,
        duration: 400,
        useNativeDriver: true,
      }).start(() => {
        setDynamicTextIndex((prev) => (prev + 1) % DYNAMIC_TEXTS.length);
        RNAnimated.timing(fadeAnim, {
          toValue: 1,
          duration: 400,
          useNativeDriver: true,
        }).start();
      });
    }, 4000);
    return () => clearInterval(interval);
  }, []);

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={[Colors.background, Colors.backgroundSecondary]}
        style={styles.gradient}
      >
        {/* Fixed Top Bar */}
        <View style={styles.topBar}>
          <View style={styles.topBarLeft}>
            <Text style={styles.brandName}>VEXORA</Text>
            <View style={styles.aiChip}>
              <Text style={styles.aiChipText}>AI</Text>
            </View>
          </View>
          <View style={styles.topBarRight}>
            <View style={styles.statusBadge}>
              <View style={styles.onlineDot} />
              <Text style={styles.onlineText}>Online</Text>
            </View>
            <TouchableOpacity
              onPress={() => router.push('/settings' as any)}
              style={styles.settingsBtn}
              activeOpacity={0.7}
            >
              <Settings color={Colors.textSecondary} size={20} />
            </TouchableOpacity>
          </View>
        </View>

        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scrollContent}
        >
          {/* Hero Section */}
          <Animated.View entering={FadeInUp.duration(600)} style={styles.heroSection}>
            <Text style={styles.greetingText}>Good {getTimeOfDay()},</Text>
            <RNAnimated.Text style={[styles.dynamicText, { opacity: fadeAnim }]}>
              {DYNAMIC_TEXTS[dynamicTextIndex]}
            </RNAnimated.Text>
            <Text style={styles.wakeWordHint}>Say "Hey Vexora" to start</Text>
          </Animated.View>

          {/* Orb Section */}
          <Animated.View
            entering={FadeInUp.duration(800).delay(200)}
            style={styles.orbSection}
          >
            <VoiceOrb isListening={isListening} size={160} />
            <TouchableOpacity
              onPress={toggleListening}
              activeOpacity={0.8}
              style={styles.micButtonWrapper}
            >
              <LinearGradient
                colors={
                  isListening
                    ? [Colors.primary, Colors.primaryDark]
                    : [Colors.surface, Colors.surfaceLight]
                }
                style={styles.micGradient}
              >
                <Mic
                  color={isListening ? Colors.background : Colors.primary}
                  size={28}
                />
              </LinearGradient>
            </TouchableOpacity>
            <Text style={styles.listeningText}>
              {isListening ? 'Listening...' : 'Tap to speak'}
            </Text>
          </Animated.View>

          {/* Quick Commands Section */}
          <Animated.View
            entering={FadeInUp.duration(800).delay(400)}
            style={styles.quickCommandsSection}
          >
            <Text style={styles.sectionTitle}>Quick Commands</Text>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.quickCommandsScroll}
            >
              {quickCommands.map((cmd, index) => {
                const IconComp = cmd.icon;
                return (
                  <TouchableOpacity
                    key={index}
                    activeOpacity={0.7}
                    style={styles.commandChip}
                  >
                    <IconComp color={Colors.primary} size={14} />
                    <Text style={styles.commandChipText}>{cmd.label}</Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          </Animated.View>

          {/* Capabilities Section */}
          <Animated.View
            entering={FadeInUp.duration(800).delay(600)}
            style={styles.capabilitiesSection}
          >
            <Text style={styles.sectionTitle}>Capabilities</Text>
            <View style={styles.capGrid}>
              {capabilityCards.map((card, index) => {
                const IconComp = card.Icon;
                return (
                  <TouchableOpacity
                    key={index}
                    activeOpacity={0.8}
                    style={styles.capCard}
                    onPress={() => {
                      if (card.route) {
                        router.push(card.route as any);
                      } else {
                        setIsListening((prev) => !prev);
                      }
                    }}
                  >
                    <View
                      style={[
                        styles.capIconContainer,
                        { borderColor: card.color + '33' },
                      ]}
                    >
                      <IconComp color={card.color} size={22} />
                    </View>
                    <Text style={styles.capTitle}>{card.title}</Text>
                    <Text style={styles.capDesc}>{card.description}</Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </Animated.View>

          {/* AI Status Section */}
          <Animated.View
            entering={FadeInUp.duration(800).delay(700)}
            style={styles.aiStatusSection}
          >
            <View style={styles.aiStatusCard}>
              <View style={styles.aiStatusLeft}>
                <View style={styles.aiStatusIconWrap}>
                  <Zap color={Colors.warning} size={18} />
                </View>
                <View>
                  <Text style={styles.aiStatusLabel}>AI Provider</Text>
                  <Text style={styles.aiStatusValue}>Local Mode</Text>
                </View>
              </View>
              <View style={styles.aiStatusDivider} />
              <View style={styles.aiStatusStat}>
                <Text style={styles.aiStatNumber}>3</Text>
                <Text style={styles.aiStatLabel}>Connected</Text>
              </View>
              <View style={styles.aiStatusDivider} />
              <View style={styles.aiStatusStat}>
                <Text style={styles.aiStatNumber}>24</Text>
                <Text style={styles.aiStatLabel}>Today</Text>
              </View>
            </View>
          </Animated.View>
        </ScrollView>
      </LinearGradient>
    </View>
  );
}

const capCardWidth = (width - Spacing.lg * 2 - Spacing.md) / 2;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  gradient: {
    flex: 1,
  },
  /* Top Bar */
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.xxxl + Spacing.sm,
    paddingBottom: Spacing.md,
    backgroundColor: Colors.background,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
    zIndex: 10,
  },
  topBarLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  brandName: {
    fontSize: FontSizes.xl,
    fontWeight: '800',
    color: Colors.text,
    letterSpacing: 3,
  },
  aiChip: {
    backgroundColor: Colors.primary,
    borderRadius: BorderRadius.sm,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  aiChipText: {
    fontSize: FontSizes.xs,
    fontWeight: '800',
    color: Colors.background,
    letterSpacing: 1,
  },
  topBarRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.full,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 4,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  onlineDot: {
    width: 7,
    height: 7,
    borderRadius: 3.5,
    backgroundColor: Colors.success,
    shadowColor: Colors.success,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 4,
    elevation: 3,
  },
  onlineText: {
    fontSize: FontSizes.xs,
    color: Colors.success,
    fontWeight: '600',
  },
  settingsBtn: {
    padding: 4,
  },
  /* Scroll content */
  scrollContent: {
    paddingBottom: Spacing.xxxl + Spacing.lg,
  },
  /* Hero Section */
  heroSection: {
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.xl,
    paddingBottom: Spacing.md,
    alignItems: 'center',
  },
  greetingText: {
    fontSize: FontSizes.lg,
    color: Colors.textSecondary,
    fontWeight: '500',
    marginBottom: Spacing.xs,
  },
  dynamicText: {
    fontSize: FontSizes.xxxl,
    fontWeight: '700',
    color: Colors.text,
    textAlign: 'center',
    letterSpacing: -0.5,
  },
  wakeWordHint: {
    fontSize: FontSizes.sm,
    color: Colors.textTertiary,
    marginTop: Spacing.sm,
  },
  /* Orb Section */
  orbSection: {
    alignItems: 'center',
    paddingVertical: Spacing.lg,
  },
  micButtonWrapper: {
    marginTop: Spacing.lg,
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.5,
    shadowRadius: 16,
    elevation: 8,
  },
  micGradient: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  listeningText: {
    fontSize: FontSizes.lg,
    fontWeight: '600',
    color: Colors.text,
    marginTop: Spacing.md,
  },
  /* Quick Commands */
  quickCommandsSection: {
    paddingLeft: Spacing.lg,
    marginBottom: Spacing.xl,
  },
  sectionTitle: {
    fontSize: FontSizes.xl,
    fontWeight: '700',
    color: Colors.text,
    marginBottom: Spacing.md,
    paddingRight: Spacing.lg,
  },
  quickCommandsScroll: {
    paddingRight: Spacing.lg,
    gap: Spacing.sm,
    flexDirection: 'row',
  },
  commandChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.full,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  commandChipText: {
    fontSize: FontSizes.sm,
    color: Colors.text,
    fontWeight: '500',
  },
  /* Capabilities */
  capabilitiesSection: {
    paddingHorizontal: Spacing.lg,
    marginBottom: Spacing.xl,
  },
  capGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.md,
  },
  capCard: {
    width: capCardWidth,
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.lg,
    padding: Spacing.lg,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  capIconContainer: {
    width: 48,
    height: 48,
    borderRadius: BorderRadius.md,
    backgroundColor: Colors.backgroundTertiary,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.sm,
    borderWidth: 1,
  },
  capTitle: {
    fontSize: FontSizes.md,
    fontWeight: '600',
    color: Colors.text,
    marginBottom: 4,
  },
  capDesc: {
    fontSize: FontSizes.xs,
    color: Colors.textTertiary,
    lineHeight: 16,
  },
  /* AI Status */
  aiStatusSection: {
    paddingHorizontal: Spacing.lg,
    marginBottom: Spacing.md,
  },
  aiStatusCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.lg,
    padding: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.border,
    gap: Spacing.md,
  },
  aiStatusLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    flex: 1,
  },
  aiStatusIconWrap: {
    width: 36,
    height: 36,
    borderRadius: BorderRadius.sm,
    backgroundColor: Colors.backgroundTertiary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  aiStatusLabel: {
    fontSize: FontSizes.xs,
    color: Colors.textTertiary,
  },
  aiStatusValue: {
    fontSize: FontSizes.sm,
    color: Colors.text,
    fontWeight: '600',
  },
  aiStatusDivider: {
    width: 1,
    height: 32,
    backgroundColor: Colors.border,
  },
  aiStatusStat: {
    alignItems: 'center',
    minWidth: 40,
  },
  aiStatNumber: {
    fontSize: FontSizes.lg,
    fontWeight: '700',
    color: Colors.primary,
  },
  aiStatLabel: {
    fontSize: FontSizes.xs,
    color: Colors.textTertiary,
  },
});
