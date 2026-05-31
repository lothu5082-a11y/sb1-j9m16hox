import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
  Linking,
  Platform,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, {
  FadeInUp,
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withTiming,
  Easing,
  interpolateColor,
} from 'react-native-reanimated';
import {
  MessageSquare, Youtube, Clock, Map, Smartphone,
  Settings, ChevronRight, CheckCircle, XCircle, History, Zap,
} from 'lucide-react-native';
import { Colors, Spacing, FontSizes, BorderRadius } from '../../constants/theme';

const GEMINI = ['#A855F7', '#3B82F6', '#10B981', '#EC4899', '#A855F7'] as const;

// ── Gemini color-cycling title ────────────────────────────────────────────────
function GeminiTitle({ text }: { text: string }) {
  const p = useSharedValue(0);
  React.useEffect(() => {
    p.value = withRepeat(withTiming(1, { duration: 4500, easing: Easing.linear }), -1, false);
  }, []);
  const s = useAnimatedStyle(() => ({
    color: interpolateColor(p.value, [0, 0.25, 0.5, 0.75, 1], [...GEMINI]),
  }));
  return <Animated.Text style={[styles.screenTitle, s]}>{text}</Animated.Text>;
}

// ── Section header ────────────────────────────────────────────────────────────
function SectionHeader({ label, icon: Icon }: { label: string; icon: React.ComponentType<any> }) {
  return (
    <View style={styles.sectionHeader}>
      <Icon size={14} color={Colors.primary} />
      <Text style={styles.sectionLabel}>{label.toUpperCase()}</Text>
    </View>
  );
}

// ── Action card ───────────────────────────────────────────────────────────────
function ActionCard({
  title,
  icon: Icon,
  delay,
  children,
}: {
  title: string;
  icon: React.ComponentType<any>;
  delay?: number;
  children: React.ReactNode;
}) {
  return (
    <Animated.View entering={FadeInUp.delay(delay ?? 0).duration(400)} style={styles.card}>
      <View style={styles.cardHeader}>
        <Icon size={18} color={Colors.primary} />
        <Text style={styles.cardTitle}>{title}</Text>
      </View>
      <View style={styles.cardBody}>{children}</View>
    </Animated.View>
  );
}

// ── Input component ───────────────────────────────────────────────────────────
function Field({
  placeholder,
  value,
  onChangeText,
  label,
  autoCapitalize,
}: {
  placeholder: string;
  value: string;
  onChangeText: (v: string) => void;
  label?: string;
  autoCapitalize?: 'none' | 'words' | 'sentences';
}) {
  return (
    <View style={styles.fieldWrap}>
      {label ? <Text style={styles.fieldLabel}>{label}</Text> : null}
      <TextInput
        style={styles.fieldInput}
        placeholder={placeholder}
        placeholderTextColor={Colors.textTertiary}
        value={value}
        onChangeText={onChangeText}
        autoCapitalize={autoCapitalize ?? 'sentences'}
      />
    </View>
  );
}

// ── Run button ────────────────────────────────────────────────────────────────
function RunButton({ label, onPress }: { label: string; onPress: () => void }) {
  return (
    <TouchableOpacity style={styles.runBtn} onPress={onPress} activeOpacity={0.8}>
      <Text style={styles.runBtnText}>{label}</Text>
    </TouchableOpacity>
  );
}

// ── Divider ───────────────────────────────────────────────────────────────────
function Divider() {
  return <View style={styles.divider} />;
}

// ── History item ──────────────────────────────────────────────────────────────
interface HistoryItem {
  id: string;
  action: string;
  detail: string;
  time: string;
  success: boolean;
}

// ── App names for "Open App" dropdown ────────────────────────────────────────
const APP_OPTIONS = [
  { label: 'WhatsApp', url: 'whatsapp://', fallback: 'https://web.whatsapp.com' },
  { label: 'YouTube', url: 'https://youtube.com', fallback: 'https://youtube.com' },
  { label: 'Spotify', url: 'spotify://', fallback: 'https://open.spotify.com' },
  { label: 'Gmail', url: 'https://mail.google.com', fallback: 'https://mail.google.com' },
  { label: 'Maps', url: 'https://maps.google.com', fallback: 'https://maps.google.com' },
  { label: 'Settings', url: 'android.settings.SETTINGS', fallback: 'app-settings:' },
];

