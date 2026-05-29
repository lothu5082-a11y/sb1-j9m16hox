import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Dimensions,
  Animated as RNAnimated,
  Platform,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, {
  FadeInUp,
  FadeInDown,
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withSequence,
  withTiming,
  withSpring,
} from 'react-native-reanimated';
import {
  Mic, MessageSquare, Bell, Cpu, Settings, Zap,
  Bot, Youtube, CloudSun, Compass, Clock, Lock,
  List, Key, QrCode, Timer, TrendingUp,
} from 'lucide-react-native';
import { router } from 'expo-router';
import { Colors, Spacing, FontSizes, BorderRadius } from '../../constants/theme';
import { setPendingCommand } from './chat';

const { width } = Dimensions.get('window');
const CARD_WIDTH = (width - Spacing.lg * 2 - Spacing.sm) / 2;

function getGreeting(): string {
  const h = new Date().getHours();
  if (h < 5) return 'Night Owl 🦉';
  if (h < 12) return 'Good Morning ☀️';
  if (h < 17) return 'Good Afternoon 👋';
  if (h < 21) return 'Good Evening 🌆';
  return 'Good Night 🌙';
}

const SESSION_START = Date.now();
const formatUptime = () => {
  const s = Math.floor((Date.now() - SESSION_START) / 1000);
  if (s < 60) return `${s}s`;
  const m = Math.floor(s / 60);
  return m < 60 ? `${m}m` : `${Math.floor(m / 60)}h ${m % 60}m`;
};

// ── Action cards (2×2 grid) ───────────────────────────────────────────────────
const ACTION_CARDS = [
  { label: 'Ask Riuka', sub: 'Chat with AI', icon: MessageSquare, gradient: ['#7C3AED', '#A855F7'], cmd: null, route: '/chat' },
  { label: 'Weather', sub: 'Live forecast', icon: CloudSun, gradient: ['#0EA5E9', '#38BDF8'], cmd: 'Weather in London', route: '/chat' },
  { label: 'My Todos', sub: 'Task list', icon: List, gradient: ['#10B981', '#34D399'], cmd: 'My todos', route: '/chat' },
  { label: 'World Clock', sub: 'Time in cities', icon: Clock, gradient: ['#F59E0B', '#FCD34D'], cmd: 'Time in Tokyo', route: '/chat' },
];

// ── Quick command pills ────────────────────────────────────────────────────────
const QUICK_CMDS = [
  { label: '🎲 Roll dice', cmd: 'Roll dice' },
  { label: '🔐 Password', cmd: 'Password 16' },
  { label: '📰 News', cmd: 'News' },
  { label: '🍅 Pomodoro', cmd: 'Pomodoro' },
  { label: '🎧 Lofi', cmd: 'Lofi' },
  { label: '💡 Inspire me', cmd: 'Inspire me' },
  { label: '🧩 Riddle', cmd: 'Riddle' },
  { label: '😂 Joke', cmd: 'Tell me a joke' },
  { label: '🎱 8 Ball', cmd: '8 ball will today be great' },
  { label: '💰 Tip 20 on 50', cmd: 'Tip 20 on 50' },
  { label: '🪙 Flip coin', cmd: 'Flip a coin' },
  { label: '🧘 Breathe', cmd: 'Breathe' },
  { label: '📋 Read clipboard', cmd: 'Read clipboard' },
  { label: '🆔 UUID', cmd: 'UUID' },
  { label: '⭐ Horoscope', cmd: 'Horoscope' },
];

// ── Animated status dot ───────────────────────────────────────────────────────
function LiveDot({ color = Colors.secondary }: { color?: string }) {
  const s = useSharedValue(1);
  useEffect(() => {
    s.value = withRepeat(withSequence(withTiming(1.6, { duration: 700 }), withTiming(1, { duration: 700 })), -1, false);
  }, []);
  const style = useAnimatedStyle(() => ({ transform: [{ scale: s.value }] }));
  return (
    <View style={{ width: 10, height: 10, alignItems: 'center', justifyContent: 'center' }}>
      <Animated.View style={[{ width: 8, height: 8, borderRadius: 4, backgroundColor: color }, style]} />
    </View>
  );
}

