import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Linking,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, {
  FadeInUp,
  withTiming,
  withRepeat,
  withSequence,
  useAnimatedStyle,
  useSharedValue,
  Easing,
  interpolateColor,
} from 'react-native-reanimated';
import {
  Bell,
  ClipboardList,
  MapPin,
  Battery,
  Wifi,
  Calendar,
  Clock,
  Eye,
  Zap,
  Radio,
  Smartphone,
  ExternalLink,
  Activity,
} from 'lucide-react-native';
import { Colors, Spacing, FontSizes, BorderRadius } from '../../constants/theme';

const GEMINI = ['#A855F7', '#3B82F6', '#10B981', '#EC4899', '#A855F7'];

interface NotifEntry {
  id: string;
  app: string;
  sender: string;
  preview: string;
  time: string;
  parsed: boolean;
  appColor: string;
}

const MOCK_NOTIFS: NotifEntry[] = [
  { id: '1', app: 'WhatsApp', sender: 'Alex Chen', preview: 'Can we push our 3pm meeting to 4pm? Also send over the Q3 summary doc.', time: '2 min ago', parsed: true, appColor: Colors.secondary },
  { id: '2', app: 'Telegram', sender: 'Design Team', preview: 'New assets uploaded to shared folder. Review before EOD.', time: '11 min ago', parsed: true, appColor: '#2AABEE' },
  { id: '3', app: 'Slack', sender: '#dev-channel', preview: 'Deploy pipeline completed. Staging environment is live.', time: '28 min ago', parsed: false, appColor: '#E01E5A' },
  { id: '4', app: 'SMS', sender: '+1 (555) 0192', preview: 'Your package 1Z999AA10123456784 is out for delivery.', time: '1h ago', parsed: true, appColor: Colors.accent },
];

interface ClipEntry {
  id: string;
  type: 'code' | 'text' | 'url' | 'tracking';
  preview: string;
  analysis: string;
  time: string;
}

const MOCK_CLIPS: ClipEntry[] = [
  { id: '1', type: 'code', preview: 'const fetchUser = async (id: string) => { ...', analysis: 'TypeScript async function — potential unhandled promise rejection on line 3.', time: '5 min ago' },
  { id: '2', type: 'tracking', preview: '1Z999AA10123456784', analysis: 'UPS tracking number detected. Last scan: Memphis TN — out for delivery.', time: '1h ago' },
  { id: '3', type: 'text', preview: 'Q3 revenue targets: $2.4M ARR by September. Focus on enterprise...', analysis: 'Business document excerpt. Contains financial targets. Suggested: summarize & archive.', time: '3h ago' },
];

const clipTypeColor = (t: ClipEntry['type']) => {
  switch (t) {
    case 'code': return Colors.primary;
    case 'tracking': return Colors.accent;
    case 'url': return '#2AABEE';
    default: return Colors.secondary;
  }
};

// ── Gemini color-cycling title ────────────────────────────────────────────────
function GeminiTitle({ text }: { text: string }) {
  const phase = useSharedValue(0);
  useEffect(() => {
    phase.value = withRepeat(withTiming(1, { duration: 4500, easing: Easing.linear }), -1, false);
  }, []);
  const aStyle = useAnimatedStyle(() => ({
    color: interpolateColor(phase.value, [0, 0.25, 0.5, 0.75, 1], GEMINI),
  }));
  return <Animated.Text style={[styles.headerTitle, aStyle]}>{text}</Animated.Text>;
}

// ── Animated gauge bar ────────────────────────────────────────────────────────
function AnimatedGauge({ value, max, label, color }: { value: number; max: number; label: string; color: string }) {
  const animWidth = useSharedValue(0);
  useEffect(() => {
    animWidth.value = withTiming(value / max, { duration: 800 });
  }, [value]);
  const barStyle = useAnimatedStyle(() => ({ width: `${animWidth.value * 100}%` as any }));
  return (
    <View style={gaugeStyles.container}>
      <View style={gaugeStyles.header}>
        <Text style={gaugeStyles.label}>{label}</Text>
        <Text style={[gaugeStyles.value, { color }]}>{value}%</Text>
      </View>
      <View style={gaugeStyles.track}>
        <Animated.View style={[gaugeStyles.fill, { backgroundColor: color }, barStyle]} />
      </View>
    </View>
  );
}

