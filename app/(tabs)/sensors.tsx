import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Linking,
  Platform,
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
  Bell, ClipboardList, Battery, Wifi, Clock,
  Eye, Zap, Radio, Smartphone, ExternalLink,
  Activity, MapPin, Navigation, CheckCircle, XCircle,
} from 'lucide-react-native';
import { Colors, Spacing, FontSizes, BorderRadius } from '../../constants/theme';

const GEMINI = ['#A855F7', '#3B82F6', '#10B981', '#EC4899', '#A855F7'];

interface ClipEntry {
  id: string;
  type: 'code' | 'text' | 'url' | 'tracking';
  preview: string;
  analysis: string;
  time: string;
}

const analyzeClipType = (text: string): ClipEntry['type'] => {
  if (/^https?:\/\//i.test(text)) return 'url';
  if (/\b1Z[A-Z0-9]{16}\b|\b\d{12,22}\b/.test(text)) return 'tracking';
  if (/function|const |let |var |def |class |import |export |<\//.test(text)) return 'code';
  return 'text';
};

const analyzeClip = (type: ClipEntry['type'], text: string): string => {
  if (type === 'url') return `URL detected. Say "open this link" or "summarize this URL" in chat.`;
  if (type === 'tracking') return `Tracking number detected — likely a shipment ID. Say "track this" in chat.`;
  if (type === 'code') return `Code detected. Say "explain this code" or "find bugs" in chat.`;
  const words = text.trim().split(/\s+/).length;
  return `${words} words. Say "summarize this" or "improve this text" in chat.`;
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

// ── Permission badge ──────────────────────────────────────────────────────────
function PermBadge({ granted }: { granted: boolean }) {
  return (
    <View style={[styles.permBadge, { borderColor: granted ? Colors.secondary + '40' : Colors.error + '30', backgroundColor: granted ? Colors.secondary + '12' : Colors.error + '10' }]}>
      {granted ? <CheckCircle color={Colors.secondary} size={11} /> : <XCircle color={Colors.error} size={11} />}
      <Text style={[styles.permText, { color: granted ? Colors.secondary : Colors.error }]}>
        {granted ? 'GRANTED' : 'DENIED'}
      </Text>
    </View>
  );
}

export default function SensorsScreen() {
  // Real battery state
  const [battery, setBattery] = useState({ level: 0, charging: false, available: false });
  // Real network state
  const [network, setNetwork] = useState({ type: 'unknown', speed: 0, available: false });
  // Real device motion
  const [motion, setMotion] = useState({ x: 0, y: 0, z: 0, shakes: 0, available: false });
  const lastShake = useRef(0);
  const lastAcc = useRef({ x: 0, y: 0, z: 0 });
  // Real notification permission
  const [notifPerm, setNotifPerm] = useState<'granted' | 'denied' | 'default'>('default');
  // Real clipboard log (paste events)
  const [clipLog, setClipLog] = useState<ClipEntry[]>([]);
  // Real geolocation
  const [location, setLocation] = useState<{ lat: number; lon: number; city: string } | null>(null);
  // Env simulation (augmented with real data where available)
  const [signal, setSignal] = useState(88);

  useEffect(() => {
    if (Platform.OS !== 'web') return;

    // Battery API
    if ('getBattery' in navigator) {
      (navigator as any).getBattery().then((bat: any) => {
        const update = () => setBattery({ level: Math.round(bat.level * 100), charging: bat.charging, available: true });
        update();
        bat.addEventListener('levelchange', update);
        bat.addEventListener('chargingchange', update);
      }).catch(() => {});
    }

    // Network Information API
    const conn = (navigator as any).connection || (navigator as any).mozConnection || (navigator as any).webkitConnection;
    if (conn) {
      const updateNet = () => setNetwork({ type: conn.effectiveType || 'wifi', speed: Math.round(conn.downlink || 0), available: true });
      updateNet();
      conn.addEventListener('change', updateNet);
    }

    // Notification permission
    if ('Notification' in window) {
      setNotifPerm((window as any).Notification.permission);
    }

    // Load saved location
    try {
      const loc = JSON.parse(localStorage.getItem('riuka_location_v1') || 'null');
      if (loc?.lat) setLocation({ lat: loc.lat, lon: loc.lon, city: 'Saved location' });
    } catch {}

    // Paste event → clipboard log
    const handlePaste = (e: Event) => {
      const text = (e as ClipboardEvent).clipboardData?.getData('text') ?? '';
      if (!text) return;
      const type = analyzeClipType(text);
      setClipLog(prev => [{
        id: Date.now().toString(),
        type,
        preview: text.slice(0, 80),
        analysis: analyzeClip(type, text),
        time: 'just now',
      }, ...prev.slice(0, 4)]);
    };
    document.addEventListener('paste', handlePaste);

    // Device motion — shake + live axes
    const handleMotion = (e: any) => {
      const a = e.acceleration || e.accelerationIncludingGravity;
      if (!a) return;
      const nx = a.x || 0, ny = a.y || 0, nz = a.z || 0;
      const delta = Math.abs(nx - lastAcc.current.x) + Math.abs(ny - lastAcc.current.y) + Math.abs(nz - lastAcc.current.z);
      lastAcc.current = { x: nx, y: ny, z: nz };
      setMotion(m => {
        const shakes = (delta > 18 && Date.now() - lastShake.current > 1200)
          ? (() => { lastShake.current = Date.now(); return m.shakes + 1; })()
          : m.shakes;
        return { x: Math.round(nx * 10) / 10, y: Math.round(ny * 10) / 10, z: Math.round(nz * 10) / 10, shakes, available: true };
      });
    };
    window.addEventListener('devicemotion', handleMotion);

    // Signal simulation
    const t = setInterval(() => setSignal(80 + Math.floor(Math.random() * 20)), 3000);

    return () => {
      document.removeEventListener('paste', handlePaste);
      window.removeEventListener('devicemotion', handleMotion);
      clearInterval(t);
    };
  }, []);

  const requestLocation = () => {
    if (Platform.OS !== 'web' || !navigator.geolocation) return;
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const { latitude: lat, longitude: lon } = pos.coords;
        let city = `${lat.toFixed(3)}, ${lon.toFixed(3)}`;
        try {
          const r = await fetch(`https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lon}&format=json`);
          const d = await r.json();
          city = d.address?.city || d.address?.town || d.address?.village || city;
        } catch {}
        setLocation({ lat, lon, city });
        try { localStorage.setItem('riuka_location_v1', JSON.stringify({ lat, lon })); } catch {}
      },
      () => {},
      { timeout: 8000 }
    );
  };

  const clipTypeColor = (t: ClipEntry['type']) => {
    switch (t) {
      case 'code': return Colors.primary;
      case 'tracking': return Colors.accent;
      case 'url': return '#2AABEE';
      default: return Colors.secondary;
    }
  };

  return (
    <View style={styles.container}>
      <LinearGradient colors={[Colors.background, Colors.backgroundSecondary]} style={StyleSheet.absoluteFill} />
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>

        {/* Header */}
        <Animated.View entering={FadeInUp.duration(600)} style={styles.header}>
          <View>
            <GeminiTitle text="SENSORS" />
            <Text style={styles.headerSubtitle}>Riuka AI · Web Native · Live Data</Text>
          </View>
          <View style={styles.liveBadge}>
            <PulsingDot color={Colors.secondary} />
            <Text style={styles.liveBadgeText}>LIVE</Text>
          </View>
        </Animated.View>

        {/* ── Web Permissions Status ── */}
        <Animated.View entering={FadeInUp.duration(600).delay(80)} style={styles.section}>
          <View style={styles.sectionHeader}>
            <GeminiAccent />
            <Text style={styles.sectionTitle}>Web Permissions</Text>
          </View>
          <View style={styles.permGrid}>
            {[
              { label: 'Notifications', granted: notifPerm === 'granted', icon: Bell },
              { label: 'Motion', granted: motion.available, icon: Smartphone },
              { label: 'Battery', granted: battery.available, icon: Battery },
              { label: 'Network', granted: network.available, icon: Wifi },
              { label: 'Location', granted: !!location, icon: MapPin },
              { label: 'Clipboard', granted: clipLog.length > 0, icon: ClipboardList },
            ].map(({ label, granted, icon: Icon }) => (
              <View key={label} style={styles.permItem}>
                <Icon color={granted ? Colors.secondary : Colors.textTertiary} size={16} />
                <Text style={[styles.permLabel, { color: granted ? Colors.text : Colors.textTertiary }]}>{label}</Text>
                <PermBadge granted={granted} />
              </View>
            ))}
          </View>
          <Text style={styles.permHint}>Enable sensors in Settings → Sensors & Awareness</Text>
        </Animated.View>

        {/* ── Environment Matrix ── */}
        <Animated.View entering={FadeInUp.duration(600).delay(140)} style={styles.section}>
          <View style={styles.sectionHeader}>
            <GeminiAccent />
            <Text style={styles.sectionTitle}>Environment Matrix</Text>
            <Activity color={Colors.accent} size={14} />
          </View>
          <View style={styles.envCard}>
            <View style={styles.envGrid}>
              <View style={styles.envItem}>
                <Battery color={battery.level > 30 ? Colors.secondary : Colors.error} size={16} />
                <Text style={[styles.envValue, { color: battery.level > 30 ? Colors.secondary : Colors.error }]}>
                  {battery.available ? `${battery.level}%` : 'N/A'}
                </Text>
                <Text style={styles.envLabel}>{battery.available && battery.charging ? 'Charging' : 'Battery'}</Text>
              </View>
              <View style={styles.envItem}>
                <Radio color={Colors.primary} size={16} />
                <Text style={[styles.envValue, { color: Colors.primary }]}>{signal}%</Text>
                <Text style={styles.envLabel}>Signal</Text>
              </View>
              <View style={styles.envItem}>
                <Wifi color={Colors.accent} size={16} />
                <Text style={[styles.envValue, { color: Colors.accent }]}>
                  {network.available ? network.type.toUpperCase() : 'Wi-Fi'}
                </Text>
                <Text style={styles.envLabel}>{network.available && network.speed > 0 ? `${network.speed} Mbps` : 'Network'}</Text>
              </View>
              <View style={styles.envItem}>
                <Eye color={Colors.secondary} size={16} />
                <Text style={[styles.envValue, { color: Colors.secondary }]}>
                  {motion.available ? `${motion.shakes}` : 'N/A'}
                </Text>
                <Text style={styles.envLabel}>Shakes</Text>
              </View>
            </View>
            {battery.available && (
              <AnimatedGauge value={battery.level} max={100} label={`Battery${battery.charging ? ' (charging)' : ''}`} color={battery.level > 30 ? Colors.secondary : Colors.error} />
            )}
            <AnimatedGauge value={signal} max={100} label="Signal Strength" color={Colors.primary} />
            {motion.available && (
              <View style={styles.motionRow}>
                <Text style={styles.motionLabel}>Device Motion (live)</Text>
                <View style={styles.motionAxes}>
                  {[['X', motion.x, Colors.primary], ['Y', motion.y, Colors.secondary], ['Z', motion.z, Colors.accent]].map(([ax, val, col]) => (
                    <View key={ax as string} style={styles.axisItem}>
                      <Text style={[styles.axisLabel, { color: col as string }]}>{ax}</Text>
                      <Text style={[styles.axisVal, { color: col as string }]}>{(val as number).toFixed(1)}</Text>
                    </View>
                  ))}
                </View>
              </View>
            )}
          </View>
        </Animated.View>

        {/* ── Location ── */}
        <Animated.View entering={FadeInUp.duration(600).delay(200)} style={styles.section}>
          <View style={styles.sectionHeader}>
            <GeminiAccent />
            <Text style={styles.sectionTitle}>Location Context</Text>
            {location && <PulsingDot color={Colors.secondary} />}
          </View>
          <View style={styles.locCard}>
            {location ? (
              <View style={styles.locRow}>
                <MapPin color={Colors.secondary} size={18} />
                <View style={styles.locInfo}>
                  <Text style={styles.locCity}>{location.city}</Text>
                  <Text style={styles.locCoords}>{location.lat.toFixed(4)}, {location.lon.toFixed(4)}</Text>
                </View>
                <TouchableOpacity style={styles.mapBtn} onPress={() => Linking.openURL(`https://maps.google.com/?q=${location.lat},${location.lon}`)}>
                  <Navigation color={Colors.primary} size={14} />
                  <Text style={styles.mapBtnText}>Map</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <TouchableOpacity style={styles.locRequest} onPress={requestLocation} activeOpacity={0.8}>
                <MapPin color={Colors.primary} size={16} />
                <Text style={styles.locRequestText}>Tap to get your current location</Text>
              </TouchableOpacity>
            )}
          </View>
        </Animated.View>

        {/* ── Clipboard Log (real paste events) ── */}
        <Animated.View entering={FadeInUp.duration(600).delay(260)} style={styles.section}>
          <View style={styles.sectionHeader}>
            <GeminiAccent />
            <Text style={styles.sectionTitle}>Clipboard Log</Text>
            {clipLog.length > 0 && <PulsingDot color={Colors.primary} />}
          </View>
          {clipLog.length > 0 ? (
            <View style={styles.feedList}>
              {clipLog.map((c) => (
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
            <View style={styles.emptyCard}>
              <ClipboardList color={Colors.textTertiary} size={24} />
              <Text style={styles.emptyText}>Copy anything on this page — it will appear here instantly.</Text>
              <Text style={styles.emptyHint}>Real paste event monitoring is active.</Text>
            </View>
          )}
        </Animated.View>

        {/* ── Notification Status ── */}
        <Animated.View entering={FadeInUp.duration(600).delay(320)} style={styles.section}>
          <View style={styles.sectionHeader}>
            <GeminiAccent />
            <Text style={styles.sectionTitle}>Browser Notifications</Text>
          </View>
          <View style={styles.notifCard}>
            <View style={styles.notifRow}>
              <Bell color={notifPerm === 'granted' ? Colors.secondary : Colors.textTertiary} size={18} />
              <View style={styles.notifInfo}>
                <Text style={styles.notifTitle}>Permission Status</Text>
                <Text style={styles.notifSub}>
                  {notifPerm === 'granted'
                    ? 'Riuka will notify you when you get a response while in another tab.'
                    : 'Enable notifications in Settings → Browser Notifications.'}
                </Text>
              </View>
              <PermBadge granted={notifPerm === 'granted'} />
            </View>
          </View>
        </Animated.View>

        {/* ── Cross-App Links ── */}
        <Animated.View entering={FadeInUp.duration(600).delay(380)} style={styles.section}>
          <View style={styles.sectionHeader}>
            <GeminiAccent />
            <Text style={styles.sectionTitle}>Cross-App Links</Text>
          </View>
          <View style={styles.crossAppCard}>
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
  headerTitle: { fontSize: FontSizes.xxl, fontWeight: '800', letterSpacing: 3 },
  headerSubtitle: { fontSize: FontSizes.xs, color: Colors.secondary, fontWeight: '600', letterSpacing: 0.5, marginTop: 2 },
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

  // Permissions
  permGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  permItem: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: Colors.surface, borderRadius: BorderRadius.md, padding: 10, borderWidth: 1, borderColor: Colors.border, flex: 1, minWidth: '45%' },
  permLabel: { flex: 1, fontSize: FontSizes.xs, fontWeight: '600' },
  permBadge: { flexDirection: 'row', alignItems: 'center', gap: 3, borderRadius: BorderRadius.full, borderWidth: 1, paddingHorizontal: 5, paddingVertical: 2 },
  permText: { fontSize: 8, fontWeight: '800', letterSpacing: 0.3 },
  permHint: { fontSize: FontSizes.xs, color: Colors.textTertiary, marginTop: Spacing.sm, textAlign: 'center' },

  // Environment
  envCard: { backgroundColor: Colors.surface, borderRadius: BorderRadius.lg, padding: Spacing.lg, borderWidth: 1, borderColor: Colors.border },
  envGrid: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: Spacing.lg },
  envItem: { alignItems: 'center', gap: 3 },
  envValue: { fontSize: FontSizes.lg, fontWeight: '700' },
  envLabel: { fontSize: FontSizes.xs, color: Colors.textTertiary, textAlign: 'center' },
  motionRow: { marginTop: Spacing.md, paddingTop: Spacing.md, borderTopWidth: 1, borderTopColor: Colors.border },
  motionLabel: { fontSize: FontSizes.xs, color: Colors.textTertiary, fontWeight: '600', marginBottom: Spacing.sm },
  motionAxes: { flexDirection: 'row', gap: Spacing.lg },
  axisItem: { alignItems: 'center', gap: 2 },
  axisLabel: { fontSize: FontSizes.xs, fontWeight: '800' },
  axisVal: { fontSize: FontSizes.md, fontWeight: '700', fontVariant: ['tabular-nums'] as any },

  // Location
  locCard: { backgroundColor: Colors.surface, borderRadius: BorderRadius.lg, padding: Spacing.md, borderWidth: 1, borderColor: Colors.border },
  locRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md },
  locInfo: { flex: 1 },
  locCity: { fontSize: FontSizes.md, fontWeight: '600', color: Colors.text },
  locCoords: { fontSize: FontSizes.xs, color: Colors.textTertiary, marginTop: 2 },
  mapBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: Colors.primary + '15', borderRadius: BorderRadius.full, paddingHorizontal: 10, paddingVertical: 6, borderWidth: 1, borderColor: Colors.primary + '30' },
  mapBtnText: { fontSize: FontSizes.xs, color: Colors.primary, fontWeight: '700' },
  locRequest: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md, justifyContent: 'center', paddingVertical: Spacing.md },
  locRequestText: { fontSize: FontSizes.sm, color: Colors.primary, fontWeight: '600' },

  // Clipboard
  feedList: { gap: Spacing.md },
  clipCard: { backgroundColor: Colors.surface, borderRadius: BorderRadius.md, padding: Spacing.md, borderWidth: 1, borderColor: Colors.border, borderLeftWidth: 3, gap: 5 },
  clipTop: { flexDirection: 'row', alignItems: 'center', gap: Spacing.xs },
  clipTypeBadge: { borderRadius: BorderRadius.full, borderWidth: 1, paddingHorizontal: 6, paddingVertical: 2 },
  clipTypeText: { fontSize: 9, fontWeight: '800', letterSpacing: 0.5 },
  clipTime: { fontSize: FontSizes.xs, color: Colors.textTertiary },
  clipPreview: { fontSize: FontSizes.sm, color: Colors.text, fontWeight: '500', fontFamily: 'monospace' },
  clipAnalysis: { fontSize: FontSizes.xs, color: Colors.textTertiary, lineHeight: 16 },
  emptyCard: { backgroundColor: Colors.surface, borderRadius: BorderRadius.lg, padding: Spacing.xl, alignItems: 'center', gap: Spacing.sm, borderWidth: 1, borderColor: Colors.border },
  emptyText: { fontSize: FontSizes.sm, color: Colors.textTertiary, textAlign: 'center', lineHeight: 20 },
  emptyHint: { fontSize: FontSizes.xs, color: Colors.secondary, textAlign: 'center' },

  // Notification
  notifCard: { backgroundColor: Colors.surface, borderRadius: BorderRadius.lg, padding: Spacing.md, borderWidth: 1, borderColor: Colors.border },
  notifRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md },
  notifInfo: { flex: 1 },
  notifTitle: { fontSize: FontSizes.sm, fontWeight: '600', color: Colors.text },
  notifSub: { fontSize: FontSizes.xs, color: Colors.textTertiary, marginTop: 2, lineHeight: 16 },

  // Cross-app
  crossAppCard: { backgroundColor: Colors.surface, borderRadius: BorderRadius.lg, padding: Spacing.md, borderWidth: 1, borderColor: Colors.primary + '30' },
  crossAppDesc: { fontSize: FontSizes.xs, color: Colors.textTertiary, marginBottom: Spacing.md },
  deepLinkGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm },
  deepLinkChip: { flexDirection: 'row', alignItems: 'center', gap: 5, borderRadius: BorderRadius.full, borderWidth: 1, paddingHorizontal: 10, paddingVertical: 6 },
  deepLinkText: { fontSize: FontSizes.xs, fontWeight: '600' },
});
