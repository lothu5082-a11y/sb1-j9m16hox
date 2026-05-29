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
import Animated, {
  FadeInUp,
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated';
import {
  Mic,
  MessageSquare,
  Bell,
  Cpu,
  Settings,
  ClipboardList,
  Zap,
  Shield,
  Activity,
  Bot,
  Youtube,
  CloudSun,
  BatteryMedium,
  HelpCircle,
} from 'lucide-react-native';
import { router } from 'expo-router';
import { Colors, Spacing, FontSizes, BorderRadius } from '../../constants/theme';
import VoiceOrb from '../../components/VoiceOrb';
import { setPendingCommand } from './chat';

const { width } = Dimensions.get('window');

const DYNAMIC_TEXTS = ['Monitoring device', 'Brain is offline', 'Standing by'];

const quickCommands = [
  { label: 'Parse notifications', icon: Bell },
  { label: 'Analyze clipboard', icon: ClipboardList },
  { label: 'Draft quick reply', icon: MessageSquare },
  { label: 'Run automation', icon: Zap },
  { label: 'System status', icon: Activity },
  { label: 'Privacy audit', icon: Shield },
];

// Quick action chips — navigate to chat with a pre-filled command
const quickActions = [
  { label: 'YouTube', icon: Youtube, command: 'Open YouTube', color: '#FF0000' },
  { label: 'Weather', icon: CloudSun, command: 'Weather in London', color: Colors.primary },
  { label: 'Battery', icon: BatteryMedium, command: 'Battery', color: Colors.secondary },
  { label: 'Help', icon: HelpCircle, command: 'What can you do?', color: Colors.accent },
];

const capabilityCards = [
  {
    title: 'Command',
    description: 'Query the on-device brain directly',
    Icon: MessageSquare,
    color: Colors.primary,
    route: '/chat',
  },
  {
    title: 'Sensors',
    description: 'Live notification & clipboard feed',
    Icon: Bell,
    color: Colors.secondary,
    route: '/sensors',
  },
  {
    title: 'Automation',
    description: 'Cross-app workflow execution',
    Icon: Zap,
    color: Colors.accent,
    route: '/automation',
  },
  {
    title: 'Voice AI',
    description: 'Hands-free cybernetic control',
    Icon: Mic,
    color: Colors.primary,
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

function PulseNode({ active }: { active: boolean }) {
  const scale = useSharedValue(1);
  const opacity = useSharedValue(0.6);

  useEffect(() => {
    if (active) {
      scale.value = withRepeat(
        withSequence(withTiming(1.4, { duration: 700 }), withTiming(1, { duration: 700 })),
        -1,
        false
      );
      opacity.value = withRepeat(
        withSequence(withTiming(1, { duration: 700 }), withTiming(0.4, { duration: 700 })),
        -1,
        false
      );
    } else {
      scale.value = withTiming(1);
      opacity.value = withTiming(0.6);
    }
  }, [active]);

  const animStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
    opacity: opacity.value,
  }));

  return (
    <View style={pulseStyles.wrapper}>
      <Animated.View
        style={[
          pulseStyles.ring,
          { borderColor: active ? Colors.primary : Colors.border },
          animStyle,
        ]}
      />
      <View
        style={[
          pulseStyles.core,
          { backgroundColor: active ? Colors.primary : Colors.textTertiary },
        ]}
      />
    </View>
  );
}

const pulseStyles = StyleSheet.create({
  wrapper: { width: 24, height: 24, alignItems: 'center', justifyContent: 'center' },
  ring: {
    position: 'absolute',
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 1.5,
  },
  core: { width: 10, height: 10, borderRadius: 5 },
});

const formatClock = (d: Date) =>
  d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });

const formatDate = (d: Date) =>
  d.toLocaleDateString([], { weekday: 'long', month: 'short', day: 'numeric' });

// Global session start time for uptime tracking
const SESSION_START = Date.now();

const formatUptime = () => {
  const secs = Math.floor((Date.now() - SESSION_START) / 1000);
  if (secs < 60) return `${secs}s`;
  const mins = Math.floor(secs / 60);
  if (mins < 60) return `${mins}m`;
  return `${Math.floor(mins / 60)}h ${mins % 60}m`;
};