const gaugeStyles = StyleSheet.create({
  container: { marginBottom: Spacing.md },
  header: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: Spacing.xs + 2 },
  label: { fontSize: FontSizes.sm, color: Colors.textSecondary, fontWeight: '500' },
  value: { fontSize: FontSizes.sm, fontWeight: '700' },
  track: { height: 6, borderRadius: 3, backgroundColor: Colors.backgroundTertiary, overflow: 'hidden' },
  fill: { height: '100%', borderRadius: 3 },
});

// ── Pulsing dot ───────────────────────────────────────────────────────────────
function PulsingDot({ color }: { color: string }) {
  const opacity = useSharedValue(1);
  useEffect(() => {
    opacity.value = withRepeat(withSequence(withTiming(0.3, { duration: 700 }), withTiming(1, { duration: 700 })), -1, false);
  }, []);
  const style = useAnimatedStyle(() => ({ opacity: opacity.value }));
  return <Animated.View style={[{ width: 8, height: 8, borderRadius: 4, backgroundColor: color }, style]} />;
}

// ── Color-cycling section accent ──────────────────────────────────────────────
function GeminiAccent() {
  const phase = useSharedValue(0);
  useEffect(() => {
    phase.value = withRepeat(withTiming(1, { duration: 5000, easing: Easing.linear }), -1, false);
  }, []);
  const aStyle = useAnimatedStyle(() => ({
    backgroundColor: interpolateColor(phase.value, [0, 0.25, 0.5, 0.75, 1], GEMINI),
  }));
  return <Animated.View style={[styles.accent, aStyle]} />;
}

