import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Switch,
  TouchableOpacity,
  Linking,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, {
  FadeInUp,
  withTiming,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
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
} from 'lucide-react-native';
import { Colors, Spacing, FontSizes, BorderRadius } from '../../constants/theme';
import StatusBadge from '../../components/StatusBadge';

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
  {
    id: '1',
    app: 'WhatsApp',
    sender: 'Alex Chen',
    preview: 'Can we push our 3pm meeting to 4pm? Also send over the Q3 summary doc.',
    time: '2 min ago',
    parsed: true,
    appColor: Colors.secondary,
  },
  {
    id: '2',
    app: 'Telegram',
    sender: 'Design Team',
    preview: 'New assets uploaded to shared folder. Review before EOD.',
    time: '11 min ago',
    parsed: true,
    appColor: '#2AABEE',
  },
  {
    id: '3',
    app: 'Slack',
    sender: '#dev-channel',
    preview: 'Deploy pipeline completed. Staging environment is live.',
    time: '28 min ago',
    parsed: false,
    appColor: '#E01E5A',
  },
  {
    id: '4',
    app: 'SMS',
    sender: '+1 (555) 0192',
    preview: 'Your package 1Z999AA10123456784 is out for delivery.',
    time: '1h ago',
    parsed: true,
    appColor: Colors.accent,
  },
];

interface ClipEntry {
  id: string;
  type: 'code' | 'text' | 'url' | 'tracking';
  preview: string;
  analysis: string;
  time: string;
}

const MOCK_CLIPS: ClipEntry[] = [
  {
    id: '1',
    type: 'code',
    preview: 'const fetchUser = async (id: string) => { ...',
    analysis: 'TypeScript async function — potential unhandled promise rejection on line 3.',
    time: '5 min ago',
  },
  {
    id: '2',
    type: 'tracking',
    preview: '1Z999AA10123456784',
    analysis: 'UPS tracking number detected. Last scan: Memphis TN — out for delivery.',
    time: '1h ago',
  },
  {
    id: '3',
    type: 'text',
    preview: 'Q3 revenue targets: $2.4M ARR by September. Focus on enterprise...',
    analysis: 'Business document excerpt. Contains financial targets. Suggested: summarize & archive.',
    time: '3h ago',
  },
];

const clipTypeColor = (t: ClipEntry['type']) => {
  switch (t) {
    case 'code': return Colors.primary;
    case 'tracking': return Colors.accent;
    case 'url': return '#2AABEE';
    default: return Colors.secondary;
  }
};