export default function HomeScreen() {
  const [clockTime, setClockTime] = useState(new Date());
  const [uptime, setUptime] = useState('0s');
  const [todoCount, setTodoCount] = useState(0);
  const [profileName, setProfileName] = useState('');
  const fadeAnim = useRef(new RNAnimated.Value(1)).current;

  useEffect(() => {
    const t = setInterval(() => { setClockTime(new Date()); setUptime(formatUptime()); }, 1000);
    return () => clearInterval(t);
  }, []);

  useEffect(() => {
    if (Platform.OS === 'web') {
      try {
        const todos = JSON.parse(localStorage.getItem('riuka_todos_v1') || '[]');
        setTodoCount(todos.length);
        const p = JSON.parse(localStorage.getItem('riuka_profile_v1') || '{}');
        if (p.name) setProfileName(p.name);
      } catch {}
    }
  }, []);

  const sendCmd = (cmd: string | null, route: string) => {
    if (cmd) setPendingCommand(cmd);
    router.push(route as any);
  };

  return (
    <View style={s.container}>
      {/* Full-screen gradient background */}
      <LinearGradient colors={['#0A0A0C', '#120A1A', '#0A0A0C']} style={StyleSheet.absoluteFill} />

      {/* Top bar */}
      <View style={s.topBar}>
        <View style={s.topLeft}>
          <Bot color={Colors.primary} size={22} />
          <Text style={s.brand}>RIUKA</Text>
          <View style={s.aiPill}><Text style={s.aiPillText}>AI</Text></View>
        </View>
        <View style={s.topRight}>
          <View style={s.onlineBadge}>
            <LiveDot />
            <Text style={s.onlineText}>Online</Text>
          </View>
          <TouchableOpacity onPress={() => router.push('/settings' as any)} style={s.settingsBtn}>
            <Settings color={Colors.textSecondary} size={20} />
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={s.scroll}>

        {/* ── Hero ── */}
        <Animated.View entering={FadeInDown.duration(500)} style={s.hero}>
          <Text style={s.greeting}>{getGreeting()}{profileName ? `, ${profileName}` : ''} 👋</Text>
          <Text style={s.clockBig}>
            {clockTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          </Text>
          <Text style={s.dateLine}>
            {clockTime.toLocaleDateString([], { weekday: 'long', month: 'long', day: 'numeric' })}
          </Text>
        </Animated.View>

        {/* ── Stats strip ── */}
        <Animated.View entering={FadeInUp.duration(500).delay(100)} style={s.statsStrip}>
          {[
            { val: '70+', label: 'Commands', color: Colors.primary },
            { val: `${todoCount}`, label: 'Todos', color: Colors.secondary },
            { val: uptime, label: 'Uptime', color: Colors.accent },
            { val: '🔒', label: 'Private', color: Colors.secondary },
          ].map((item, i) => (
            <View key={i} style={s.statItem}>
              <Text style={[s.statVal, { color: item.color }]}>{item.val || '0'}</Text>
              <Text style={s.statLabel}>{item.label}</Text>
            </View>
          ))}
        </Animated.View>

        {/* ── Action Cards 2×2 ── */}
        <Animated.View entering={FadeInUp.duration(500).delay(150)} style={s.section}>
          <Text style={s.sectionTitle}>Quick Actions</Text>
          <View style={s.cardGrid}>
            {ACTION_CARDS.map((card, i) => {
              const Icon = card.icon;
              return (
                <TouchableOpacity
                  key={i}
                  activeOpacity={0.82}
                  style={s.card}
                  onPress={() => sendCmd(card.cmd, card.route)}
                >
                  <LinearGradient
                    colors={card.gradient as [string, string]}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={s.cardGradient}
                  >
                    <View style={s.cardIconWrap}>
                      <Icon color="#ffffff" size={26} />
                    </View>
                    <Text style={s.cardLabel}>{card.label}</Text>
                    <Text style={s.cardSub}>{card.sub}</Text>
                  </LinearGradient>
                </TouchableOpacity>
              );
            })}
          </View>
        </Animated.View>

        {/* ── Quick command pills ── */}
        <Animated.View entering={FadeInUp.duration(500).delay(250)} style={s.pillsSection}>
          <Text style={s.sectionTitle}>Try These</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.pillsRow}>
            {QUICK_CMDS.map((c, i) => (
              <TouchableOpacity
                key={i}
                style={s.pill}
                activeOpacity={0.75}
                onPress={() => sendCmd(c.cmd, '/chat')}
              >
                <Text style={s.pillText}>{c.label}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </Animated.View>

        {/* ── AI Status card ── */}
        <Animated.View entering={FadeInUp.duration(500).delay(300)} style={s.section}>
          <Text style={s.sectionTitle}>System</Text>
          <View style={s.statusCard}>
            <LinearGradient
              colors={['rgba(168,85,247,0.12)', 'rgba(168,85,247,0.04)']}
              style={s.statusCardInner}
            >
              <View style={s.statusRow}>
                <View style={s.statusIconWrap}><Cpu color={Colors.primary} size={18} /></View>
                <View style={s.statusInfo}>
                  <Text style={s.statusTitle}>Riuka Brain</Text>
                  <Text style={s.statusSub}>On-Device · Ready</Text>
                </View>
                <View style={s.statusPill}>
                  <LiveDot color={Colors.secondary} />
                  <Text style={s.statusPillText}>ACTIVE</Text>
                </View>
              </View>
              <View style={s.divider} />
              <View style={s.statusRow}>
                <View style={[s.statusIconWrap, { backgroundColor: Colors.secondary + '18', borderColor: Colors.secondary + '30' }]}>
                  <Bell color={Colors.secondary} size={18} />
                </View>
                <View style={s.statusInfo}>
                  <Text style={s.statusTitle}>Sensors</Text>
                  <Text style={s.statusSub}>Notifications · Clipboard</Text>
                </View>
                <View style={[s.statusPill, { borderColor: Colors.secondary + '40' }]}>
                  <LiveDot color={Colors.secondary} />
                  <Text style={[s.statusPillText, { color: Colors.secondary }]}>READY</Text>
                </View>
              </View>
              <View style={s.divider} />
              <View style={s.statusRow}>
                <View style={[s.statusIconWrap, { backgroundColor: Colors.accent + '18', borderColor: Colors.accent + '30' }]}>
                  <Zap color={Colors.accent} size={18} />
                </View>
                <View style={s.statusInfo}>
                  <Text style={s.statusTitle}>Automation</Text>
                  <Text style={s.statusSub}>3 workflows loaded</Text>
                </View>
                <View style={[s.statusPill, { borderColor: Colors.accent + '40' }]}>
                  <LiveDot color={Colors.accent} />
                  <Text style={[s.statusPillText, { color: Colors.accent }]}>LOADED</Text>
                </View>
              </View>
            </LinearGradient>
          </View>
        </Animated.View>

        {/* ── Privacy badge ── */}
        <Animated.View entering={FadeInUp.duration(500).delay(400)} style={s.privacySection}>
          <LinearGradient
            colors={['rgba(16,185,129,0.08)', 'rgba(16,185,129,0.02)']}
            style={s.privacyCard}
          >
            <Lock color={Colors.secondary} size={16} />
            <Text style={s.privacyText}>All data stays on your device. Zero cloud. Zero tracking.</Text>
          </LinearGradient>
        </Animated.View>

      </ScrollView>
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  topBar: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: Spacing.lg, paddingTop: Spacing.xxxl + Spacing.sm,
    paddingBottom: Spacing.md, borderBottomWidth: 1, borderBottomColor: Colors.border, zIndex: 10,
  },
  topLeft: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  brand: { fontSize: FontSizes.xl, fontWeight: '800', color: Colors.text, letterSpacing: 4 },
  aiPill: { backgroundColor: Colors.primary, borderRadius: 6, paddingHorizontal: 7, paddingVertical: 2 },
  aiPillText: { fontSize: FontSizes.xs, fontWeight: '800', color: '#fff', letterSpacing: 1 },
  topRight: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md },
  onlineBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    backgroundColor: Colors.secondary + '15', borderRadius: BorderRadius.full,
    paddingHorizontal: 10, paddingVertical: 5,
    borderWidth: 1, borderColor: Colors.secondary + '30',
  },
  onlineText: { fontSize: FontSizes.xs, color: Colors.secondary, fontWeight: '600' },
  settingsBtn: { padding: 4 },
  scroll: { paddingBottom: 100 },

  // Hero
  hero: { alignItems: 'center', paddingTop: Spacing.xl, paddingBottom: Spacing.lg, paddingHorizontal: Spacing.lg },
  greeting: { fontSize: FontSizes.md, color: Colors.textSecondary, fontWeight: '500', marginBottom: Spacing.xs },
  clockBig: {
    fontSize: 52, fontWeight: '800', color: Colors.text, letterSpacing: 2,
    fontVariant: ['tabular-nums'] as any,
  },
  dateLine: { fontSize: FontSizes.sm, color: Colors.textTertiary, marginTop: 4, fontWeight: '500' },

  // Stats strip
  statsStrip: {
    flexDirection: 'row', marginHorizontal: Spacing.lg, marginBottom: Spacing.xl,
    backgroundColor: Colors.surface, borderRadius: BorderRadius.lg, borderWidth: 1,
    borderColor: Colors.border, overflow: 'hidden',
  },
  statItem: { flex: 1, alignItems: 'center', paddingVertical: Spacing.md },
  statVal: { fontSize: FontSizes.xl, fontWeight: '800' },
  statLabel: { fontSize: 9, color: Colors.textTertiary, fontWeight: '600', marginTop: 2, letterSpacing: 0.3 },

  // Cards
  section: { paddingHorizontal: Spacing.lg, marginBottom: Spacing.xl },
  sectionTitle: { fontSize: FontSizes.lg, fontWeight: '700', color: Colors.text, marginBottom: Spacing.md },
  cardGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm },
  card: {
    width: CARD_WIDTH, borderRadius: BorderRadius.xl, overflow: 'hidden',
    shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8, elevation: 6,
  },
  cardGradient: { padding: Spacing.lg, minHeight: 130, justifyContent: 'space-between' },
  cardIconWrap: {
    width: 44, height: 44, borderRadius: BorderRadius.md,
    backgroundColor: 'rgba(255,255,255,0.2)', alignItems: 'center', justifyContent: 'center',
    marginBottom: Spacing.sm,
  },
  cardLabel: { fontSize: FontSizes.md, fontWeight: '700', color: '#fff' },
  cardSub: { fontSize: FontSizes.xs, color: 'rgba(255,255,255,0.75)', marginTop: 2 },

  // Pills
  pillsSection: { marginBottom: Spacing.xl },
  pillsRow: { paddingHorizontal: Spacing.lg, gap: Spacing.sm, flexDirection: 'row' },
  pill: {
    backgroundColor: Colors.surface, borderRadius: BorderRadius.full,
    paddingHorizontal: Spacing.md, paddingVertical: Spacing.sm,
    borderWidth: 1, borderColor: Colors.border,
  },
  pillText: { fontSize: FontSizes.sm, color: Colors.text, fontWeight: '500' },

  // Status card
  statusCard: { borderRadius: BorderRadius.xl, overflow: 'hidden', borderWidth: 1, borderColor: Colors.primary + '25' },
  statusCardInner: { padding: Spacing.lg },
  statusRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md, paddingVertical: 4 },
  statusIconWrap: {
    width: 36, height: 36, borderRadius: BorderRadius.sm,
    backgroundColor: Colors.primary + '18', alignItems: 'center', justifyContent: 'center',
    borderWidth: 1, borderColor: Colors.primary + '30',
  },
  statusInfo: { flex: 1 },
  statusTitle: { fontSize: FontSizes.sm, fontWeight: '600', color: Colors.text },
  statusSub: { fontSize: FontSizes.xs, color: Colors.textTertiary, marginTop: 1 },
  statusPill: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    borderRadius: BorderRadius.full, borderWidth: 1, borderColor: Colors.primary + '40',
    paddingHorizontal: 8, paddingVertical: 4,
  },
  statusPillText: { fontSize: 9, fontWeight: '800', color: Colors.primary, letterSpacing: 0.5 },
  divider: { height: 1, backgroundColor: Colors.border, marginVertical: Spacing.sm },

  // Privacy
  privacySection: { paddingHorizontal: Spacing.lg, marginBottom: Spacing.md },
  privacyCard: {
    flexDirection: 'row', alignItems: 'center', gap: Spacing.sm,
    borderRadius: BorderRadius.lg, padding: Spacing.md,
    borderWidth: 1, borderColor: Colors.secondary + '25',
  },
  privacyText: { fontSize: FontSizes.xs, color: Colors.textSecondary, flex: 1, lineHeight: 18 },
});