export default function SensorsScreen() {
  const [env, setEnv] = useState({ battery: 78, signal: 92, ram: 44 });

  useEffect(() => {
    const interval = setInterval(() => {
      setEnv((prev) => ({
        battery: Math.max(10, Math.min(100, prev.battery + (Math.random() > 0.5 ? -1 : 1))),
        signal: 80 + Math.floor(Math.random() * 20),
        ram: 35 + Math.floor(Math.random() * 30),
      }));
    }, 3000);
    return () => clearInterval(interval);
  }, []);

  return (
    <View style={styles.container}>
      <LinearGradient colors={[Colors.background, Colors.backgroundSecondary]} style={StyleSheet.absoluteFill} />
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>

        {/* Header */}
        <Animated.View entering={FadeInUp.duration(600)} style={styles.header}>
          <View style={styles.headerTextGroup}>
            <GeminiTitle text="SENSORS" />
            <Text style={styles.headerSubtitle}>Riuka AI · Live Data Monitor</Text>
          </View>
          <View style={styles.liveBadge}>
            <PulsingDot color={Colors.secondary} />
            <Text style={styles.liveBadgeText}>LIVE</Text>
          </View>
        </Animated.View>

        {/* Live Notification Feed */}
        <Animated.View entering={FadeInUp.duration(600).delay(100)} style={styles.section}>
          <View style={styles.sectionHeader}>
            <GeminiAccent />
            <Text style={styles.sectionTitle}>Notification Feed</Text>
            <PulsingDot color={Colors.secondary} />
          </View>
          <View style={styles.feedList}>
            {MOCK_NOTIFS.map((n) => (
              <View key={n.id} style={styles.feedCard}>
                <View style={[styles.feedAppDot, { backgroundColor: n.appColor }]} />
                <View style={styles.feedContent}>
                  <View style={styles.feedTop}>
                    <Text style={styles.feedApp}>{n.app}</Text>
                    <Text style={styles.feedSender}>{n.sender}</Text>
                    <Text style={styles.feedTime}>{n.time}</Text>
                  </View>
                  <Text style={styles.feedPreview} numberOfLines={2}>{n.preview}</Text>
                  {n.parsed && (
                    <View style={styles.parsedBadge}>
                      <Zap color={Colors.secondary} size={9} />
                      <Text style={styles.parsedBadgeText}>Brain parsed · action ready</Text>
                    </View>
                  )}
                </View>
              </View>
            ))}
          </View>
        </Animated.View>

        {/* Clipboard Log */}
        <Animated.View entering={FadeInUp.duration(600).delay(180)} style={styles.section}>
          <View style={styles.sectionHeader}>
            <GeminiAccent />
            <Text style={styles.sectionTitle}>Clipboard Log</Text>
            <PulsingDot color={Colors.primary} />
          </View>
          <View style={styles.feedList}>
            {MOCK_CLIPS.map((c) => (
              <View key={c.id} style={[styles.clipCard, { borderLeftColor: clipTypeColor(c.type) }]}>
                <View style={styles.clipTop}>
                  <View style={[styles.clipTypeBadge, { backgroundColor: clipTypeColor(c.type) + '20', borderColor: clipTypeColor(c.type) + '40' }]}>
                    <Text style={[styles.clipTypeText, { color: clipTypeColor(c.type) }]}>{c.type.toUpperCase()}</Text>
                  </View>
                  <Clock color={Colors.textTertiary} size={10} />
                  <Text style={styles.clipTime}>{c.time}</Text>
                </View>
                <Text style={styles.clipPreview} numberOfLines={1}>{c.preview}</Text>
                <Text style={styles.clipAnalysis} numberOfLines={2}>{c.analysis}</Text>
              </View>
            ))}
          </View>
        </Animated.View>

        {/* Cross-App Control */}
        <Animated.View entering={FadeInUp.duration(600).delay(240)} style={styles.section}>
          <View style={styles.sectionHeader}>
            <GeminiAccent />
            <Text style={styles.sectionTitle}>Cross-App Links</Text>
          </View>
          <View style={styles.crossAppCard}>
            <View style={styles.crossAppHeader}>
              <Smartphone color={Colors.primary} size={16} />
              <Text style={styles.crossAppTitle}>App Deep-Links — Active Now</Text>
              <View style={styles.activeBadge}><Text style={styles.activeBadgeText}>LIVE</Text></View>
            </View>
            <Text style={styles.crossAppDesc}>Tap to open · or type these in Chat:</Text>
            <View style={styles.deepLinkGrid}>
              {[
                { label: 'YouTube Trending', url: 'https://youtube.com/feed/trending', color: '#FF0000' },
                { label: 'YouTube Shorts', url: 'https://youtube.com/shorts', color: '#FF0000' },
                { label: 'Reddit Popular', url: 'https://reddit.com/r/popular', color: '#FF4500' },
                { label: 'Instagram Explore', url: 'https://instagram.com/explore', color: '#E1306C' },
                { label: 'Google News', url: 'https://news.google.com', color: Colors.primary },
                { label: 'Spotify New Releases', url: 'https://open.spotify.com/genre/new-releases-page', color: '#1DB954' },
              ].map((item) => (
                <TouchableOpacity key={item.label}
                  style={[styles.deepLinkChip, { borderColor: item.color + '40', backgroundColor: item.color + '10' }]}
                  onPress={() => Linking.openURL(item.url)} activeOpacity={0.7}>
                  <ExternalLink color={item.color} size={11} />
                  <Text style={[styles.deepLinkText, { color: item.color }]}>{item.label}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        </Animated.View>

        {/* Environment Matrix */}
        <Animated.View entering={FadeInUp.duration(600).delay(300)} style={styles.section}>
          <View style={styles.sectionHeader}>
            <GeminiAccent />
            <Text style={styles.sectionTitle}>Environment Matrix</Text>
            <Activity color={Colors.accent} size={14} />
          </View>
          <View style={styles.envCard}>
            <View style={styles.envGrid}>
              {[
                { icon: Battery, label: 'Battery', value: `${env.battery}%`, color: env.battery > 30 ? Colors.secondary : Colors.error },
                { icon: Radio, label: 'Signal', value: `${env.signal}%`, color: Colors.primary },
                { icon: Wifi, label: 'Network', value: 'Wi-Fi', color: Colors.accent },
                { icon: Eye, label: 'RAM Free', value: `${100 - env.ram}%`, color: Colors.secondary },
              ].map((item, i) => {
                const Icon = item.icon;
                return (
                  <View key={i} style={styles.envItem}>
                    <Icon color={item.color} size={16} />
                    <Text style={[styles.envValue, { color: item.color }]}>{item.value}</Text>
                    <Text style={styles.envLabel}>{item.label}</Text>
                  </View>
                );
              })}
            </View>
            <AnimatedGauge value={env.battery} max={100} label="Battery Level" color={env.battery > 30 ? Colors.secondary : Colors.error} />
            <AnimatedGauge value={env.signal} max={100} label="Signal Strength" color={Colors.primary} />
            <AnimatedGauge value={env.ram} max={100} label="RAM Usage" color={Colors.accent} />
          </View>
        </Animated.View>

      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  scrollContent: { paddingBottom: Spacing.xxxl },

  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: Spacing.lg, paddingTop: Spacing.xxxl + Spacing.md, marginBottom: Spacing.lg,
  },
  headerTextGroup: {},
  headerTitle: { fontSize: FontSizes.xxl, fontWeight: '800', letterSpacing: 3 },
  headerSubtitle: { fontSize: FontSizes.sm, color: Colors.secondary, fontWeight: '600', letterSpacing: 0.5, marginTop: 2 },
  liveBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: Colors.secondary + '15', borderRadius: BorderRadius.full,
    paddingHorizontal: 10, paddingVertical: 6, borderWidth: 1, borderColor: Colors.secondary + '30',
  },
  liveBadgeText: { fontSize: FontSizes.xs, fontWeight: '800', color: Colors.secondary, letterSpacing: 1 },

  accent: { width: 3, height: 14, borderRadius: 2, marginRight: 2 },

  section: { paddingHorizontal: Spacing.lg, marginBottom: Spacing.xl },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, marginBottom: Spacing.md },
  sectionTitle: { flex: 1, fontSize: FontSizes.md, fontWeight: '700', color: Colors.textSecondary, textTransform: 'uppercase', letterSpacing: 1 },

  feedList: { gap: Spacing.md },
  feedCard: { flexDirection: 'row', backgroundColor: Colors.surface, borderRadius: BorderRadius.md, padding: Spacing.md, borderWidth: 1, borderColor: Colors.border, gap: Spacing.md },
  feedAppDot: { width: 4, borderRadius: 2, alignSelf: 'stretch' },
  feedContent: { flex: 1 },
  feedTop: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, marginBottom: 4 },
  feedApp: { fontSize: FontSizes.xs, fontWeight: '800', color: Colors.textSecondary },
  feedSender: { flex: 1, fontSize: FontSizes.xs, color: Colors.text, fontWeight: '600' },
  feedTime: { fontSize: FontSizes.xs, color: Colors.textTertiary },
  feedPreview: { fontSize: FontSizes.sm, color: Colors.textSecondary, lineHeight: 18, marginBottom: 6 },
  parsedBadge: { flexDirection: 'row', alignItems: 'center', gap: 3, alignSelf: 'flex-start', backgroundColor: Colors.secondary + '15', borderRadius: BorderRadius.full, paddingHorizontal: 6, paddingVertical: 2, borderWidth: 1, borderColor: Colors.secondary + '30' },
  parsedBadgeText: { fontSize: 9, color: Colors.secondary, fontWeight: '700' },

  clipCard: { backgroundColor: Colors.surface, borderRadius: BorderRadius.md, padding: Spacing.md, borderWidth: 1, borderColor: Colors.border, borderLeftWidth: 3, gap: 5 },
  clipTop: { flexDirection: 'row', alignItems: 'center', gap: Spacing.xs },
  clipTypeBadge: { borderRadius: BorderRadius.full, borderWidth: 1, paddingHorizontal: 6, paddingVertical: 2 },
  clipTypeText: { fontSize: 9, fontWeight: '800', letterSpacing: 0.5 },
  clipTime: { fontSize: FontSizes.xs, color: Colors.textTertiary },
  clipPreview: { fontSize: FontSizes.sm, color: Colors.text, fontWeight: '500', fontFamily: 'monospace' },
  clipAnalysis: { fontSize: FontSizes.xs, color: Colors.textTertiary, lineHeight: 16 },

  crossAppCard: { backgroundColor: Colors.surface, borderRadius: BorderRadius.lg, padding: Spacing.md, borderWidth: 1, borderColor: Colors.primary + '30' },
  crossAppHeader: { flexDirection: 'row', alignItems: 'center', gap: Spacing.xs, marginBottom: Spacing.sm },
  crossAppTitle: { flex: 1, fontSize: FontSizes.sm, fontWeight: '700', color: Colors.text },
  activeBadge: { backgroundColor: Colors.secondary + '20', borderRadius: BorderRadius.full, paddingHorizontal: 6, paddingVertical: 2, borderWidth: 1, borderColor: Colors.secondary + '40' },
  activeBadgeText: { fontSize: 9, fontWeight: '800', color: Colors.secondary, letterSpacing: 0.5 },
  crossAppDesc: { fontSize: FontSizes.xs, color: Colors.textTertiary, marginBottom: Spacing.md },
  deepLinkGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm },
  deepLinkChip: { flexDirection: 'row', alignItems: 'center', gap: 5, borderRadius: BorderRadius.full, borderWidth: 1, paddingHorizontal: 10, paddingVertical: 6 },
  deepLinkText: { fontSize: FontSizes.xs, fontWeight: '600' },

  envCard: { backgroundColor: Colors.surface, borderRadius: BorderRadius.lg, padding: Spacing.lg, borderWidth: 1, borderColor: Colors.border },
  envGrid: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: Spacing.lg },
  envItem: { alignItems: 'center', gap: 3 },
  envValue: { fontSize: FontSizes.lg, fontWeight: '700' },
  envLabel: { fontSize: FontSizes.xs, color: Colors.textTertiary },
});