function AnimatedGauge({ value, max, label, color }: { value: number; max: number; label: string; color: string }) {
  const animWidth = useSharedValue(0);

  useEffect(() => {
    animWidth.value = withTiming(value / max, { duration: 800 });
  }, [value]);

  const barStyle = useAnimatedStyle(() => ({
    width: `${animWidth.value * 100}%`,
  }));

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

function PulsingDot({ color }: { color: string }) {
  const opacity = useSharedValue(1);

  useEffect(() => {
    opacity.value = withRepeat(
      withSequence(withTiming(0.3, { duration: 700 }), withTiming(1, { duration: 700 })),
      -1,
      false
    );
  }, []);

  const style = useAnimatedStyle(() => ({ opacity: opacity.value }));

  return <Animated.View style={[{ width: 8, height: 8, borderRadius: 4, backgroundColor: color }, style]} />;
}

export default function SensorsScreen() {
  const [notifListener, setNotifListener] = useState(true);
  const [clipEngine, setClipEngine] = useState(true);
  const [locationCtx, setLocationCtx] = useState(false);
  const [calendarCtx, setCalendarCtx] = useState(true);

  const [env, setEnv] = useState({
    battery: 78,
    signal: 92,
    ram: 44,
    network: 'Wi-Fi · 54 Mbps',
  });

  useEffect(() => {
    const interval = setInterval(() => {
      setEnv((prev) => ({
        ...prev,
        battery: Math.max(10, Math.min(100, prev.battery + (Math.random() > 0.5 ? -1 : 1))),
        signal: 80 + Math.floor(Math.random() * 20),
        ram: 35 + Math.floor(Math.random() * 30),
      }));
    }, 3000);
    return () => clearInterval(interval);
  }, []);

  return (
    <View style={styles.container}>
      <LinearGradient colors={[Colors.background, Colors.backgroundSecondary]} style={styles.gradient}>
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>

          {/* Header */}
          <Animated.View entering={FadeInUp.duration(600)} style={styles.header}>
            <View style={styles.headerTextGroup}>
              <Text style={styles.headerTitle}>SENSORS</Text>
              <Text style={styles.headerSubtitle}>Riuka AI · Background Awareness</Text>
            </View>
            <StatusBadge
              label={notifListener || clipEngine ? 'Monitoring' : 'Paused'}
              color={notifListener || clipEngine ? Colors.secondary : Colors.textTertiary}
              active={notifListener || clipEngine}
              pulse={notifListener || clipEngine}
            />
          </Animated.View>

          {/* Sensor Toggles */}
          <Animated.View entering={FadeInUp.duration(600).delay(100)} style={styles.section}>
            <Text style={styles.sectionTitle}>Sensor Inputs</Text>
            <View style={styles.toggleList}>
              {[
                { icon: <Bell size={18} color={notifListener ? Colors.primary : Colors.textTertiary} />, label: 'Notification Listener', desc: 'WhatsApp · Telegram · Slack · SMS', val: notifListener, set: setNotifListener, color: Colors.primary },
                { icon: <ClipboardList size={18} color={clipEngine ? Colors.secondary : Colors.textTertiary} />, label: 'Clipboard Engine', desc: 'Captures every copy event instantly', val: clipEngine, set: setClipEngine, color: Colors.secondary },
                { icon: <Calendar size={18} color={calendarCtx ? Colors.accent : Colors.textTertiary} />, label: 'Calendar Context', desc: 'Schedule awareness & event parsing', val: calendarCtx, set: setCalendarCtx, color: Colors.accent },
                { icon: <MapPin size={18} color={locationCtx ? Colors.primary : Colors.textTertiary} />, label: 'Location Context', desc: 'Physical location telemetry', val: locationCtx, set: setLocationCtx, color: Colors.primary },
              ].map((row, i) => (
                <View key={i} style={styles.toggleRow}>
                  <View style={[styles.toggleIcon, { borderColor: row.val ? row.color + '50' : Colors.border }]}>
                    {row.icon}
                  </View>
                  <View style={styles.toggleText}>
                    <Text style={[styles.toggleLabel, row.val && { color: row.color }]}>{row.label}</Text>
                    <Text style={styles.toggleDesc}>{row.desc}</Text>
                  </View>
                  <Switch
                    value={row.val}
                    onValueChange={row.set}
                    trackColor={{ false: Colors.surface, true: row.color + '50' }}
                    thumbColor={row.val ? row.color : Colors.textTertiary}
                  />
                </View>
              ))}
            </View>
          </Animated.View>

          {/* Live Notification Feed */}
          <Animated.View entering={FadeInUp.duration(600).delay(200)} style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Notification Feed</Text>
              {notifListener && <PulsingDot color={Colors.secondary} />}
            </View>
            {notifListener ? (
              <View style={styles.feedList}>
                {MOCK_NOTIFS.map((n, i) => (
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
            ) : (
              <View style={styles.disabledCard}>
                <Bell color={Colors.textTertiary} size={24} />
                <Text style={styles.disabledText}>Enable Notification Listener to monitor incoming messages</Text>
              </View>
            )}
          </Animated.View>

          {/* Clipboard Feed */}
          <Animated.View entering={FadeInUp.duration(600).delay(300)} style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Clipboard Log</Text>
              {clipEngine && <PulsingDot color={Colors.primary} />}
            </View>
            {clipEngine ? (
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
            ) : (
              <View style={styles.disabledCard}>
                <ClipboardList color={Colors.textTertiary} size={24} />
                <Text style={styles.disabledText}>Enable Clipboard Engine to analyze copied content</Text>
              </View>
            )}
          </Animated.View>

          {/* Cross-App Control */}
          <Animated.View entering={FadeInUp.duration(600).delay(350)} style={styles.section}>
            <Text style={styles.sectionTitle}>Cross-App Control</Text>
            <View style={styles.crossAppCard}>
              <View style={styles.crossAppHeader}>
                <Smartphone color={Colors.primary} size={16} />
                <Text style={styles.crossAppTitle}>App Deep-Links  — Active Now</Text>
                <View style={styles.activeBadge}>
                  <Text style={styles.activeBadgeText}>LIVE</Text>
                </View>
              </View>
              <Text style={styles.crossAppDesc}>
                These commands work right now — just type them in Chat:
              </Text>
              <View style={styles.deepLinkGrid}>
                {[
                  { label: 'YouTube Trending', url: 'https://youtube.com/feed/trending', color: '#FF0000' },
                  { label: 'YouTube Shorts', url: 'https://youtube.com/shorts', color: '#FF0000' },
                  { label: 'Reddit Popular', url: 'https://reddit.com/r/popular', color: '#FF4500' },
                  { label: 'Instagram Explore', url: 'https://instagram.com/explore', color: '#E1306C' },
                  { label: 'Google News', url: 'https://news.google.com', color: Colors.primary },
                  { label: 'Spotify New Releases', url: 'https://open.spotify.com/genre/new-releases-page', color: '#1DB954' },
                ].map((item) => (
                  <TouchableOpacity
                    key={item.label}
                    style={[styles.deepLinkChip, { borderColor: item.color + '40', backgroundColor: item.color + '10' }]}
                    onPress={() => Linking.openURL(item.url)}
                    activeOpacity={0.7}
                  >
                    <ExternalLink color={item.color} size={11} />
                    <Text style={[styles.deepLinkText, { color: item.color }]}>{item.label}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            <View style={styles.accessibilityCard}>
              <View style={styles.accessibilityHeader}>
                <View style={[styles.accessibilityDot, { backgroundColor: Colors.textTertiary }]} />
                <Text style={styles.accessibilityTitle}>Accessibility Service — Full Control Mode</Text>
              </View>
              <Text style={styles.accessibilityDesc}>
                Enable Riuka's Accessibility Service to scroll, tap, and control ANY app with voice or chat commands:
              </Text>
              <View style={styles.accessibilityFeatures}>
                {[
                  'Scroll up/down inside YouTube, TikTok, Instagram',
                  '"Next video" while watching YouTube',
                  '"Like this" to like without touching screen',
                  '"Back" or "Home" from any app',
                  'Read screen content aloud from any app',
                ].map((f, i) => (
                  <View key={i} style={styles.accessibilityFeatureRow}>
                    <View style={styles.accessibilityBullet} />
                    <Text style={styles.accessibilityFeatureText}>{f}</Text>
                  </View>
                ))}
              </View>
              <TouchableOpacity
                style={styles.accessibilityButton}
                onPress={() => {
                  try { Linking.openURL('android.settings.ACCESSIBILITY_SETTINGS'); } catch {}
                }}
                activeOpacity={0.8}
              >
                <Smartphone color={Colors.primary} size={14} />
                <Text style={styles.accessibilityButtonText}>Enable in Android Settings</Text>
              </TouchableOpacity>
            </View>
          </Animated.View>

          {/* Environment Context Matrix */}
          <Animated.View entering={FadeInUp.duration(600).delay(400)} style={styles.section}>
            <Text style={styles.sectionTitle}>Environment Matrix</Text>
            <View style={styles.envCard}>
              <View style={styles.envGrid}>
                {[
                  { icon: <Battery color={env.battery > 30 ? Colors.secondary : Colors.error} size={16} />, label: 'Battery', value: `${env.battery}%`, color: env.battery > 30 ? Colors.secondary : Colors.error },
                  { icon: <Radio color={Colors.primary} size={16} />, label: 'Signal', value: `${env.signal}%`, color: Colors.primary },
                  { icon: <Wifi color={Colors.accent} size={16} />, label: 'Network', value: 'Wi-Fi', color: Colors.accent },
                  { icon: <Eye color={Colors.secondary} size={16} />, label: 'RAM Free', value: `${100 - env.ram}%`, color: Colors.secondary },
                ].map((item, i) => (
                  <View key={i} style={styles.envItem}>
                    {item.icon}
                    <Text style={[styles.envValue, { color: item.color }]}>{item.value}</Text>
                    <Text style={styles.envLabel}>{item.label}</Text>
                  </View>
                ))}
              </View>
              <View style={styles.envGauges}>
                <AnimatedGauge value={env.battery} max={100} label="Battery Level" color={env.battery > 30 ? Colors.secondary : Colors.error} />
                <AnimatedGauge value={env.signal} max={100} label="Signal Strength" color={Colors.primary} />
                <AnimatedGauge value={env.ram} max={100} label="RAM Usage" color={Colors.accent} />
              </View>
            </View>
          </Animated.View>

        </ScrollView>
      </LinearGradient>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  gradient: { flex: 1 },
  scrollContent: { paddingBottom: Spacing.xxxl },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.xxxl + Spacing.md,
    marginBottom: Spacing.lg,
  },
  headerTextGroup: {},
  headerTitle: {
    fontSize: FontSizes.xxl,
    fontWeight: '800',
    color: Colors.text,
    letterSpacing: 3,
  },
  headerSubtitle: {
    fontSize: FontSizes.sm,
    color: Colors.secondary,
    fontWeight: '600',
    letterSpacing: 0.5,
    marginTop: 2,
  },

  section: { paddingHorizontal: Spacing.lg, marginBottom: Spacing.xl },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, marginBottom: Spacing.md },
  sectionTitle: {
    fontSize: FontSizes.md,
    fontWeight: '700',
    color: Colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },

  toggleList: { gap: Spacing.md },
  toggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.lg,
    padding: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.border,
    gap: Spacing.md,
  },
  toggleIcon: {
    width: 44,
    height: 44,
    borderRadius: BorderRadius.md,
    backgroundColor: Colors.backgroundTertiary,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  toggleText: { flex: 1 },
  toggleLabel: { fontSize: FontSizes.md, fontWeight: '600', color: Colors.text, marginBottom: 1 },
  toggleDesc: { fontSize: FontSizes.xs, color: Colors.textTertiary },

  feedList: { gap: Spacing.md },
  feedCard: {
    flexDirection: 'row',
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.border,
    gap: Spacing.md,
  },
  feedAppDot: { width: 4, borderRadius: 2, alignSelf: 'stretch' },
  feedContent: { flex: 1 },
  feedTop: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, marginBottom: 4 },
  feedApp: { fontSize: FontSizes.xs, fontWeight: '800', color: Colors.textSecondary },
  feedSender: { flex: 1, fontSize: FontSizes.xs, color: Colors.text, fontWeight: '600' },
  feedTime: { fontSize: FontSizes.xs, color: Colors.textTertiary },
  feedPreview: { fontSize: FontSizes.sm, color: Colors.textSecondary, lineHeight: 18, marginBottom: 6 },
  parsedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    alignSelf: 'flex-start',
    backgroundColor: Colors.secondary + '15',
    borderRadius: BorderRadius.full,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderWidth: 1,
    borderColor: Colors.secondary + '30',
  },
  parsedBadgeText: { fontSize: 9, color: Colors.secondary, fontWeight: '700' },

  clipCard: {
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.border,
    borderLeftWidth: 3,
    gap: 5,
  },
  clipTop: { flexDirection: 'row', alignItems: 'center', gap: Spacing.xs },
  clipTypeBadge: {
    borderRadius: BorderRadius.full,
    borderWidth: 1,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  clipTypeText: { fontSize: 9, fontWeight: '800', letterSpacing: 0.5 },
  clipTime: { fontSize: FontSizes.xs, color: Colors.textTertiary },
  clipPreview: { fontSize: FontSizes.sm, color: Colors.text, fontWeight: '500', fontFamily: 'monospace' },
  clipAnalysis: { fontSize: FontSizes.xs, color: Colors.textTertiary, lineHeight: 16 },

  disabledCard: {
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.lg,
    padding: Spacing.xl,
    alignItems: 'center',
    gap: Spacing.sm,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  disabledText: { fontSize: FontSizes.sm, color: Colors.textTertiary, textAlign: 'center', lineHeight: 20 },

  envCard: {
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.lg,
    padding: Spacing.lg,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  envGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: Spacing.lg,
  },
  envItem: { alignItems: 'center', gap: 3 },
  envValue: { fontSize: FontSizes.lg, fontWeight: '700' },
  envLabel: { fontSize: FontSizes.xs, color: Colors.textTertiary },
  envGauges: {},

  crossAppCard: {
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.lg,
    padding: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.primary + '30',
    marginBottom: Spacing.md,
  },
  crossAppHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    marginBottom: Spacing.sm,
  },
  crossAppTitle: {
    flex: 1,
    fontSize: FontSizes.sm,
    fontWeight: '700',
    color: Colors.text,
  },
  activeBadge: {
    backgroundColor: Colors.secondary + '20',
    borderRadius: BorderRadius.full,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderWidth: 1,
    borderColor: Colors.secondary + '50',
  },
  activeBadgeText: {
    fontSize: 9,
    fontWeight: '800',
    color: Colors.secondary,
    letterSpacing: 0.5,
  },
  crossAppDesc: {
    fontSize: FontSizes.xs,
    color: Colors.textTertiary,
    marginBottom: Spacing.md,
  },
  deepLinkGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.xs,
  },
  deepLinkChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    borderWidth: 1,
    borderRadius: BorderRadius.full,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 5,
  },
  deepLinkText: {
    fontSize: FontSizes.xs,
    fontWeight: '600',
  },

  accessibilityCard: {
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.lg,
    padding: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.border,
    borderLeftWidth: 3,
    borderLeftColor: Colors.textTertiary,
  },
  accessibilityHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    marginBottom: Spacing.sm,
  },
  accessibilityDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  accessibilityTitle: {
    fontSize: FontSizes.sm,
    fontWeight: '700',
    color: Colors.textSecondary,
  },
  accessibilityDesc: {
    fontSize: FontSizes.xs,
    color: Colors.textTertiary,
    lineHeight: 18,
    marginBottom: Spacing.md,
  },
  accessibilityFeatures: {
    gap: Spacing.xs,
    marginBottom: Spacing.md,
  },
  accessibilityFeatureRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  accessibilityBullet: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: Colors.textTertiary,
  },
  accessibilityFeatureText: {
    fontSize: FontSizes.xs,
    color: Colors.textSecondary,
    lineHeight: 18,
  },
  accessibilityButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    backgroundColor: Colors.primary + '15',
    borderRadius: BorderRadius.md,
    padding: Spacing.sm,
    borderWidth: 1,
    borderColor: Colors.primary + '30',
    alignSelf: 'flex-start',
  },
  accessibilityButtonText: {
    fontSize: FontSizes.xs,
    fontWeight: '700',
    color: Colors.primary,
  },
});
