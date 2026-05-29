import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Dimensions,
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
  Easing,
  interpolateColor,
} from 'react-native-reanimated';
import {
  MessageSquare, Bell, Cpu, Settings, Zap,
  Bot, CloudSun, Clock, Lock, List,
} from 'lucide-react-native';
import { router } from 'expo-router';
import { Colors, Spacing, FontSizes, BorderRadius } from '../../constants/theme';
import { setPendingCommand } from './chat';

const { width } = Dimensions.get('window');
const CARD_WIDTH = (width - Spacing.lg * 2 - Spacing.sm) / 2;

const GEMINI = ['#A855F7', '#3B82F6', '#10B981', '#EC4899', '#A855F7'];

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

const EVO_LEVELS = [
  { level: 1, name: 'Newborn', xp: 0, icon: '🥚' },
  { level: 2, name: 'Aware', xp: 40, icon: '👁️' },
  { level: 3, name: 'Adaptive', xp: 120, icon: '🧠' },
  { level: 4, name: 'Intelligent', xp: 280, icon: '⚡' },
  { level: 5, name: 'Sentient', xp: 550, icon: '🌐' },
  { level: 6, name: 'Evolved', xp: 1000, icon: '🔮' },
  { level: 7, name: 'Atomic', xp: 2000, icon: '⚛️' },
];

function getEvoLevel(xp: number) {
  let cur = EVO_LEVELS[0];
  for (const l of EVO_LEVELS) { if (xp >= l.xp) cur = l; }
  return cur;
}

// ── Gemini color-cycling text ─────────────────────────────────────────────────
function GeminiText({ text, style }: { text: string; style?: any }) {
  const phase = useSharedValue(0);
  useEffect(() => {
    phase.value = withRepeat(withTiming(1, { duration: 4000, easing: Easing.linear }), -1, false);
  }, []);
  const aStyle = useAnimatedStyle(() => ({
    color: interpolateColor(phase.value, [0, 0.25, 0.5, 0.75, 1], GEMINI),
  }));
  return <Animated.Text style={[style, aStyle]}>{text}</Animated.Text>;
}

// ── Pulsing live dot ──────────────────────────────────────────────────────────
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

// ── Color-cycling card border ─────────────────────────────────────────────────
function GlowCard({ children, style }: { children: React.ReactNode; style?: any }) {
  const phase = useSharedValue(0);
  useEffect(() => {
    phase.value = withRepeat(withTiming(1, { duration: 6000, easing: Easing.linear }), -1, false);
  }, []);
  const aStyle = useAnimatedStyle(() => ({
    borderColor: interpolateColor(phase.value, [0, 0.25, 0.5, 0.75, 1],
      ['rgba(168,85,247,0.35)', 'rgba(59,130,246,0.35)', 'rgba(16,185,129,0.35)', 'rgba(236,72,153,0.35)', 'rgba(168,85,247,0.35)']
    ),
  }));
  return <Animated.View style={[st.glowCard, style, aStyle]}>{children}</Animated.View>;
}

// ── Action cards ──────────────────────────────────────────────────────────────
const ACTION_CARDS = [
  { label: 'Ask Riuka', sub: 'Chat with AI', icon: MessageSquare, gradient: ['#7C3AED', '#A855F7'], cmd: null, route: '/chat' },
  { label: 'Weather', sub: 'Live forecast', icon: CloudSun, gradient: ['#0EA5E9', '#38BDF8'], cmd: 'Weather in London', route: '/chat' },
  { label: 'My Todos', sub: 'Task list', icon: List, gradient: ['#10B981', '#34D399'], cmd: 'My todos', route: '/chat' },
  { label: 'World Clock', sub: 'Time in cities', icon: Clock, gradient: ['#F59E0B', '#FCD34D'], cmd: 'Time in Tokyo', route: '/chat' },
];