// ── Main Automation screen ────────────────────────────────────────────────────
export default function AutomationScreen() {
  // WhatsApp
  const [waContact, setWaContact] = useState('');
  const [waMessage, setWaMessage] = useState('');

  // YouTube
  const [ytQuery, setYtQuery] = useState('');

  // Alarm
  const [alarmHour, setAlarmHour] = useState('7');
  const [alarmMinute, setAlarmMinute] = useState('00');

  // Navigation
  const [navDest, setNavDest] = useState('');

  // Open app
  const [selectedApp, setSelectedApp] = useState(0);

  // History
  const [history, setHistory] = useState<HistoryItem[]>([]);

  const addHistory = useCallback((action: string, detail: string, success: boolean) => {
    setHistory((prev) => [
      {
        id: `h_${Date.now()}`,
        action,
        detail,
        time: new Date().toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' }),
        success,
      },
      ...prev.slice(0, 4),
    ]);
  }, []);

  // WhatsApp send
  const handleWaSend = useCallback(async () => {
    if (!waContact.trim()) { Alert.alert('Missing contact', 'Enter a phone number or name.'); return; }
    const num = waContact.replace(/[^\d+]/g, '');
    const msg = encodeURIComponent(waMessage.trim());
    const url = num ? `https://wa.me/${num}${msg ? `?text=${msg}` : ''}` : `whatsapp://`;
    try {
      await Linking.openURL(url);
      addHistory('WhatsApp', `To: ${waContact}`, true);
    } catch {
      addHistory('WhatsApp', 'Failed to open', false);
    }
  }, [waContact, waMessage, addHistory]);

  // YouTube search
  const handleYtSearch = useCallback(async () => {
    if (!ytQuery.trim()) { Alert.alert('Enter a search query.'); return; }
    const q = encodeURIComponent(ytQuery.trim());
    try {
      const ytDeep = `vnd.youtube://results?search_query=${q}`;
      const ytWeb = `https://www.youtube.com/results?search_query=${q}`;
      const canDeep = await Linking.canOpenURL(ytDeep).catch(() => false);
      await Linking.openURL(canDeep ? ytDeep : ytWeb);
      addHistory('YouTube Search', ytQuery, true);
    } catch {
      addHistory('YouTube Search', 'Failed', false);
    }
  }, [ytQuery, addHistory]);

  // Set alarm
  const handleSetAlarm = useCallback(async () => {
    const h = parseInt(alarmHour, 10);
    const m = parseInt(alarmMinute, 10);
    if (isNaN(h) || isNaN(m) || h < 0 || h > 23 || m < 0 || m > 59) {
      Alert.alert('Invalid time', 'Enter a valid hour (0–23) and minute (0–59).');
      return;
    }
    if (Platform.OS === 'android') {
      try {
        await Linking.openURL(`intent:#Intent;action=android.intent.action.SET_ALARM;i.android.intent.extra.alarm.HOUR=${h};i.android.intent.extra.alarm.MINUTES=${m};end`);
        addHistory('Set Alarm', `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`, true);
        return;
      } catch {}
    }
    await Linking.openURL('https://www.online-stopwatch.com/alarm-clock/');
    addHistory('Set Alarm', `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')} (web fallback)`, true);
  }, [alarmHour, alarmMinute, addHistory]);

  // Navigate
  const handleNavigate = useCallback(async () => {
    if (!navDest.trim()) { Alert.alert('Enter a destination.'); return; }
    const dest = encodeURIComponent(navDest.trim());
    try {
      if (Platform.OS === 'android') {
        const gmapsIntent = `google.navigation:q=${dest}`;
        const canOpen = await Linking.canOpenURL(gmapsIntent).catch(() => false);
        if (canOpen) {
          await Linking.openURL(gmapsIntent);
          addHistory('Navigate', navDest, true);
          return;
        }
      }
      await Linking.openURL(`https://maps.google.com/maps?daddr=${dest}`);
      addHistory('Navigate', navDest, true);
    } catch {
      addHistory('Navigate', 'Failed', false);
    }
  }, [navDest, addHistory]);

  // Open app
  const handleOpenApp = useCallback(async () => {
    const app = APP_OPTIONS[selectedApp];
    try {
      const canOpen = await Linking.canOpenURL(app.url).catch(() => false);
      await Linking.openURL(canOpen ? app.url : app.fallback);
      addHistory('Open App', app.label, true);
    } catch {
      try { await Linking.openURL(app.fallback); addHistory('Open App', app.label, true); }
      catch { addHistory('Open App', `${app.label} failed`, false); }
    }
  }, [selectedApp, addHistory]);

  // Accessibility settings
  const handleGrantAccessibility = useCallback(async () => {
    if (Platform.OS === 'android') {
      try {
        await Linking.openURL('android.settings.ACCESSIBILITY_SETTINGS');
      } catch {
        Alert.alert('Could not open', 'Please open Settings > Accessibility manually.');
      }
    } else {
      Alert.alert('Android only', 'Accessibility Service is an Android-only feature.');
    }
  }, []);

  return (
    <View style={styles.root}>
      <LinearGradient colors={['#0B0B0A', '#0F0B18', '#0B0B0A']} style={StyleSheet.absoluteFill} />

      <View style={styles.header}>
        <GeminiTitle text="Automate" />
      </View>

      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
      >
        {/* QUICK ACTIONS */}
        <SectionHeader label="Quick Actions" icon={Zap} />

        {/* WhatsApp */}
        <ActionCard title="Text on WhatsApp" icon={MessageSquare} delay={0}>
          <Field
            label="Contact (phone number)"
            placeholder="+1234567890"
            value={waContact}
            onChangeText={setWaContact}
            autoCapitalize="none"
          />
          <Field
            label="Message"
            placeholder="Type your message..."
            value={waMessage}
            onChangeText={setWaMessage}
          />
          <RunButton label="Open WhatsApp" onPress={handleWaSend} />
        </ActionCard>

        {/* YouTube */}
        <ActionCard title="YouTube Search" icon={Youtube} delay={60}>
          <Field
            label="Search query"
            placeholder="lo-fi hip hop music"
            value={ytQuery}
            onChangeText={setYtQuery}
          />
          <RunButton label="Search YouTube" onPress={handleYtSearch} />
        </ActionCard>

        {/* Alarm */}
        <ActionCard title="Set Alarm" icon={Clock} delay={120}>
          <View style={styles.timeRow}>
            <View style={styles.timeField}>
              <Text style={styles.fieldLabel}>Hour (0–23)</Text>
              <TextInput
                style={styles.fieldInput}
                placeholder="7"
                placeholderTextColor={Colors.textTertiary}
                value={alarmHour}
                onChangeText={setAlarmHour}
                keyboardType="number-pad"
                maxLength={2}
              />
            </View>
            <Text style={styles.timeSep}>:</Text>
            <View style={styles.timeField}>
              <Text style={styles.fieldLabel}>Minute</Text>
              <TextInput
                style={styles.fieldInput}
                placeholder="00"
                placeholderTextColor={Colors.textTertiary}
                value={alarmMinute}
                onChangeText={setAlarmMinute}
                keyboardType="number-pad"
                maxLength={2}
              />
            </View>
          </View>
          <RunButton label="Set Alarm" onPress={handleSetAlarm} />
        </ActionCard>

        {/* Navigate */}
        <ActionCard title="Navigate to" icon={Map} delay={180}>
          <Field
            label="Destination"
            placeholder="Eiffel Tower, Paris"
            value={navDest}
            onChangeText={setNavDest}
          />
          <RunButton label="Open Google Maps" onPress={handleNavigate} />
        </ActionCard>

        {/* Open App */}
        <ActionCard title="Open App" icon={Smartphone} delay={240}>
          <Text style={styles.fieldLabel}>Select app</Text>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.appPickerRow}
          >
            {APP_OPTIONS.map((app, i) => (
              <TouchableOpacity
                key={app.label}
                style={[styles.appChip, i === selectedApp && styles.appChipActive]}
                onPress={() => setSelectedApp(i)}
                activeOpacity={0.7}
              >
                <Text style={[styles.appChipText, i === selectedApp && styles.appChipTextActive]}>
                  {app.label}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
          <RunButton label={`Open ${APP_OPTIONS[selectedApp].label}`} onPress={handleOpenApp} />
        </ActionCard>

        {/* ACCESSIBILITY ENGINE */}
        <SectionHeader label="Accessibility Engine" icon={Settings} />

        <Animated.View entering={FadeInUp.delay(300).duration(400)} style={styles.card}>
          <View style={styles.accessibilityRow}>
            <View style={styles.accLeft}>
              <View style={styles.accTitleRow}>
                <View style={styles.accStatusDot} />
                <Text style={styles.cardTitle}>Vexsora Accessibility Service</Text>
              </View>
              <Text style={styles.accDesc}>
                Required for auto-typing, screen reading, and full app control.
              </Text>
            </View>
          </View>
          <Divider />
          <TouchableOpacity style={styles.grantBtn} onPress={handleGrantAccessibility} activeOpacity={0.8}>
            <Settings size={16} color={Colors.primary} />
            <Text style={styles.grantBtnText}>Grant Permission</Text>
            <ChevronRight size={16} color={Colors.primary} />
          </TouchableOpacity>
          <View style={styles.infoBox}>
            <Text style={styles.infoText}>
              Tap "Grant Permission" → find "Vexsora" in the list → enable it. This allows Vexsora to auto-type, tap, and read on-screen content.
            </Text>
          </View>
        </Animated.View>

        {/* AUTOMATION HISTORY */}
        <SectionHeader label="Automation History" icon={History} />

        <Animated.View entering={FadeInUp.delay(360).duration(400)} style={styles.card}>
          {history.length === 0 ? (
            <View style={styles.emptyHistory}>
              <Text style={styles.emptyHistoryText}>No automation actions yet.</Text>
            </View>
          ) : (
            history.map((item, i) => (
              <React.Fragment key={item.id}>
                {i > 0 && <Divider />}
                <View style={styles.historyRow}>
                  {item.success ? (
                    <CheckCircle size={16} color="#10B981" />
                  ) : (
                    <XCircle size={16} color="#EF4444" />
                  )}
                  <View style={styles.historyText}>
                    <Text style={styles.historyAction}>{item.action}</Text>
                    <Text style={styles.historyDetail}>{item.detail}</Text>
                  </View>
                  <Text style={styles.historyTime}>{item.time}</Text>
                </View>
              </React.Fragment>
            ))
          )}
        </Animated.View>

        <View style={{ height: 40 }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#0B0B0A' },
  header: {
    paddingHorizontal: Spacing.md,
    paddingTop: Platform.OS === 'android' ? 52 : 60,
    paddingBottom: Spacing.md,
  },
  screenTitle: { fontSize: FontSizes.xxxl, fontWeight: '800', letterSpacing: 0.5 },
  scroll: { paddingHorizontal: Spacing.md, paddingBottom: Spacing.xxl },
  sectionHeader: {
    flexDirection: 'row', alignItems: 'center', gap: Spacing.xs,
    marginTop: Spacing.lg, marginBottom: Spacing.sm, paddingHorizontal: Spacing.xs,
  },
  sectionLabel: { fontSize: FontSizes.xs, fontWeight: '700', color: Colors.textTertiary, letterSpacing: 1.2 },
  card: {
    backgroundColor: '#1E1F20', borderRadius: BorderRadius.lg, overflow: 'hidden',
    borderWidth: 1, borderColor: 'rgba(168,85,247,0.08)', marginBottom: Spacing.sm,
  },
  cardHeader: {
    flexDirection: 'row', alignItems: 'center', gap: Spacing.sm,
    paddingHorizontal: Spacing.md, paddingTop: Spacing.md, paddingBottom: Spacing.sm,
  },
  cardTitle: { fontSize: FontSizes.md, fontWeight: '700', color: Colors.text },
  cardBody: { paddingHorizontal: Spacing.md, paddingBottom: Spacing.md },
  fieldWrap: { marginBottom: Spacing.sm },
  fieldLabel: { fontSize: FontSizes.xs, color: Colors.textTertiary, marginBottom: 4, fontWeight: '600', letterSpacing: 0.5 },
  fieldInput: {
    backgroundColor: 'rgba(255,255,255,0.05)', borderRadius: BorderRadius.sm,
    paddingHorizontal: Spacing.md, paddingVertical: Spacing.sm,
    color: Colors.text, fontSize: FontSizes.md, borderWidth: 1, borderColor: Colors.border,
  },
  runBtn: {
    backgroundColor: Colors.primary, borderRadius: BorderRadius.md,
    paddingVertical: Spacing.sm + 2, alignItems: 'center',
    shadowColor: '#A855F7', shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.4, shadowRadius: 8, elevation: 4,
    marginTop: Spacing.xs,
  },
  runBtnText: { color: '#fff', fontSize: FontSizes.md, fontWeight: '700' },
  timeRow: { flexDirection: 'row', alignItems: 'flex-end', gap: Spacing.sm, marginBottom: Spacing.sm },
  timeField: { flex: 1 },
  timeSep: { color: Colors.text, fontSize: FontSizes.xxl, fontWeight: '700', paddingBottom: Spacing.xs },
  appPickerRow: { gap: Spacing.sm, paddingBottom: Spacing.sm, flexDirection: 'row' },
  appChip: {
    paddingHorizontal: Spacing.md, paddingVertical: Spacing.xs + 2,
    borderRadius: BorderRadius.full, backgroundColor: 'rgba(255,255,255,0.05)',
    borderWidth: 1, borderColor: Colors.border,
  },
  appChipActive: { backgroundColor: 'rgba(168,85,247,0.2)', borderColor: Colors.primary },
  appChipText: { color: Colors.textSecondary, fontSize: FontSizes.sm, fontWeight: '500' },
  appChipTextActive: { color: Colors.primary, fontWeight: '700' },
  accessibilityRow: { padding: Spacing.md },
  accLeft: { flex: 1 },
  accTitleRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, marginBottom: 4 },
  accStatusDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#EF4444' },
  accDesc: { fontSize: FontSizes.sm, color: Colors.textSecondary, lineHeight: 18 },
  divider: { height: 1, backgroundColor: 'rgba(255,255,255,0.04)', marginHorizontal: Spacing.md },
  grantBtn: {
    flexDirection: 'row', alignItems: 'center', gap: Spacing.sm,
    paddingHorizontal: Spacing.md, paddingVertical: Spacing.sm + 2,
  },
  grantBtnText: { color: Colors.primary, fontSize: FontSizes.md, fontWeight: '600', flex: 1 },
  infoBox: {
    backgroundColor: 'rgba(168,85,247,0.08)', marginHorizontal: Spacing.md,
    marginBottom: Spacing.md, borderRadius: BorderRadius.sm, padding: Spacing.sm,
  },
  infoText: { color: Colors.textSecondary, fontSize: FontSizes.xs, lineHeight: 16 },
  emptyHistory: { paddingVertical: Spacing.xl, alignItems: 'center' },
  emptyHistoryText: { color: Colors.textTertiary, fontSize: FontSizes.sm },
  historyRow: {
    flexDirection: 'row', alignItems: 'center', gap: Spacing.sm,
    paddingHorizontal: Spacing.md, paddingVertical: Spacing.sm + 2,
  },
  historyText: { flex: 1 },
  historyAction: { fontSize: FontSizes.sm, color: Colors.text, fontWeight: '600' },
  historyDetail: { fontSize: FontSizes.xs, color: Colors.textTertiary },
  historyTime: { fontSize: FontSizes.xs, color: Colors.textTertiary },
});
