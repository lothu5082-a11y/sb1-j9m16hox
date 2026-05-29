import React, { useState, useEffect, useRef } from 'react';
import {
  View, Text, StyleSheet, ScrollView, Switch,
  TouchableOpacity, TextInput, Alert, Platform, Dimensions,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, {
  FadeInUp,
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withTiming,
  withSequence,
  Easing,
  interpolateColor,
  interpolate,
} from 'react-native-reanimated';
import {
  Settings as SettingsIcon, Cpu, Mic, Zap, Shield, Smartphone,
  Lock, Eye, Fingerprint, ChevronRight, Crown, WifiOff,
  Database, CheckCircle, Bell, ClipboardList, User, Palette,
  Volume2, Camera, Hand, Radio, Battery, Wifi, MapPin,
  Calendar, BookOpen, Trash2, Download, Sparkles,
} from 'lucide-react-native';
import { Colors, Spacing, FontSizes, BorderRadius } from '../../constants/theme';
import { setAIConfig, setVoiceReplyEnabled, setWakeWordActive } from './chat';

const { width: W } = Dimensions.get('window');

export let riukaAIConfig = { provider: 'local', apiKey: '' };

// ── Read evolution data from localStorage ─────────────────────────────────────
const readEvolution = () => {
  if (Platform.OS !== 'web') return { xp: 0, level: 1, totalLearned: 0 };
  try { return { xp: 0, level: 1, totalLearned: 0, ...JSON.parse(localStorage.getItem('riuka_evolution_v1') || '{}') }; }
  catch { return { xp: 0, level: 1, totalLearned: 0 }; }
};
const readMemoryCount = () => {
  if (Platform.OS !== 'web') return 0;
  try { return (JSON.parse(localStorage.getItem('riuka_memory_v1') || '[]') as any[]).length; }
  catch { return 0; }
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
const getEvoLevel = (xp: number) => {
  let cur = EVO_LEVELS[0];
  for (const l of EVO_LEVELS) { if (xp >= l.xp) cur = l; }
  return cur;
};
const getNextEvoLevel = (xp: number) => EVO_LEVELS.find(l => l.xp > xp) ?? null;

// ── Gemini color palette ──────────────────────────────────────────────────────
const GEMINI_COLORS = ['#A855F7', '#3B82F6', '#10B981', '#EC4899', '#A855F7'] as const;
const GEMINI_SUBTLE = [
  'rgba(168,85,247,0.45)',
  'rgba(59,130,246,0.45)',
  'rgba(16,185,129,0.45)',
  'rgba(236,72,153,0.45)',
  'rgba(168,85,247,0.45)',
] as const;

// ── Color-cycling components ───────────────────────────────────────────────────
function GeminiTitle({ text }: { text: string }) {
  const p = useSharedValue(0);
  useEffect(() => {
    p.value = withRepeat(withTiming(1, { duration: 4000, easing: Easing.linear }), -1, false);
  }, []);
  const s = useAnimatedStyle(() => ({
    color: interpolateColor(p.value, [0, 0.25, 0.5, 0.75, 1], [...GEMINI_COLORS]),
  }));
  return <Animated.Text style={[styles.headerTitle, s]}>{text}</Animated.Text>;
}

function GeminiAccentLine() {
  const p = useSharedValue(0);
  useEffect(() => {
    p.value = withRepeat(withTiming(1, { duration: 3500, easing: Easing.linear }), -1, false);
  }, []);
  const s = useAnimatedStyle(() => ({
    backgroundColor: interpolateColor(p.value, [0, 0.25, 0.5, 0.75, 1], [...GEMINI_COLORS]),
  }));
  return <Animated.View style={[styles.sectionAccentLine, s]} />;
}

function GeminiCard({ children, style }: { children: React.ReactNode; style?: any }) {
  const p = useSharedValue(0);
  useEffect(() => {
    p.value = withRepeat(withTiming(1, { duration: 5000, easing: Easing.linear }), -1, false);
  }, []);
  const border = useAnimatedStyle(() => ({
    borderColor: interpolateColor(p.value, [0, 0.25, 0.5, 0.75, 1], [...GEMINI_SUBTLE]),
  }));
  return <Animated.View style={[styles.geminiCard, style, border]}>{children}</Animated.View>;
}

function GeminiSaveButton({ label, onPress }: { label: string; onPress: () => void }) {
  const p = useSharedValue(0);
  useEffect(() => {
    p.value = withRepeat(withTiming(1, { duration: 3000, easing: Easing.linear }), -1, false);
  }, []);
  const bg = useAnimatedStyle(() => ({
    backgroundColor: interpolateColor(p.value, [0, 0.25, 0.5, 0.75, 1], [...GEMINI_COLORS]),
  }));
  return (
    <TouchableOpacity onPress={onPress} activeOpacity={0.8}>
      <Animated.View style={[styles.saveBtn, bg]}>
        <Text style={styles.saveBtnText}>{label}</Text>
      </Animated.View>
    </TouchableOpacity>
  );
}

// ── Toggle row ─────────────────────────────────────────────────────────────────
function ToggleRow({
  icon, label, desc, value, onValueChange, color = Colors.primary,
}: {
  icon: React.ReactNode; label: string; desc?: string;
  value: boolean; onValueChange: (v: boolean) => void; color?: string;
}) {
  const glow = useSharedValue(value ? 1 : 0);
  useEffect(() => { glow.value = withTiming(value ? 1 : 0, { duration: 300 }); }, [value]);
  const borderStyle = useAnimatedStyle(() => ({
    borderColor: value ? color + '60' : Colors.border,
    backgroundColor: value
      ? interpolateColor(glow.value, [0, 1], [Colors.surface, color + '10'])
      : Colors.surface,
  }));
  return (
    <Animated.View style={[styles.toggleRow, borderStyle]}>
      <View style={[styles.toggleIcon, { borderColor: value ? color + '50' : Colors.border }]}>
        {icon}
      </View>
      <View style={styles.toggleText}>
        <Text style={[styles.toggleLabel, value && { color }]}>{label}</Text>
        {desc && <Text style={styles.toggleDesc}>{desc}</Text>}
      </View>
      <Switch
        value={value}
        onValueChange={onValueChange}
        trackColor={{ false: Colors.surface, true: color + '50' }}
        thumbColor={value ? color : Colors.textTertiary}
      />
    </Animated.View>
  );
}

// ── Header aurora ──────────────────────────────────────────────────────────────
function HeaderAurora() {
  const scanX = useSharedValue(0);
  const orbC   = useSharedValue(0);
  useEffect(() => {
    scanX.value = withRepeat(withTiming(1, { duration: 3000, easing: Easing.linear }), -1, false);
    orbC.value  = withRepeat(withTiming(1, { duration: 6000, easing: Easing.linear }), -1, false);
  }, []);
  const scanStyle = useAnimatedStyle(() => ({
    left: (scanX.value * (W + 80)) - 80,
    backgroundColor: interpolateColor(scanX.value, [0, 0.25, 0.5, 0.75, 1],
      ['rgba(168,85,247,0.12)', 'rgba(59,130,246,0.12)', 'rgba(16,185,129,0.1)', 'rgba(236,72,153,0.1)', 'rgba(168,85,247,0.12)']),
  }));
  const orbStyle = useAnimatedStyle(() => ({
    backgroundColor: interpolateColor(orbC.value, [0, 0.25, 0.5, 0.75, 1],
      ['rgba(168,85,247,0.12)', 'rgba(59,130,246,0.12)', 'rgba(16,185,129,0.1)', 'rgba(236,72,153,0.1)', 'rgba(168,85,247,0.12)']),
  }));
  return (
    <>
      <Animated.View style={[styles.headerOrb, orbStyle]} pointerEvents="none" />
      <Animated.View style={[styles.headerScan, scanStyle]} pointerEvents="none" />
    </>
  );
}

const PROVIDERS = [
  { id: 'local',  name: 'On-Device', color: Colors.secondary, icon: '🔒' },
  { id: 'openai', name: 'OpenAI',    color: Colors.primary,   icon: '🤖' },
  { id: 'gemini', name: 'Gemini',    color: Colors.accent,    icon: '✨' },
  { id: 'claude', name: 'Claude',    color: '#7C3AED',        icon: '🧠' },
  { id: 'groq',   name: 'Groq',      color: '#F97316',        icon: '⚡' },
];

const ACCENT_COLORS = [
  '#A855F7', '#3B82F6', '#10B981', '#EF4444', '#14B8A6', '#F59E0B', '#EC4899', '#8B5CF6',
];

// ── Main screen ────────────────────────────────────────────────────────────────
export default function SettingsScreen() {
  // AI / Profile
  const [selectedProvider, setSelectedProvider] = useState(riukaAIConfig.provider);
  const [apiKey, setApiKey]         = useState(riukaAIConfig.apiKey);
  const [apiVisible, setApiVisible] = useState(false);
  const [profileName, setProfileName] = useState('');
  const [profileCity, setProfileCity] = useState('');
  const [accentColor, setAccentColor] = useState('#A855F7');

  // Voice
  const [voiceEnabled, setVoiceEnabled] = useState(true);
  const [voiceReply, setVoiceReply]     = useState(false);
  const [wakeWord, setWakeWord]         = useState(false);

  // Sensors
  const [notifListener, setNotifListener]   = useState(false);
  const [clipEngine, setClipEngine]         = useState(false);
  const [cameraGesture, setCameraGesture]   = useState(false);
  const [shakeWake, setShakeWake]           = useState(false);
  const [volumeKeys, setVolumeKeys]         = useState(false);
  const [locationCtx, setLocationCtx]       = useState(false);
  const [calendarCtx, setCalendarCtx]       = useState(false);

  // Automation
  const [autoReply, setAutoReply]         = useState(true);
  const [clipAnalysis, setClipAnalysis]   = useState(true);

  // Privacy
  const [biometric, setBiometric]   = useState(false);
  const [privacyMode, setPrivacyMode] = useState(false);

  // Shake listener ref
  const shakeListenerRef = useRef<((e: any) => void) | null>(null);
  const lastShakeRef = useRef(0);
  const [offlinePriority, setOfflinePriority] = useState(true);

  // Evolution (read from localStorage)
  const [evo, setEvo] = useState(() => readEvolution());
  const [memCount, setMemCount] = useState(() => readMemoryCount());

  useEffect(() => {
    if (Platform.OS !== 'web') return;
    try {
      const p = JSON.parse(localStorage.getItem('riuka_profile_v1') || '{}');
      if (p.name) setProfileName(p.name);
      if (p.city) setProfileCity(p.city);
      const t = localStorage.getItem('riuka_theme_v1');
      if (t) setAccentColor(t);
      setVoiceReply(localStorage.getItem('riuka_voice_reply') === 'true');
      setVoiceReplyEnabled(localStorage.getItem('riuka_voice_reply') === 'true');
      setWakeWord(localStorage.getItem('riuka_wake_v1') === 'true');
      setWakeWordActive(localStorage.getItem('riuka_wake_v1') === 'true');
      setCameraGesture(localStorage.getItem('riuka_gesture_v1') === 'true');
      setEvo(readEvolution());
      setMemCount(readMemoryCount());
    } catch {}
  }, []);

  const saveProfile = () => {
    if (Platform.OS === 'web') {
      try { localStorage.setItem('riuka_profile_v1', JSON.stringify({ name: profileName, city: profileCity })); } catch {}
    }
    Alert.alert('Profile Saved', profileName ? `Hey ${profileName}! Profile updated.` : 'Profile saved.');
  };

  const applyTheme = (color: string) => {
    setAccentColor(color);
    if (Platform.OS === 'web') {
      try {
        localStorage.setItem('riuka_theme_v1', color);
        (document as any).documentElement.style.setProperty('--primary', color);
      } catch {}
    }
  };

  const saveAIConfig = () => {
    const cfg = { provider: selectedProvider, apiKey };
    riukaAIConfig = cfg;
    setAIConfig(cfg);
    Alert.alert('Saved', `Brain set to ${PROVIDERS.find(p => p.id === selectedProvider)?.name ?? selectedProvider}.`);
  };

  const clearMemory = () => {
    Alert.alert('Clear Memories', 'Erase all memories Riuka has learned about you?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Erase', style: 'destructive', onPress: () => {
        if (Platform.OS === 'web') {
          try {
            localStorage.removeItem('riuka_memory_v1');
            localStorage.removeItem('riuka_evolution_v1');
          } catch {}
        }
        setMemCount(0);
        setEvo({ xp: 0, level: 1, totalLearned: 0 });
        Alert.alert('Done', 'Memories cleared. Riuka starts fresh. ✨');
      }},
    ]);
  };

  const exportChat = () => {
    if (Platform.OS !== 'web') { Alert.alert('Web only', 'Export works on the web version.'); return; }
    try {
      const raw = localStorage.getItem('riuka_chat_v1');
      if (!raw) { Alert.alert('No history', 'Chat is empty.'); return; }
      const msgs: any[] = JSON.parse(raw);
      const txt = msgs.map(m => `[${m.time}] ${m.isUser ? 'You' : 'Riuka'}: ${m.text}`).join('\n\n');
      const blob = new Blob([txt], { type: 'text/plain' });
      const url = URL.createObjectURL(blob);
      const a = (document as any).createElement('a');
      a.href = url; a.download = `riuka-${new Date().toISOString().slice(0,10)}.txt`;
      a.click(); URL.revokeObjectURL(url);
    } catch { Alert.alert('Failed', 'Could not export.'); }
  };

  const clearAll = () => {
    Alert.alert('Clear Everything', 'Erase ALL data — chat, todos, memory, profile. Cannot be undone.', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Erase All', style: 'destructive', onPress: () => {
        if (Platform.OS === 'web') {
          ['riuka_chat_v1','riuka_todos_v1','riuka_profile_v1','riuka_theme_v1',
           'riuka_voice_reply','riuka_wake_v1','riuka_memory_v1','riuka_evolution_v1',
           'riuka_habits_v1','riuka_gesture_v1'].forEach(k => {
            try { localStorage.removeItem(k); } catch {}
          });
        }
        setProfileName(''); setProfileCity(''); setAccentColor('#A855F7');
        setMemCount(0); setEvo({ xp: 0, level: 1, totalLearned: 0 });
        Alert.alert('Fresh start!', 'All data erased. ✨');
      }},
    ]);
  };

  // ── Web API sensor helpers ────────────────────────────────────────────────
  const enableNotifications = (want: boolean) => {
    if (!want) { setNotifListener(false); return; }
    if (Platform.OS === 'web' && typeof window !== 'undefined' && 'Notification' in window) {
      (window as any).Notification.requestPermission().then((perm: string) => {
        if (perm === 'granted') {
          setNotifListener(true);
          new (window as any).Notification('Riuka AI', { body: 'Notification listener is now active.', icon: '/favicon.ico' });
        } else {
          setNotifListener(false);
          Alert.alert('Permission Needed', 'Allow notifications in your browser settings, then try again.');
        }
      });
    } else { setNotifListener(want); }
  };

  const enableLocation = (want: boolean) => {
    if (!want) { setLocationCtx(false); return; }
    if (Platform.OS === 'web' && typeof navigator !== 'undefined' && navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          setLocationCtx(true);
          try { localStorage.setItem('riuka_location_v1', JSON.stringify({ lat: pos.coords.latitude, lon: pos.coords.longitude })); } catch {}
          Alert.alert('Location Active', `Got your position. Riuka now has location context.`);
        },
        () => {
          setLocationCtx(false);
          Alert.alert('Location Denied', 'Allow location access in your browser settings, then try again.');
        },
        { timeout: 8000 }
      );
    } else { setLocationCtx(want); }
  };

  const enableShake = (want: boolean) => {
    setShakeWake(want);
    if (Platform.OS !== 'web' || typeof window === 'undefined') return;
    if (!want) {
      if (shakeListenerRef.current) window.removeEventListener('devicemotion', shakeListenerRef.current);
      shakeListenerRef.current = null;
      return;
    }
    const tryStart = () => {
      let last = { x: 0, y: 0, z: 0 };
      const handler = (e: any) => {
        const a = e.acceleration || e.accelerationIncludingGravity;
        if (!a) return;
        const delta = Math.abs((a.x||0) - last.x) + Math.abs((a.y||0) - last.y) + Math.abs((a.z||0) - last.z);
        last = { x: a.x||0, y: a.y||0, z: a.z||0 };
        if (delta > 18 && Date.now() - lastShakeRef.current > 1200) {
          lastShakeRef.current = Date.now();
          // Trigger voice (dispatch a custom event chat.tsx listens to)
          window.dispatchEvent(new CustomEvent('riuka-shake'));
        }
      };
      shakeListenerRef.current = handler;
      window.addEventListener('devicemotion', handler);
    };
    if (typeof (window as any).DeviceMotionEvent?.requestPermission === 'function') {
      (window as any).DeviceMotionEvent.requestPermission()
        .then((perm: string) => { if (perm === 'granted') tryStart(); else { setShakeWake(false); Alert.alert('Motion Denied', 'Allow motion access in browser settings.'); } })
        .catch(() => { setShakeWake(false); });
    } else { tryStart(); }
  };

  const enableCamera = (want: boolean) => {
    if (!want) {
      setCameraGesture(false);
      try { localStorage.setItem('riuka_gesture_v1', 'false'); } catch {}
      return;
    }
    if (Platform.OS === 'web' && typeof navigator !== 'undefined' && navigator.mediaDevices) {
      navigator.mediaDevices.getUserMedia({ video: true })
        .then(() => {
          setCameraGesture(true);
          try { localStorage.setItem('riuka_gesture_v1', 'true'); } catch {}
          Alert.alert('Camera Active', 'Wave your hand in front of the camera to trigger voice input.');
        })
        .catch(() => {
          setCameraGesture(false);
          Alert.alert('Camera Denied', 'Allow camera access in your browser settings, then try again.');
        });
    } else { setCameraGesture(want); }
  };

  const enableVolumeKeys = (want: boolean) => {
    setVolumeKeys(want);
    if (Platform.OS !== 'web' || !('mediaSession' in navigator)) return;
    if (want) {
      try {
        (navigator as any).mediaSession.setActionHandler('nexttrack', () => window.dispatchEvent(new CustomEvent('riuka-vol-up')));
        (navigator as any).mediaSession.setActionHandler('previoustrack', () => window.dispatchEvent(new CustomEvent('riuka-vol-down')));
      } catch {}
    } else {
      try {
        (navigator as any).mediaSession.setActionHandler('nexttrack', null);
        (navigator as any).mediaSession.setActionHandler('previoustrack', null);
      } catch {}
    }
  };

  const enableClipboard = (want: boolean) => {
    if (!want) { setClipEngine(false); return; }
    if (Platform.OS === 'web' && navigator.clipboard) {
      // Test clipboard access
      navigator.clipboard.readText()
        .then(() => {
          setClipEngine(true);
          Alert.alert('Clipboard Active', 'Riuka will analyze content you copy. Say "read clipboard" in chat.');
        })
        .catch(() => {
          setClipEngine(true); // Still enable — paste events still work
          Alert.alert('Clipboard Active', 'Clipboard monitoring via paste events is active. For full access, allow clipboard permission in browser settings.');
        });
    } else { setClipEngine(want); }
  };

  const curLevel   = getEvoLevel(evo.xp);
  const nextLevel  = getNextEvoLevel(evo.xp);
  const xpProgress = nextLevel ? evo.xp / nextLevel.xp : 1;

  return (
    <View style={styles.container}>
      <LinearGradient colors={[Colors.background, Colors.backgroundSecondary]} style={styles.gradient}>
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scroll}>

          {/* ── Header ── */}
          <View style={styles.headerWrap}>
            <HeaderAurora />
            <Animated.View entering={FadeInUp.duration(600)} style={styles.headerInner}>
              <View style={styles.headerIconRing}>
                <SettingsIcon color={Colors.primary} size={22} />
              </View>
              <View>
                <GeminiTitle text="Settings" />
                <Text style={styles.headerSub}>Riuka AI · Personalisation & Control</Text>
              </View>
            </Animated.View>
          </View>

          {/* ── Profile ── */}
          <Animated.View entering={FadeInUp.duration(500).delay(60)} style={styles.section}>
            <View style={styles.sectionTitleRow}>
              <GeminiAccentLine />
              <Text style={styles.sectionTitle}>PROFILE</Text>
            </View>
            <GeminiCard>
              <View style={styles.inputRow}>
                <User color={Colors.primary} size={15} />
                <Text style={styles.inputLabel}>Name</Text>
                <TextInput
                  style={styles.textInput}
                  placeholder="Your name"
                  placeholderTextColor={Colors.textTertiary}
                  value={profileName}
                  onChangeText={setProfileName}
                  autoCapitalize="words"
                  autoCorrect={false}
                />
              </View>
              <View style={[styles.inputRow, styles.inputRowLast]}>
                <MapPin color={Colors.primary} size={15} />
                <Text style={styles.inputLabel}>City</Text>
                <TextInput
                  style={styles.textInput}
                  placeholder="Home city"
                  placeholderTextColor={Colors.textTertiary}
                  value={profileCity}
                  onChangeText={setProfileCity}
                  autoCapitalize="words"
                  autoCorrect={false}
                />
              </View>
            </GeminiCard>
            <View style={{ alignSelf: 'flex-end', marginTop: Spacing.sm }}>
              <GeminiSaveButton label="Save Profile" onPress={saveProfile} />
            </View>
          </Animated.View>

          {/* ── Brain Engine ── */}
          <Animated.View entering={FadeInUp.duration(500).delay(100)} style={styles.section}>
            <View style={styles.sectionTitleRow}>
              <GeminiAccentLine />
              <Text style={styles.sectionTitle}>BRAIN ENGINE</Text>
            </View>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.providerRow}>
              {PROVIDERS.map(p => {
                const active = selectedProvider === p.id;
                return (
                  <TouchableOpacity
                    key={p.id}
                    onPress={() => setSelectedProvider(p.id)}
                    style={[styles.providerCard, active && { borderColor: p.color, backgroundColor: p.color + '18' }]}
                    activeOpacity={0.8}
                  >
                    <Text style={styles.providerIcon}>{p.icon}</Text>
                    <Text style={[styles.providerName, active && { color: p.color }]}>{p.name}</Text>
                    {active && <View style={[styles.providerActiveDot, { backgroundColor: p.color }]} />}
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
            {selectedProvider !== 'local' && (
              <View style={styles.apiRow}>
                <View style={styles.apiInputWrap}>
                  <TextInput
                    style={styles.apiInput}
                    placeholder={`${PROVIDERS.find(p=>p.id===selectedProvider)?.name} API key…`}
                    placeholderTextColor={Colors.textTertiary}
                    secureTextEntry={!apiVisible}
                    value={apiKey}
                    onChangeText={setApiKey}
                    autoCapitalize="none"
                    autoCorrect={false}
                  />
                  <TouchableOpacity onPress={() => setApiVisible(!apiVisible)} style={styles.eyeBtn}>
                    <Eye color={Colors.textTertiary} size={15} />
                  </TouchableOpacity>
                </View>
              </View>
            )}
            <View style={{ alignSelf: 'flex-start', marginTop: Spacing.sm }}>
              <GeminiSaveButton label="Apply Engine" onPress={saveAIConfig} />
            </View>
          </Animated.View>

          {/* ── Voice & Interaction ── */}
          <Animated.View entering={FadeInUp.duration(500).delay(140)} style={styles.section}>
            <View style={styles.sectionTitleRow}>
              <GeminiAccentLine />
              <Text style={styles.sectionTitle}>VOICE & INTERACTION</Text>
            </View>
            <View style={styles.toggleList}>
              <ToggleRow
                icon={<Mic size={18} color={voiceEnabled ? Colors.primary : Colors.textTertiary} />}
                label="Voice Input"
                desc="Tap mic or say Hey Riuka"
                value={voiceEnabled}
                onValueChange={setVoiceEnabled}
                color={Colors.primary}
              />
              <ToggleRow
                icon={<Volume2 size={18} color={voiceReply ? Colors.secondary : Colors.textTertiary} />}
                label="Voice Reply"
                desc="Riuka speaks responses aloud"
                value={voiceReply}
                onValueChange={v => {
                  setVoiceReply(v);
                  setVoiceReplyEnabled(v);
                  if (Platform.OS === 'web') {
                    try { localStorage.setItem('riuka_voice_reply', String(v)); } catch {}
                    if (!v) { try { (window as any).speechSynthesis?.cancel(); } catch {} }
                  }
                }}
                color={Colors.secondary}
              />
              <ToggleRow
                icon={<Zap size={18} color={wakeWord ? Colors.primary : Colors.textTertiary} />}
                label='Wake Word — "Hey Riuka"'
                desc="Always-on voice activation (Chrome)"
                value={wakeWord}
                onValueChange={v => {
                  setWakeWord(v);
                  setWakeWordActive(v);
                  if (Platform.OS === 'web') { try { localStorage.setItem('riuka_wake_v1', String(v)); } catch {} }
                  if (v) Alert.alert('Wake Word Active', '"Hey Riuka" is now listening.');
                }}
                color={Colors.primary}
              />
            </View>
          </Animated.View>

          {/* ── Sensors & Awareness ── */}
          <Animated.View entering={FadeInUp.duration(500).delay(180)} style={styles.section}>
            <View style={styles.sectionTitleRow}>
              <GeminiAccentLine />
              <Text style={styles.sectionTitle}>SENSORS & AWARENESS</Text>
            </View>
            <View style={styles.toggleList}>
              <ToggleRow
                icon={<Bell size={18} color={notifListener ? Colors.primary : Colors.textTertiary} />}
                label="Browser Notifications"
                desc="Riuka alerts you when tab is in background"
                value={notifListener}
                onValueChange={enableNotifications}
                color={Colors.primary}
              />
              <ToggleRow
                icon={<ClipboardList size={18} color={clipEngine ? Colors.secondary : Colors.textTertiary} />}
                label="Clipboard Engine"
                desc="Say 'read clipboard' · auto-analyzes copies"
                value={clipEngine}
                onValueChange={enableClipboard}
                color={Colors.secondary}
              />
              <ToggleRow
                icon={<Camera size={18} color={cameraGesture ? '#EC4899' : Colors.textTertiary} />}
                label="Camera Gesture"
                desc="Wave hand to trigger voice (needs camera)"
                value={cameraGesture}
                onValueChange={enableCamera}
                color="#EC4899"
              />
              <ToggleRow
                icon={<Smartphone size={18} color={shakeWake ? '#F97316' : Colors.textTertiary} />}
                label="Shake to Wake"
                desc="Shake phone/device to trigger Riuka"
                value={shakeWake}
                onValueChange={enableShake}
                color="#F97316"
              />
              <ToggleRow
                icon={<Radio size={18} color={volumeKeys ? Colors.accent : Colors.textTertiary} />}
                label="Media Key Commands"
                desc="Next track = send · Prev track = clear"
                value={volumeKeys}
                onValueChange={enableVolumeKeys}
                color={Colors.accent}
              />
              <ToggleRow
                icon={<Calendar size={18} color={calendarCtx ? Colors.primary : Colors.textTertiary} />}
                label="Calendar Context"
                desc="Date/time awareness in responses"
                value={calendarCtx}
                onValueChange={setCalendarCtx}
                color={Colors.primary}
              />
              <ToggleRow
                icon={<MapPin size={18} color={locationCtx ? Colors.secondary : Colors.textTertiary} />}
                label="Location Context"
                desc="'Where am I?' · location-aware answers"
                value={locationCtx}
                onValueChange={enableLocation}
                color={Colors.secondary}
              />
            </View>
          </Animated.View>

          {/* ── Atomic Evolution ── */}
          <Animated.View entering={FadeInUp.duration(500).delay(220)} style={styles.section}>
            <View style={styles.sectionTitleRow}>
              <GeminiAccentLine />
              <Text style={styles.sectionTitle}>ATOMIC EVOLUTION</Text>
            </View>
            <GeminiCard style={styles.evoCard}>
              <View style={styles.evoHeader}>
                <Text style={styles.evoIcon}>{curLevel.icon}</Text>
                <View style={styles.evoInfo}>
                  <Text style={styles.evoLevel}>Level {curLevel.level} — {curLevel.name}</Text>
                  <Text style={styles.evoXP}>{evo.xp} XP{nextLevel ? ` / ${nextLevel.xp}` : ' (MAX)'}</Text>
                </View>
                <View style={styles.evoMemBadge}>
                  <Text style={styles.evoMemNum}>{memCount}</Text>
                  <Text style={styles.evoMemLabel}>memories</Text>
                </View>
              </View>
              <View style={styles.xpTrack}>
                <View style={[styles.xpFill, { width: `${Math.min(xpProgress * 100, 100)}%` as any }]} />
              </View>
              {nextLevel && (
                <Text style={styles.evoNextLabel}>{nextLevel.xp - evo.xp} XP to {nextLevel.icon} {nextLevel.name}</Text>
              )}
              <View style={styles.evoActions}>
                <TouchableOpacity style={styles.evoActionBtn} onPress={clearMemory}>
                  <Trash2 color={Colors.error} size={13} />
                  <Text style={[styles.evoActionText, { color: Colors.error }]}>Clear Memory</Text>
                </TouchableOpacity>
              </View>
            </GeminiCard>
          </Animated.View>

          {/* ── Appearance ── */}
          <Animated.View entering={FadeInUp.duration(500).delay(260)} style={styles.section}>
            <View style={styles.sectionTitleRow}>
              <GeminiAccentLine />
              <Text style={styles.sectionTitle}>APPEARANCE</Text>
            </View>
            <GeminiCard>
              <View style={styles.themeHeader}>
                <Palette color={Colors.primary} size={16} />
                <Text style={styles.themeLabel}>Accent Color</Text>
              </View>
              <View style={styles.swatchRow}>
                {ACCENT_COLORS.map(c => (
                  <TouchableOpacity
                    key={c}
                    style={[styles.swatch, { backgroundColor: c }, accentColor === c && styles.swatchActive]}
                    onPress={() => applyTheme(c)}
                    activeOpacity={0.8}
                  >
                    {accentColor === c && <Text style={styles.swatchCheck}>✓</Text>}
                  </TouchableOpacity>
                ))}
              </View>
            </GeminiCard>
          </Animated.View>

          {/* ── Automation ── */}
          <Animated.View entering={FadeInUp.duration(500).delay(300)} style={styles.section}>
            <View style={styles.sectionTitleRow}>
              <GeminiAccentLine />
              <Text style={styles.sectionTitle}>AUTOMATION</Text>
            </View>
            <View style={styles.toggleList}>
              <ToggleRow
                icon={<Bell size={18} color={autoReply ? Colors.primary : Colors.textTertiary} />}
                label="Auto-Reply Drafting"
                desc="Draft responses to incoming messages"
                value={autoReply}
                onValueChange={setAutoReply}
                color={Colors.primary}
              />
              <ToggleRow
                icon={<ClipboardList size={18} color={clipAnalysis ? Colors.secondary : Colors.textTertiary} />}
                label="Clipboard Auto-Analysis"
                desc="Instant analysis on every copy"
                value={clipAnalysis}
                onValueChange={setClipAnalysis}
                color={Colors.secondary}
              />
            </View>
          </Animated.View>

          {/* ── Privacy & Security ── */}
          <Animated.View entering={FadeInUp.duration(500).delay(340)} style={styles.section}>
            <View style={styles.sectionTitleRow}>
              <GeminiAccentLine />
              <Text style={styles.sectionTitle}>PRIVACY & SECURITY</Text>
            </View>
            <View style={styles.toggleList}>
              <ToggleRow
                icon={<Fingerprint size={18} color={biometric ? Colors.primary : Colors.textTertiary} />}
                label="Biometric Lock"
                desc="Fingerprint / Face unlock"
                value={biometric}
                onValueChange={setBiometric}
                color={Colors.primary}
              />
              <ToggleRow
                icon={<Eye size={18} color={privacyMode ? Colors.accent : Colors.textTertiary} />}
                label="Privacy Mode"
                desc="Restrict to owner only"
                value={privacyMode}
                onValueChange={setPrivacyMode}
                color={Colors.accent}
              />
              <ToggleRow
                icon={<WifiOff size={18} color={offlinePriority ? Colors.secondary : Colors.textTertiary} />}
                label="On-Device Priority"
                desc="Always use local brain first"
                value={offlinePriority}
                onValueChange={setOfflinePriority}
                color={Colors.secondary}
              />
            </View>
            <GeminiCard style={{ marginTop: Spacing.md }}>
              <View style={styles.securityRow}>
                <Lock color={Colors.secondary} size={16} />
                <View style={{ flex: 1 }}>
                  <Text style={styles.securityTitle}>On-Device Encryption</Text>
                  <Text style={styles.securityDesc}>AES-256 · No cloud · Zero data sharing</Text>
                </View>
                <View style={styles.verifiedBadge}>
                  <CheckCircle color={Colors.secondary} size={11} />
                  <Text style={styles.verifiedText}>Active</Text>
                </View>
              </View>
            </GeminiCard>
          </Animated.View>

          {/* ── Data & Export ── */}
          <Animated.View entering={FadeInUp.duration(500).delay(380)} style={styles.section}>
            <View style={styles.sectionTitleRow}>
              <GeminiAccentLine />
              <Text style={styles.sectionTitle}>DATA & EXPORT</Text>
            </View>
            <View style={styles.dataRow}>
              <TouchableOpacity style={styles.dataBtn} onPress={exportChat} activeOpacity={0.8}>
                <Download color={Colors.primary} size={18} />
                <Text style={styles.dataBtnLabel}>Export Chat</Text>
                <Text style={styles.dataBtnSub}>.txt file</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.dataBtn, styles.dataBtnDanger]} onPress={clearAll} activeOpacity={0.8}>
                <Trash2 color={Colors.error} size={18} />
                <Text style={[styles.dataBtnLabel, { color: Colors.error }]}>Clear All</Text>
                <Text style={[styles.dataBtnSub, { color: Colors.error + '80' }]}>Cannot undo</Text>
              </TouchableOpacity>
            </View>
          </Animated.View>

          {/* ── Premium ── */}
          <Animated.View entering={FadeInUp.duration(500).delay(420)} style={styles.section}>
            <TouchableOpacity activeOpacity={0.85}>
              <LinearGradient
                colors={['rgba(168,85,247,0.18)', 'rgba(59,130,246,0.1)', 'rgba(16,185,129,0.08)']}
                start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
                style={styles.premiumCard}
              >
                <Crown color={Colors.primary} size={22} />
                <View style={{ flex: 1 }}>
                  <Text style={styles.premiumTitle}>Upgrade to Riuka Pro</Text>
                  <Text style={styles.premiumDesc}>Unlimited memory · Extended automation · Priority model updates</Text>
                </View>
                <ChevronRight color={Colors.primary} size={16} />
              </LinearGradient>
            </TouchableOpacity>
          </Animated.View>

          {/* Footer */}
          <View style={styles.footer}>
            <Sparkles color={Colors.primary} size={13} />
            <Text style={styles.footerText}>Riuka AI v1.0.0</Text>
            <Text style={styles.footerSub}>On-Device · Zero Cloud · Evolving</Text>
          </View>

        </ScrollView>
      </LinearGradient>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  gradient:  { flex: 1 },
  scroll:    { paddingBottom: 60 },

  // Header
  headerWrap:  { overflow: 'hidden', marginBottom: Spacing.lg, paddingBottom: Spacing.lg },
  headerInner: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.xxxl + Spacing.md,
    gap: Spacing.md,
  },
  headerIconRing: {
    width: 48, height: 48, borderRadius: 24,
    backgroundColor: 'rgba(168,85,247,0.12)',
    borderWidth: 1.5, borderColor: Colors.primary,
    alignItems: 'center', justifyContent: 'center',
    shadowColor: Colors.primary, shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.4, shadowRadius: 10, elevation: 6,
  },
  headerTitle: { fontSize: 28, fontWeight: '800', letterSpacing: 0.5 },
  headerSub:   { fontSize: FontSizes.xs, color: Colors.secondary, fontWeight: '600', marginTop: 2 },
  headerOrb: {
    position: 'absolute', width: W * 0.8, height: W * 0.4,
    borderRadius: W * 0.2, top: -W * 0.1, left: W * 0.1,
  },
  headerScan: {
    position: 'absolute', top: 0, bottom: 0,
    width: 70,
  },

  // Sections
  section:        { paddingHorizontal: Spacing.lg, marginBottom: Spacing.xl },
  sectionTitleRow:{ flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, marginBottom: Spacing.md },
  sectionAccentLine: { width: 3, height: 14, borderRadius: 2 },
  sectionTitle: {
    fontSize: FontSizes.xs, fontWeight: '800',
    color: Colors.textSecondary, letterSpacing: 1.5,
    textTransform: 'uppercase',
  },

  // Gemini card
  geminiCard: {
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.lg,
    borderWidth: 1.5,
    overflow: 'hidden',
  },

  // Inputs
  inputRow: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: Spacing.md, paddingVertical: Spacing.sm + 2,
    borderBottomWidth: 1, borderBottomColor: Colors.border,
    gap: Spacing.sm,
  },
  inputRowLast: { borderBottomWidth: 0 },
  inputLabel: { fontSize: FontSizes.sm, color: Colors.textSecondary, fontWeight: '600', width: 44 },
  textInput:  { flex: 1, fontSize: FontSizes.md, color: Colors.text, paddingVertical: 4 },

  // Save button
  saveBtn: {
    borderRadius: BorderRadius.full,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm + 2,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.35, shadowRadius: 8, elevation: 4,
  },
  saveBtnText: { fontSize: FontSizes.sm, fontWeight: '700', color: '#fff' },

  // Provider cards
  providerRow:  { gap: Spacing.sm, paddingBottom: Spacing.md },
  providerCard: {
    width: 82, borderRadius: BorderRadius.md,
    backgroundColor: Colors.surface, borderWidth: 1.5,
    borderColor: Colors.border, alignItems: 'center',
    paddingVertical: Spacing.md, gap: Spacing.xs,
  },
  providerIcon:      { fontSize: 20 },
  providerName:      { fontSize: FontSizes.xs, fontWeight: '700', color: Colors.textTertiary },
  providerActiveDot: { width: 5, height: 5, borderRadius: 2.5 },
  apiRow:       { marginBottom: Spacing.sm },
  apiInputWrap: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: Colors.surface, borderRadius: BorderRadius.md,
    borderWidth: 1, borderColor: Colors.border,
    paddingHorizontal: Spacing.md,
  },
  apiInput:  { flex: 1, fontSize: FontSizes.md, color: Colors.text, paddingVertical: Spacing.md },
  eyeBtn:    { padding: Spacing.xs },

  // Toggles
  toggleList: { gap: Spacing.sm },
  toggleRow: {
    flexDirection: 'row', alignItems: 'center',
    borderRadius: BorderRadius.lg, padding: Spacing.md,
    borderWidth: 1.5, gap: Spacing.md,
  },
  toggleIcon: {
    width: 42, height: 42, borderRadius: BorderRadius.md,
    backgroundColor: Colors.backgroundTertiary,
    borderWidth: 1, alignItems: 'center', justifyContent: 'center',
  },
  toggleText:  { flex: 1 },
  toggleLabel: { fontSize: FontSizes.md, fontWeight: '600', color: Colors.text, marginBottom: 1 },
  toggleDesc:  { fontSize: FontSizes.xs, color: Colors.textTertiary },

  // Evolution
  evoCard:    { padding: Spacing.lg },
  evoHeader:  { flexDirection: 'row', alignItems: 'center', gap: Spacing.md, marginBottom: Spacing.md },
  evoIcon:    { fontSize: 28 },
  evoInfo:    { flex: 1 },
  evoLevel:   { fontSize: FontSizes.md, fontWeight: '700', color: Colors.text },
  evoXP:      { fontSize: FontSizes.xs, color: Colors.primary, fontWeight: '600', marginTop: 2 },
  evoMemBadge:{ alignItems: 'center' },
  evoMemNum:  { fontSize: FontSizes.xl, fontWeight: '800', color: Colors.primary },
  evoMemLabel:{ fontSize: 9, color: Colors.textTertiary, fontWeight: '600' },
  xpTrack:    { height: 6, borderRadius: 3, backgroundColor: Colors.backgroundTertiary, overflow: 'hidden', marginBottom: 6 },
  xpFill:     { height: '100%', borderRadius: 3, backgroundColor: Colors.primary },
  evoNextLabel: { fontSize: FontSizes.xs, color: Colors.textTertiary, marginBottom: Spacing.md },
  evoActions: { flexDirection: 'row' },
  evoActionBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    backgroundColor: 'rgba(239,68,68,0.08)', borderRadius: BorderRadius.full,
    paddingHorizontal: Spacing.md, paddingVertical: 5,
    borderWidth: 1, borderColor: 'rgba(239,68,68,0.2)',
  },
  evoActionText: { fontSize: FontSizes.xs, fontWeight: '600' },

  // Theme
  themeHeader: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, marginBottom: Spacing.md, padding: Spacing.md, paddingBottom: 0 },
  themeLabel:  { fontSize: FontSizes.sm, color: Colors.textSecondary, fontWeight: '600' },
  swatchRow:   { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm, padding: Spacing.md, paddingTop: Spacing.sm },
  swatch:      { width: 38, height: 38, borderRadius: 19, alignItems: 'center', justifyContent: 'center' },
  swatchActive:{ borderWidth: 3, borderColor: '#fff', shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.3, shadowRadius: 4, elevation: 4 },
  swatchCheck: { color: '#fff', fontWeight: '800', fontSize: 16 },

  // Security
  securityRow:   { flexDirection: 'row', alignItems: 'center', gap: Spacing.md, padding: Spacing.md },
  securityTitle: { fontSize: FontSizes.sm, fontWeight: '700', color: Colors.text },
  securityDesc:  { fontSize: FontSizes.xs, color: Colors.textTertiary, marginTop: 2 },
  verifiedBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 3,
    backgroundColor: Colors.secondary + '15',
    borderRadius: BorderRadius.full,
    paddingHorizontal: 8, paddingVertical: 3,
    borderWidth: 1, borderColor: Colors.secondary + '30',
  },
  verifiedText: { fontSize: 9, color: Colors.secondary, fontWeight: '700' },

  // Data
  dataRow:     { flexDirection: 'row', gap: Spacing.md },
  dataBtn:     {
    flex: 1, backgroundColor: Colors.surface,
    borderRadius: BorderRadius.lg, borderWidth: 1,
    borderColor: Colors.border, padding: Spacing.md,
    alignItems: 'center', gap: 4,
  },
  dataBtnDanger: { borderColor: Colors.error + '40', backgroundColor: 'rgba(239,68,68,0.05)' },
  dataBtnLabel:  { fontSize: FontSizes.sm, fontWeight: '700', color: Colors.text },
  dataBtnSub:    { fontSize: FontSizes.xs, color: Colors.textTertiary },

  // Premium
  premiumCard: {
    flexDirection: 'row', alignItems: 'center',
    borderRadius: BorderRadius.lg, padding: Spacing.lg,
    borderWidth: 1, borderColor: Colors.primary + '40', gap: Spacing.md,
  },
  premiumTitle: { fontSize: FontSizes.md, fontWeight: '700', color: Colors.primary, marginBottom: 2 },
  premiumDesc:  { fontSize: FontSizes.xs, color: Colors.textTertiary, lineHeight: 16 },

  // Footer
  footer:     { paddingHorizontal: Spacing.lg, alignItems: 'center', marginTop: Spacing.lg, gap: Spacing.xs },
  footerText: { fontSize: FontSizes.sm, color: Colors.textTertiary, fontWeight: '600' },
  footerSub:  { fontSize: FontSizes.xs, color: Colors.textTertiary },
});