// ── Quick command pills ────────────────────────────────────────────────────────
const QUICK_CMDS = [
  { label: '🎲 Roll dice', cmd: 'Roll dice' },
  { label: '🔐 Password 16', cmd: 'Password 16' },
  { label: '📰 News', cmd: 'News' },
  { label: '🍅 Pomodoro', cmd: 'Pomodoro' },
  { label: '💡 Inspire me', cmd: 'Inspire me' },
  { label: '🧩 Riddle', cmd: 'Riddle' },
  { label: '😂 Joke', cmd: 'Tell me a joke' },
  { label: '🎱 8 Ball', cmd: '8 ball will today be great' },
  { label: '💰 Tip 20% on $50', cmd: 'Tip 20 on 50' },
  { label: '🪙 Flip coin', cmd: 'Flip a coin' },
  { label: '🧘 Breathe', cmd: 'Breathe' },
  { label: '📋 Read clipboard', cmd: 'Read clipboard' },
  { label: '🆔 UUID', cmd: 'UUID' },
  { label: '⭐ Horoscope', cmd: 'Horoscope' },
  { label: '✍️ Draft email', cmd: 'Draft email to my boss about taking tomorrow off' },
  { label: '📝 Summarize', cmd: 'Summarize: paste your text here' },
  { label: '🔥 Pros & Cons', cmd: 'Pros and cons of remote work' },
  { label: '🐍 Python code', cmd: 'Write a Python function to sort a list of dicts by a key' },
  { label: '📊 Compare', cmd: 'Compare React vs Vue' },
  { label: '🧮 Math', cmd: 'What is 15% of 320?' },
  { label: '🌐 Translate', cmd: 'Translate "Hello how are you" to Spanish, French, Japanese' },
  { label: '🎤 Write tweet', cmd: 'Write a tweet about the power of AI assistants' },
  { label: '📖 Memory', cmd: '/memory' },
  { label: '⚛️ Evolve', cmd: '/evolve' },
];

