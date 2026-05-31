import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Linking,
  Platform,
  NativeModules,
} from 'react-native';

// Native hardware module — graceful fallback when not available
const HW: any = NativeModules.VexsoraHardware ?? null;
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
  Flashlight, Volume2, Bell, Battery, Zap, Activity,
  CheckCircle, XCircle, PhoneCall, PhoneOff, ChevronRight, Radio,
} from 'lucide-react-native';
import { Colors, Spacing, FontSizes, BorderRadius } from '../../constants/theme';

const GEMINI = ['#A855F7', '#3B82F6', '#10B981', '#EC4899', '#A855F7'] as const;

// ── Gemini color-cycling title ────────────────────────────────────────────────
function GeminiTitle({ text }: { text: string }) {
  const phase = useSharedValue(0);
  useEffect(() => {
    phase.value = withRepeat(withTiming(1, { duration: 4500, easing: Easing.linear }), -1, false);
  }, []);
  const aStyle = useAnimatedStyle(() => ({
    color: interpolateColor(phase.value, [0, 0.25, 0.5, 0.75, 1], [...GEMINI]),
  }));
  return <Animated.Text style={[styles.screenTitle, aStyle]}>{text}</Animated.Text>;
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

// ── Card wrapper ──────────────────────────────────────────────────────────────
function Card({ children, delay = 0 }: { children: React.ReactNode; delay?: number }) {
  return (
    <Animated.View entering={FadeInUp.delay(delay).duration(400)} style={styles.card}>
      {children}
    </Animated.View>
  );
}

// ── Pulsing status indicator ──────────────────────────────────────────────────
function PulsingDot({ active, color = '#10B981' }: { active: boolean; color?: string }) {
  const op = useSharedValue(active ? 1 : 0.3);
  useEffect(() => {
    if (active) {
      op.value = withRepeat(
        withSequence(
          withTiming(1, { duration: 700 }),
          withTiming(0.3, { duration: 700 })
        ),
        -1,
        false
      );
    } else {
      op.value = withTiming(0.3, { duration: 300 });
    }
  }, [active]);
  const s = useAnimatedStyle(() => ({ opacity: op.value }));
  return (
    <Animated.View
      style={[s, { width: 10, height: 10, borderRadius: 5, backgroundColor: active ? color : Colors.textTertiary }]}
    />
  );
}

// ── Glow toggle button ────────────────────────────────────────────────────────
function GlowToggle({ on, label, onLabel, offLabel, onPress }: {
  on: boolean; label?: string; onLabel: string; offLabel: string; onPress: () => void;
}) {
  const glow = useSharedValue(on ? 0.5 : 0);
  useEffect(() => {
    if (on) {
      glow.value = withRepeat(
        withSequence(withTiming(0.8, { duration: 1000 }), withTiming(0.3, { duration: 1000 })),
        -1,
        false
      );
    } else {
      glow.value = withTiming(0, { duration: 300 });
    }
  }, [on]);
  const glowStyle = useAnimatedStyle(() => ({
    shadowOpacity: glow.value,
  }));
  return (
    <Animated.View style={[glowStyle, { shadowColor: Colors.primary, shadowOffset: { width: 0, height: 0 }, shadowRadius: 16, elevation: on ? 8 : 0 }]}>
      <TouchableOpacity
        style={[styles.glowBtn, on && styles.glowBtnActive]}
        onPress={onPress}
        activeOpacity={0.8}
      >
        <Text style={[styles.glowBtnText, on && styles.glowBtnTextActive]}>{on ? onLabel : offLabel}</Text>
      </TouchableOpacity>
    </Animated.View>
  );
}

// ── Battery level bar ─────────────────────────────────────────────────────────
function BatteryBar({ level }: { level: number }) {
  const fillColor = level > 50 ? '#10B981' : level > 15 ? '#F59E0B' : '#EF4444';
  return (
    <View style={styles.batteryBarWrap}>
      <View style={styles.batteryBarOuter}>
        <View style={[styles.batteryBarFill, { width: `${level}%`, backgroundColor: fillColor }]} />
      </View>
      <Text style={[styles.batteryPct, { color: fillColor }]}>{level}%</Text>
    </View>
  );
}

// ── Volume slider (+ / - buttons) ─────────────────────────────────────────────
function VolumeControl() {
  const [volume, setVolume] = useState(70);
  const fillWidth = `${volume}%` as const;

  const changeVolume = useCallback(async (dir: 1 | -1) => {
    const next = Math.max(0, Math.min(100, volume + dir * 10));
    setVolume(next);
    if (Platform.OS === 'android' && HW) {
      try { await HW.adjustVolume(dir); } catch {}
    }
  }, [volume]);

  return (
    <View style={styles.volumeRow}>
      <TouchableOpacity style={styles.volBtn} onPress={() => changeVolume(-1)} activeOpacity={0.7}>
        <Text style={styles.volBtnText}>−</Text>
      </TouchableOpacity>
      <View style={styles.volTrack}>
        <View style={[styles.volFill, { width: fillWidth }]} />
      </View>
      <TouchableOpacity style={styles.volBtn} onPress={() => changeVolume(1)} activeOpacity={0.7}>
        <Text style={styles.volBtnText}>+</Text>
      </TouchableOpacity>
      <Text style={styles.volLabel}>{volume}%</Text>
    </View>
  );
}

// ── Main Sensors screen ───────────────────────────────────────────────────────
export default function SensorsScreen() {
  const [torchOn, setTorchOn] = useState(false);
  const [sensorActive, setSensorActive] = useState(false);
  const [shakeActive, setShakeActive] = useState(false);
  const [flipToMuteActive, setFlipToMuteActive] = useState(false);
  const [notifListenerActive, setNotifListenerActive] = useState(false);
  const [lastNotif, setLastNotif] = useState<string | null>(null);
  const [batteryLevel, setBatteryLevel] = useState(82);
  const [batteryCharging, setBatteryCharging] = useState(false);
  const torchStreamRef = useRef<MediaStream | null>(null);

  // Poll battery — native on Android, Web API on web
  useEffect(() => {
    const fetchBattery = async () => {
      if (Platform.OS === 'android' && HW) {
        try {
          const result = await HW.getBatteryLevel();
          if (result && typeof result.level === 'number') {
            setBatteryLevel(Math.round(result.level * 100));
            setBatteryCharging(!!result.isCharging);
          }
        } catch {}
      } else if (Platform.OS === 'web' && typeof window !== 'undefined') {
        try {
          const nav = navigator as any;
          if (nav.getBattery) {
            const b = await nav.getBattery();
            setBatteryLevel(Math.round(b.level * 100));
            setBatteryCharging(b.charging);
            b.addEventListener('levelchange', () => setBatteryLevel(Math.round(b.level * 100)));
            b.addEventListener('chargingchange', () => setBatteryCharging(b.charging));
          }
        } catch {}
      }
    };
    fetchBattery();
    // Refresh every 60 seconds
    const id = setInterval(fetchBattery, 60_000);
    return () => clearInterval(id);
  }, []);

  const batteryProfile = batteryLevel > 50 ? 'Normal' : batteryLevel > 15 ? 'Low Power' : 'Critical';
  const batteryProfileColor = batteryLevel > 50 ? '#10B981' : batteryLevel > 15 ? '#F59E0B' : '#EF4444';

  // Torch toggle
  const handleTorch = useCallback(async () => {
    const next = !torchOn;
    if (Platform.OS === 'android' && HW) {
      try { await HW.toggleFlashlight(next); } catch {}
      setTorchOn(next);
      return;
    }
    if (Platform.OS !== 'web') {
      setTorchOn(next);
      return;
    }
    // Web: use MediaDevices torch API
    try {
      if (next) {
        const stream = await (navigator.mediaDevices as any).getUserMedia({ video: { facingMode: { exact: 'environment' } } });
        const [track] = stream.getVideoTracks();
        const caps: any = (track as any).getCapabilities?.() ?? {};
        if (caps.torch) {
          await (track as any).applyConstraints({ advanced: [{ torch: true }] });
          torchStreamRef.current = stream;
          setTorchOn(true);
        } else {
          stream.getTracks().forEach((t: MediaStreamTrack) => t.stop());
        }
      } else {
        torchStreamRef.current?.getTracks().forEach((t) => t.stop());
        torchStreamRef.current = null;
        setTorchOn(false);
      }
    } catch {}
  }, [torchOn]);

  // Simulated last notification
  const handleReadNotif = useCallback(() => {
    setLastNotif('WhatsApp: "Hey, are you free tonight?"');
  }, []);

  return (
    <View style={styles.root}>
      <LinearGradient colors={['#0B0B0A', '#0F0B18', '#0B0B0A']} style={StyleSheet.absoluteFill} />

      <View style={styles.header}>
        <GeminiTitle text="Sensors" />
      </View>

      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
      >
        {/* HARDWARE CONTROLS */}
        <SectionHeader label="Hardware Controls" icon={Zap} />

        <Card delay={0}>
          {/* Flashlight */}
          <View style={styles.hwRow}>
            <View style={styles.hwRowLeft}>
              <Flashlight size={20} color={torchOn ? '#F59E0B' : Colors.textSecondary} />
              <View style={{ marginLeft: Spacing.sm }}>
                <Text style={styles.hwLabel}>Flashlight</Text>
                <Text style={styles.hwSub}>{torchOn ? 'ON' : 'OFF'}</Text>
              </View>
            </View>
            <GlowToggle
              on={torchOn}
              onLabel="Turn OFF"
              offLabel="Turn ON"
              onPress={handleTorch}
            />
          </View>

          <View style={styles.divider} />

          {/* Volume */}
          <View style={styles.hwRowVertical}>
            <View style={styles.hwRowLeft}>
              <Volume2 size={20} color={Colors.textSecondary} />
              <Text style={[styles.hwLabel, { marginLeft: Spacing.sm }]}>Volume</Text>
            </View>
            <VolumeControl />
          </View>

          <View style={styles.divider} />

          {/* Phone call actions */}
          <View style={styles.hwRow}>
            <View style={styles.hwRowLeft}>
              <PhoneCall size={20} color={Colors.textSecondary} />
              <View style={{ marginLeft: Spacing.sm }}>
                <Text style={styles.hwLabel}>Phone Call</Text>
                <Text style={styles.hwSub}>Requires AccessibilityService</Text>
              </View>
            </View>
            <View style={styles.callBtns}>
              <TouchableOpacity style={styles.answerBtn} activeOpacity={0.8}>
                <PhoneCall size={16} color="#fff" />
              </TouchableOpacity>
              <TouchableOpacity style={styles.hangupBtn} activeOpacity={0.8}>
                <PhoneOff size={16} color="#fff" />
              </TouchableOpacity>
            </View>
          </View>
        </Card>

        {/* GESTURE CONTROLS */}
        <SectionHeader label="Gesture Controls" icon={Activity} />

        <Card delay={80}>
          <View style={styles.hwRow}>
            <View style={styles.hwRowLeft}>
              <View style={{ marginRight: Spacing.sm }}>
                <PulsingDot active={shakeActive} color="#A855F7" />
              </View>
              <View>
                <Text style={styles.hwLabel}>Double-shake to wake</Text>
                <Text style={styles.hwSub}>{shakeActive ? 'Active — shake twice to open' : 'Inactive'}</Text>
              </View>
            </View>
            <GlowToggle
              on={shakeActive}
              onLabel="Stop"
              offLabel="Activate"
              onPress={() => setShakeActive((v) => !v)}
            />
          </View>

          <View style={styles.divider} />

          <View style={styles.hwRow}>
            <View style={styles.hwRowLeft}>
              <View style={{ marginRight: Spacing.sm }}>
                <PulsingDot active={flipToMuteActive} color="#3B82F6" />
              </View>
              <View>
                <Text style={styles.hwLabel}>Flip-to-mute</Text>
                <Text style={styles.hwSub}>{flipToMuteActive ? 'Active — face-down = silent' : 'Inactive'}</Text>
              </View>
            </View>
            <GlowToggle
              on={flipToMuteActive}
              onLabel="Stop"
              offLabel="Activate"
              onPress={() => setFlipToMuteActive((v) => !v)}
            />
          </View>

          <View style={styles.divider} />

          <View style={styles.hwRow}>
            <View style={styles.hwRowLeft}>
              <Radio size={20} color={sensorActive ? Colors.primary : Colors.textSecondary} />
              <View style={{ marginLeft: Spacing.sm }}>
                <Text style={styles.hwLabel}>Sensor monitoring</Text>
                <Text style={styles.hwSub}>{sensorActive ? 'Running' : 'Stopped'}</Text>
              </View>
            </View>
            <GlowToggle
              on={sensorActive}
              onLabel="Stop"
              offLabel="Start"
              onPress={() => setSensorActive((v) => !v)}
            />
          </View>
        </Card>

        {/* NOTIFICATIONS */}
        <SectionHeader label="Notifications" icon={Bell} />

        <Card delay={160}>
          <View style={styles.hwRow}>
            <View style={styles.hwRowLeft}>
              <PulsingDot active={notifListenerActive} color="#10B981" />
              <View style={{ marginLeft: Spacing.sm }}>
                <Text style={styles.hwLabel}>Notification Listener</Text>
                <Text style={styles.hwSub}>{notifListenerActive ? 'Active' : 'Not granted'}</Text>
              </View>
            </View>
            <TouchableOpacity
              style={styles.smallBtn}
              activeOpacity={0.8}
              onPress={async () => {
                if (Platform.OS === 'android') {
                  try {
                    await Linking.openURL('android.settings.ACTION_NOTIFICATION_LISTENER_SETTINGS');
                  } catch {
                    setNotifListenerActive((v) => !v);
                  }
                } else {
                  setNotifListenerActive((v) => !v);
                }
              }}
            >
              <Text style={styles.smallBtnText}>Grant</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.divider} />

          <View style={styles.notifPreview}>
            <Text style={styles.notifLabel}>Last notification</Text>
            <Text style={styles.notifText}>
              {lastNotif ?? '— No notification captured yet —'}
            </Text>
          </View>

          <View style={styles.divider} />

          <TouchableOpacity style={styles.readAloudBtn} onPress={handleReadNotif} activeOpacity={0.8}>
            <Bell size={16} color={Colors.primary} />
            <Text style={styles.readAloudBtnText}>Read aloud</Text>
          </TouchableOpacity>
        </Card>

        {/* BATTERY & THERMAL */}
        <SectionHeader label="Battery & Thermal" icon={Battery} />

        <Card delay={240}>
          <View style={styles.hwRowVertical}>
            <View style={styles.hwRowLeft}>
              <Battery size={20} color={batteryProfileColor} />
              <Text style={[styles.hwLabel, { marginLeft: Spacing.sm }]}>Battery level</Text>
            </View>
            <BatteryBar level={batteryLevel} />
          </View>

          <View style={styles.divider} />

          <View style={styles.hwRow}>
            <View style={styles.hwRowLeft}>
              <Zap size={18} color={batteryCharging ? '#10B981' : Colors.textSecondary} />
              <View style={{ marginLeft: Spacing.sm }}>
                <Text style={styles.hwLabel}>Profile</Text>
              </View>
            </View>
            <View
              style={[
                styles.profileBadge,
                { backgroundColor: `${batteryProfileColor}22`, borderColor: `${batteryProfileColor}55` },
              ]}
            >
              <Text style={[styles.profileBadgeText, { color: batteryProfileColor }]}>{batteryProfile}</Text>
            </View>
          </View>

          <View style={styles.divider} />

          <View style={styles.hwRow}>
            <View style={styles.hwRowLeft}>
              <Activity size={18} color={Colors.textSecondary} />
              <Text style={[styles.hwLabel, { marginLeft: Spacing.sm }]}>Temperature</Text>
            </View>
            <Text style={styles.hwSub}>Monitoring...</Text>
          </View>

          {batteryCharging && (
            <>
              <View style={styles.divider} />
              <View style={styles.hwRow}>
                <View style={styles.hwRowLeft}>
                  <Zap size={18} color="#10B981" />
                  <Text style={[styles.hwLabel, { marginLeft: Spacing.sm, color: '#10B981' }]}>Charging</Text>
                </View>
              </View>
            </>
          )}
        </Card>

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
    borderWidth: 1, borderColor: 'rgba(168,85,247,0.08)',
  },
  divider: { height: 1, backgroundColor: 'rgba(255,255,255,0.04)', marginHorizontal: Spacing.md },
  hwRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: Spacing.md, paddingVertical: Spacing.sm + 2,
  },
  hwRowVertical: { paddingHorizontal: Spacing.md, paddingVertical: Spacing.sm + 2 },
  hwRowLeft: { flexDirection: 'row', alignItems: 'center', flex: 1 },
  hwLabel: { fontSize: FontSizes.md, color: Colors.text, fontWeight: '500' },
  hwSub: { fontSize: FontSizes.xs, color: Colors.textTertiary, marginTop: 1 },
  glowBtn: {
    paddingHorizontal: Spacing.md, paddingVertical: Spacing.xs + 2,
    borderRadius: BorderRadius.full, backgroundColor: 'rgba(255,255,255,0.06)',
    borderWidth: 1, borderColor: Colors.border,
  },
  glowBtnActive: {
    backgroundColor: 'rgba(168,85,247,0.2)', borderColor: Colors.primary,
  },
  glowBtnText: { fontSize: FontSizes.sm, color: Colors.textSecondary, fontWeight: '600' },
  glowBtnTextActive: { color: Colors.primary },
  callBtns: { flexDirection: 'row', gap: Spacing.sm },
  answerBtn: { width: 36, height: 36, borderRadius: 18, backgroundColor: '#10B981', alignItems: 'center', justifyContent: 'center' },
  hangupBtn: { width: 36, height: 36, borderRadius: 18, backgroundColor: '#EF4444', alignItems: 'center', justifyContent: 'center' },
  volumeRow: { flexDirection: 'row', alignItems: 'center', marginTop: Spacing.sm, gap: Spacing.sm },
  volBtn: {
    width: 32, height: 32, borderRadius: 16, backgroundColor: 'rgba(168,85,247,0.15)',
    alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: 'rgba(168,85,247,0.3)',
  },
  volBtnText: { color: Colors.primary, fontSize: FontSizes.lg, fontWeight: '700', lineHeight: 22 },
  volTrack: { flex: 1, height: 6, backgroundColor: 'rgba(255,255,255,0.1)', borderRadius: 3, overflow: 'hidden' },
  volFill: { height: '100%', backgroundColor: Colors.primary, borderRadius: 3 },
  volLabel: { color: Colors.textSecondary, fontSize: FontSizes.sm, width: 38, textAlign: 'right' },
  batteryBarWrap: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, marginTop: Spacing.sm },
  batteryBarOuter: { flex: 1, height: 10, backgroundColor: 'rgba(255,255,255,0.08)', borderRadius: 5, overflow: 'hidden' },
  batteryBarFill: { height: '100%', borderRadius: 5 },
  batteryPct: { fontSize: FontSizes.sm, fontWeight: '600', width: 38, textAlign: 'right' },
  profileBadge: {
    paddingHorizontal: Spacing.sm, paddingVertical: 4,
    borderRadius: BorderRadius.full, borderWidth: 1,
  },
  profileBadgeText: { fontSize: FontSizes.xs, fontWeight: '700' },
  smallBtn: {
    paddingHorizontal: Spacing.md, paddingVertical: Spacing.xs + 2,
    backgroundColor: 'rgba(168,85,247,0.15)', borderRadius: BorderRadius.full,
    borderWidth: 1, borderColor: 'rgba(168,85,247,0.4)',
  },
  smallBtnText: { color: Colors.primary, fontSize: FontSizes.sm, fontWeight: '600' },
  notifPreview: { paddingHorizontal: Spacing.md, paddingVertical: Spacing.sm + 2 },
  notifLabel: { fontSize: FontSizes.xs, color: Colors.textTertiary, marginBottom: 4 },
  notifText: { fontSize: FontSizes.sm, color: Colors.textSecondary, fontStyle: 'italic' },
  readAloudBtn: {
    flexDirection: 'row', alignItems: 'center', gap: Spacing.sm,
    paddingHorizontal: Spacing.md, paddingVertical: Spacing.sm + 2,
  },
  readAloudBtnText: { color: Colors.primary, fontSize: FontSizes.md, fontWeight: '600' },
});