export default function HomeScreen() {
  const [isListening, setIsListening] = useState(false);
  const [dynamicTextIndex, setDynamicTextIndex] = useState(0);
  const [clockTime, setClockTime] = useState(new Date());
  const [uptime, setUptime] = useState('0s');
  const [sessionCount] = useState(Math.floor(Math.random() * 8) + 1);
  const [commandCount, setCommandCount] = useState(Math.floor(Math.random() * 30) + 5);
  const fadeAnim = useRef(new RNAnimated.Value(1)).current;

  const toggleListening = () => setIsListening((prev) => !prev);

  // Live clock + uptime ticker
  useEffect(() => {
    const clockInterval = setInterval(() => {
      setClockTime(new Date());
      setUptime(formatUptime());
    }, 1000);
    return () => clearInterval(clockInterval);
  }, []);

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
            <Bot color={Colors.primary} size={22} />
            <Text style={styles.brandName}>RIUKA</Text>
            <View style={styles.aiChip}>
              <Text style={styles.aiChipText}>AI</Text>
            </View>
          </View>
          <View style={styles.topBarRight}>
            <View style={styles.statusBadge}>
              <PulseNode active />
              <Text style={styles.onlineText}>On-Device</Text>
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
            <Text style={styles.wakeWordHint}>Say "Hey Riuka" to activate</Text>
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
                  color={isListening ? '#ffffff' : Colors.primary}
                  size={28}
                />
              </LinearGradient>
            </TouchableOpacity>
            <Text style={styles.listeningText}>
              {isListening ? 'Brain processing...' : 'Tap to speak'}
            </Text>
          </Animated.View>

          {/* Quick Action Chips — navigate to chat + auto-send command */}
          <Animated.View
            entering={FadeInUp.duration(800).delay(350)}
            style={styles.quickActionsSection}
          >
            <Text style={styles.sectionTitle}>Quick Actions</Text>
            <View style={styles.quickActionsRow}>
              {quickActions.map((action, index) => {
                const IconComp = action.icon;
                return (
                  <TouchableOpacity
                    key={index}
                    activeOpacity={0.75}
                    style={[styles.quickActionChip, { borderColor: action.color + '40', backgroundColor: action.color + '12' }]}
                    onPress={() => {
                      setPendingCommand(action.command);
                      router.push('/chat' as any);
                    }}
                  >
                    <IconComp color={action.color} size={18} />
                    <Text style={[styles.quickActionLabel, { color: action.color }]}>{action.label}</Text>
                  </TouchableOpacity>
                );
              })}
            </View>
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
                    onPress={() => router.push('/chat' as any)}
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
            <Text style={styles.sectionTitle}>Core Systems</Text>
            <View style={styles.capGrid}>
              {capabilityCards.map((card, index) => {
                const IconComp = card.Icon;
                return (
                  <TouchableOpacity
                    key={index}
                    activeOpacity={0.8}
                    style={[styles.capCard, { borderColor: card.color + '22' }]}
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
                        { borderColor: card.color + '40', backgroundColor: card.color + '12' },
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
                  <Cpu color={Colors.primary} size={18} />
                </View>
                <View>
                  <Text style={styles.aiStatusLabel}>Brain Engine</Text>
                  <Text style={styles.aiStatusValue}>On-Device · Offline</Text>
                </View>
              </View>
              <View style={styles.aiStatusDivider} />
              <View style={styles.aiStatusStat}>
                <Text style={[styles.aiStatNumber, { color: Colors.secondary }]}>0ms</Text>
                <Text style={styles.aiStatLabel}>Latency</Text>
              </View>
              <View style={styles.aiStatusDivider} />
              <View style={styles.aiStatusStat}>
                <Text style={[styles.aiStatNumber, { color: Colors.primary }]}>100%</Text>
                <Text style={styles.aiStatLabel}>Private</Text>
              </View>
            </View>
          </Animated.View>

          {/* Session Stats Cards */}
          <Animated.View
            entering={FadeInUp.duration(800).delay(750)}
            style={styles.statsSection}
          >
            <Text style={styles.sectionTitle}>Session Stats</Text>
            <View style={styles.statsRow}>
              <View style={[styles.statCard, { borderColor: Colors.primary + '30' }]}>
                <Text style={[styles.statValue, { color: Colors.primary }]}>{sessionCount}</Text>
                <Text style={styles.statLabel}>Sessions</Text>
              </View>
              <View style={[styles.statCard, { borderColor: Colors.secondary + '30' }]}>
                <Text style={[styles.statValue, { color: Colors.secondary }]}>{commandCount}</Text>
                <Text style={styles.statLabel}>Commands Run</Text>
              </View>
              <View style={[styles.statCard, { borderColor: Colors.accent + '30' }]}>
                <Text style={[styles.statValue, { color: Colors.accent }]}>{uptime}</Text>
                <Text style={styles.statLabel}>Uptime</Text>
              </View>
            </View>
          </Animated.View>

          {/* Live Clock */}
          <Animated.View
            entering={FadeInUp.duration(800).delay(760)}
            style={styles.clockSection}
          >
            <View style={styles.clockCard}>
              <Text style={styles.clockTime}>{formatClock(clockTime)}</Text>
              <Text style={styles.clockDate}>{formatDate(clockTime)}</Text>
            </View>
          </Animated.View>

          {/* Three Layer Status */}
          <Animated.View
            entering={FadeInUp.duration(800).delay(800)}
            style={styles.layerStatusSection}
          >
            <Text style={styles.sectionTitle}>System Layers</Text>
            {[
              { label: 'Sensors', desc: 'Notification · Clipboard · Context', active: true, color: Colors.secondary },
              { label: 'Brain', desc: 'Local LLM · Zero cloud dependency', active: true, color: Colors.primary },
              { label: 'Hands', desc: 'Accessibility · Interface Pilot', active: false, color: Colors.accent },
            ].map((layer, i) => (
              <View key={i} style={styles.layerRow}>
                <View style={[styles.layerDot, { backgroundColor: layer.active ? layer.color : Colors.border }]} />
                <View style={styles.layerText}>
                  <Text style={[styles.layerLabel, { color: layer.active ? layer.color : Colors.textTertiary }]}>
                    {layer.label}
                  </Text>
                  <Text style={styles.layerDesc}>{layer.desc}</Text>
                </View>
                <View style={[styles.layerBadge, { borderColor: layer.active ? layer.color + '40' : Colors.border }]}>
                  <Text style={[styles.layerBadgeText, { color: layer.active ? layer.color : Colors.textTertiary }]}>
                    {layer.active ? 'ONLINE' : 'STANDBY'}
                  </Text>
                </View>
              </View>
            ))}
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
    letterSpacing: 4,
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
    color: '#ffffff',
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
    gap: 6,
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.full,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 4,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  onlineText: {
    fontSize: FontSizes.xs,
    color: Colors.primary,
    fontWeight: '600',
  },
  settingsBtn: {
    padding: 4,
  },
  scrollContent: {
    paddingBottom: Spacing.xxxl + Spacing.lg,
  },
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
    letterSpacing: 0.3,
  },
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
  aiStatusSection: {
    paddingHorizontal: Spacing.lg,
    marginBottom: Spacing.xl,
  },
  aiStatusCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.lg,
    padding: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.primary + '30',
    gap: Spacing.md,
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.15,
    shadowRadius: 10,
    elevation: 4,
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
    backgroundColor: Colors.primary + '18',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: Colors.primary + '30',
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
    minWidth: 44,
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
  layerStatusSection: {
    paddingHorizontal: Spacing.lg,
    marginBottom: Spacing.md,
  },
  layerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    marginBottom: Spacing.sm,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  layerDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  layerText: { flex: 1 },
  layerLabel: {
    fontSize: FontSizes.sm,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  layerDesc: {
    fontSize: FontSizes.xs,
    color: Colors.textTertiary,
    marginTop: 1,
  },
  layerBadge: {
    borderRadius: BorderRadius.full,
    borderWidth: 1,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 3,
  },
  layerBadgeText: {
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 0.5,
  },

  // Quick Action Chips
  quickActionsSection: {
    paddingHorizontal: Spacing.lg,
    marginBottom: Spacing.xl,
  },
  quickActionsRow: {
    flexDirection: 'row',
    gap: Spacing.sm,
    flexWrap: 'wrap',
  },
  quickActionChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    borderRadius: BorderRadius.full,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm + 2,
    borderWidth: 1,
    minWidth: (width - Spacing.lg * 2 - Spacing.sm * 3) / 4,
    justifyContent: 'center',
  },
  quickActionLabel: {
    fontSize: FontSizes.xs,
    fontWeight: '700',
    letterSpacing: 0.2,
  },

  // Session Stats
  statsSection: {
    paddingHorizontal: Spacing.lg,
    marginBottom: Spacing.xl,
  },
  statsRow: {
    flexDirection: 'row',
    gap: Spacing.sm,
  },
  statCard: {
    flex: 1,
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.border,
  },
  statValue: {
    fontSize: FontSizes.xl,
    fontWeight: '800',
  },
  statLabel: {
    fontSize: 9,
    color: Colors.textTertiary,
    marginTop: 2,
    textAlign: 'center',
    fontWeight: '500',
  },

  // Live Clock
  clockSection: {
    paddingHorizontal: Spacing.lg,
    marginBottom: Spacing.xl,
  },
  clockCard: {
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.lg,
    padding: Spacing.lg,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.primary + '20',
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 3,
  },
  clockTime: {
    fontSize: 36,
    fontWeight: '800',
    color: Colors.text,
    letterSpacing: 2,
    fontVariant: ['tabular-nums'] as any,
  },
  clockDate: {
    fontSize: FontSizes.sm,
    color: Colors.textTertiary,
    marginTop: 4,
    fontWeight: '500',
  },
});