export default function HomeScreen() {
  const [clockTime, setClockTime] = useState(new Date());
  const [uptime, setUptime] = useState('0s');
  const [todoCount, setTodoCount] = useState(0);
  const [profileName, setProfileName] = useState('');
  const [evo, setEvo] = useState({ xp: 0, level: EVO_LEVELS[0], memCount: 0 });

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
        const ev = JSON.parse(localStorage.getItem('riuka_evolution_v1') || '{"xp":0,"level":1}');
        const mem = JSON.parse(localStorage.getItem('riuka_memory_v1') || '[]');
        setEvo({ xp: ev.xp || 0, level: getEvoLevel(ev.xp || 0), memCount: Array.isArray(mem) ? mem.length : 0 });
      } catch {}
    }
  }, []);

  const sendCmd = (cmd: string | null, route: string) => {
    if (cmd) setPendingCommand(cmd);
    router.push(route as any);
  };

  return (
    <View style={st.container}>
      <LinearGradient colors={['#0A0A0C', '#120A1A', '#0A0A0C']} style={StyleSheet.absoluteFill} />

      {/* Top bar */}
      <View style={st.topBar}>
        <View style={st.topLeft}>
          <Bot color={Colors.primary} size={22} />
          <GeminiText text="RIUKA" style={st.brand} />
          <View style={st.aiPill}><Text style={st.aiPillText}>AI</Text></View>
        </View>
        <View style={st.topRight}>
          <View style={st.onlineBadge}>
            <LiveDot />
            <Text style={st.onlineText}>Online</Text>
          </View>
          <TouchableOpacity onPress={() => router.push('/settings' as any)} style={st.settingsBtn}>
            <Settings color={Colors.textSecondary} size={20} />
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={st.scroll}>

        {/* ── Hero ── */}
        <Animated.View entering={FadeInDown.duration(500)} style={st.hero}>
          <Text style={st.greeting}>{getGreeting()}{profileName ? `, ${profileName}` : ''}</Text>
          <GeminiText
            text={clockTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            style={st.clockBig}
          />
          <Text style={st.dateLine}>
            {clockTime.toLocaleDateString([], { weekday: 'long', month: 'long', day: 'numeric' })}
          </Text>
        </Animated.View>

        {/* ── Stats strip ── */}
        <Animated.View entering={FadeInUp.duration(500).delay(100)}>
          <GlowCard style={st.statsStrip}>
            {[
              { val: '70+', label: 'Commands', color: Colors.primary },
              { val: `${todoCount}`, label: 'Todos', color: Colors.secondary },
              { val: uptime, label: 'Uptime', color: Colors.accent },
              { val: evo.memCount.toString(), label: 'Memories', color: '#EC4899' },
            ].map((item, i) => (
              <View key={i} style={st.statItem}>
                <Text style={[st.statVal, { color: item.color }]}>{item.val || '0'}</Text>
                <Text style={st.statLabel}>{item.label}</Text>
              </View>
            ))}
          </GlowCard>
        </Animated.View>

        {/* ── Evolution mini-card ── */}
        <Animated.View entering={FadeInUp.duration(500).delay(140)} style={st.evoSection}>
          <TouchableOpacity activeOpacity={0.8} onPress={() => sendCmd('/evolve', '/chat')}>
            <GlowCard style={st.evoCard}>
              <LinearGradient
                colors={['rgba(168,85,247,0.10)', 'rgba(59,130,246,0.06)']}
                start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
                style={st.evoInner}
              >
                <View style={st.evoLeft}>
                  <Text style={st.evoIcon}>{evo.level.icon}</Text>
                  <View>
                    <Text style={st.evoName}>{evo.level.name}</Text>
                    <Text style={st.evoXp}>{evo.xp} XP · Level {evo.level.level}</Text>
                  </View>
                </View>
                <View style={st.evoRight}>
                  <GeminiText text="Atomic Evolution" style={st.evoTag} />
                  <View style={st.xpTrack}>
                    <View style={[st.xpFill, { width: `${Math.min((evo.xp / (EVO_LEVELS[evo.level.level - 1]?.xp || 2000 + 1)) * 100 + 5, 100)}%` as any }]} />
                  </View>
                </View>
              </LinearGradient>
            </GlowCard>
          </TouchableOpacity>
        </Animated.View>

        {/* ── Action Cards 2×2 ── */}
        <Animated.View entering={FadeInUp.duration(500).delay(160)} style={st.section}>
          <Text style={st.sectionTitle}>Quick Actions</Text>
          <View style={st.cardGrid}>
            {ACTION_CARDS.map((card, i) => {
              const Icon = card.icon;
              return (
                <TouchableOpacity key={i} activeOpacity={0.82} style={st.card}
                  onPress={() => sendCmd(card.cmd, card.route)}>
                  <LinearGradient colors={card.gradient as [string, string]}
                    start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={st.cardGradient}>
                    <View style={st.cardIconWrap}>
                      <Icon color="#ffffff" size={26} />
                    </View>
                    <Text style={st.cardLabel}>{card.label}</Text>
                    <Text style={st.cardSub}>{card.sub}</Text>
                  </LinearGradient>
                </TouchableOpacity>
              );
            })}
          </View>
        </Animated.View>

        {/* ── Quick command pills ── */}
        <Animated.View entering={FadeInUp.duration(500).delay(210)} style={st.pillsSection}>
          <Text style={[st.sectionTitle, { paddingHorizontal: Spacing.lg }]}>Try These</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={st.pillsRow}>
            {QUICK_CMDS.map((c, i) => (
              <TouchableOpacity key={i} style={st.pill} activeOpacity={0.75}
                onPress={() => sendCmd(c.cmd, '/chat')}>
                <Text style={st.pillText}>{c.label}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </Animated.View>

        {/* ── AI Status card ── */}
        <Animated.View entering={FadeInUp.duration(500).delay(260)} style={st.section}>
          <Text style={st.sectionTitle}>System Status</Text>
          <GlowCard>
            <LinearGradient
              colors={['rgba(168,85,247,0.10)', 'rgba(168,85,247,0.03)']}
              style={st.statusCardInner}
            >
              {[
                { icon: Cpu, color: Colors.primary, title: 'Riuka Brain', sub: 'On-Device · Ready', badge: 'ACTIVE', badgeColor: Colors.primary },
                { icon: Bell, color: Colors.secondary, title: 'Sensors', sub: 'Notifications · Clipboard', badge: 'READY', badgeColor: Colors.secondary },
                { icon: Zap, color: Colors.accent, title: 'Automation', sub: '3 workflows loaded', badge: 'LOADED', badgeColor: Colors.accent },
              ].map((row, i) => {
                const Icon = row.icon;
                return (
                  <View key={i}>
                    {i > 0 && <View style={st.divider} />}
                    <View style={st.statusRow}>
                      <View style={[st.statusIconWrap, { backgroundColor: row.color + '18', borderColor: row.color + '30' }]}>
                        <Icon color={row.color} size={18} />
                      </View>
                      <View style={st.statusInfo}>
                        <Text style={st.statusTitle}>{row.title}</Text>
                        <Text style={st.statusSub}>{row.sub}</Text>
                      </View>
                      <View style={[st.statusPill, { borderColor: row.badgeColor + '40' }]}>
                        <LiveDot color={row.badgeColor} />
                        <Text style={[st.statusPillText, { color: row.badgeColor }]}>{row.badge}</Text>
                      </View>
                    </View>
                  </View>
                );
              })}
            </LinearGradient>
          </GlowCard>
        </Animated.View>

        {/* ── Privacy badge ── */}
        <Animated.View entering={FadeInUp.duration(500).delay(320)} style={st.privacySection}>
          <LinearGradient
            colors={['rgba(16,185,129,0.08)', 'rgba(16,185,129,0.02)']}
            style={st.privacyCard}
          >
            <Lock color={Colors.secondary} size={16} />
            <Text style={st.privacyText}>All data stays on your device. Zero cloud. Zero tracking.</Text>
          </LinearGradient>
        </Animated.View>

      </ScrollView>
    </View>
  );
}

const st = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  topBar: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: Spacing.lg, paddingTop: Spacing.xxxl + Spacing.sm,
    paddingBottom: Spacing.md, borderBottomWidth: 1, borderBottomColor: Colors.border, zIndex: 10,
  },
  topLeft: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  brand: { fontSize: FontSizes.xl, fontWeight: '800', letterSpacing: 4 },
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

  hero: { alignItems: 'center', paddingTop: Spacing.xl, paddingBottom: Spacing.lg, paddingHorizontal: Spacing.lg },
  greeting: { fontSize: FontSizes.md, color: Colors.textSecondary, fontWeight: '500', marginBottom: Spacing.xs },
  clockBig: { fontSize: 52, fontWeight: '800', letterSpacing: 2, fontVariant: ['tabular-nums'] as any },
  dateLine: { fontSize: FontSizes.sm, color: Colors.textTertiary, marginTop: 4, fontWeight: '500' },

  statsStrip: {
    flexDirection: 'row', marginHorizontal: Spacing.lg, marginBottom: Spacing.md,
    backgroundColor: Colors.surface, borderRadius: BorderRadius.lg, borderWidth: 1,
    overflow: 'hidden',
    shadowColor: Colors.primary, shadowOpacity: 0.15, shadowRadius: 12, elevation: 4,
  },
  statItem: { flex: 1, alignItems: 'center', paddingVertical: Spacing.md },
  statVal: { fontSize: FontSizes.xl, fontWeight: '800' },
  statLabel: { fontSize: 9, color: Colors.textTertiary, fontWeight: '600', marginTop: 2, letterSpacing: 0.3 },

  glowCard: { borderRadius: BorderRadius.xl, borderWidth: 1, borderColor: Colors.border, overflow: 'hidden' },

  evoSection: { paddingHorizontal: Spacing.lg, marginBottom: Spacing.xl },
  evoCard: {},
  evoInner: { flexDirection: 'row', alignItems: 'center', padding: Spacing.md, gap: Spacing.md },
  evoLeft: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  evoIcon: { fontSize: 28 },
  evoName: { fontSize: FontSizes.md, fontWeight: '700', color: Colors.text },
  evoXp: { fontSize: FontSizes.xs, color: Colors.textTertiary, marginTop: 1 },
  evoRight: { flex: 1, alignItems: 'flex-end', gap: 6 },
  evoTag: { fontSize: FontSizes.xs, fontWeight: '700', letterSpacing: 0.5 },
  xpTrack: { width: '100%', height: 4, borderRadius: 2, backgroundColor: Colors.backgroundTertiary, overflow: 'hidden' },
  xpFill: { height: '100%', borderRadius: 2, backgroundColor: Colors.primary },

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

  pillsSection: { marginBottom: Spacing.xl },
  pillsRow: { paddingHorizontal: Spacing.lg, gap: Spacing.sm, flexDirection: 'row' },
  pill: {
    backgroundColor: Colors.surface, borderRadius: BorderRadius.full,
    paddingHorizontal: Spacing.md, paddingVertical: Spacing.sm,
    borderWidth: 1, borderColor: Colors.border,
  },
  pillText: { fontSize: FontSizes.sm, color: Colors.text, fontWeight: '500' },

  statusCardInner: { padding: Spacing.lg },
  statusRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md, paddingVertical: 4 },
  statusIconWrap: {
    width: 36, height: 36, borderRadius: BorderRadius.sm,
    alignItems: 'center', justifyContent: 'center', borderWidth: 1,
  },
  statusInfo: { flex: 1 },
  statusTitle: { fontSize: FontSizes.sm, fontWeight: '600', color: Colors.text },
  statusSub: { fontSize: FontSizes.xs, color: Colors.textTertiary, marginTop: 1 },
  statusPill: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    borderRadius: BorderRadius.full, borderWidth: 1,
    paddingHorizontal: 8, paddingVertical: 4,
  },
  statusPillText: { fontSize: 9, fontWeight: '800', letterSpacing: 0.5 },
  divider: { height: 1, backgroundColor: Colors.border, marginVertical: Spacing.sm },

  privacySection: { paddingHorizontal: Spacing.lg, marginBottom: Spacing.md },
  privacyCard: {
    flexDirection: 'row', alignItems: 'center', gap: Spacing.sm,
    borderRadius: BorderRadius.lg, padding: Spacing.md,
    borderWidth: 1, borderColor: Colors.secondary + '25',
  },
  privacyText: { fontSize: FontSizes.xs, color: Colors.textSecondary, flex: 1, lineHeight: 18 },
});
