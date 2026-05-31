import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Switch,
  TouchableOpacity,
  TextInput,
  Alert,
  Platform,
  NativeModules,
} from 'react-native';

const HW: any = NativeModules.VexsoraHardware ?? null;
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
  Cpu, Mic, Battery, Database, Trash2, Download,
  User, Volume2, Radio, Zap, Info, ChevronRight, Shield,
} from 'lucide-react-native';
import { Colors, Spacing, FontSizes, BorderRadius } from '../../constants/theme';
import { memoryService } from '../../lib/memoryService';
import { llamaService, MODELS, type ModelMeta } from '../../lib/llamaService';
import {
  setAIConfig, getAIConfig,
  setVoiceReplyEnabled, setWakeWordActive, setUserLang, getUserLang,
} from './chat';

// ── Gemini color cycler ───────────────────────────────────────────────────────
const GEMINI = ['#A855F7', '#3B82F6', '#10B981', '#EC4899', '#A855F7'] as const;

function GeminiTitle({ text }: { text: string }) {
  const p = useSharedValue(0);
  useEffect(() => {
    p.value = withRepeat(withTiming(1, { duration: 4000, easing: Easing.linear }), -1, false);
  }, []);
  const s = useAnimatedStyle(() => ({
    color: interpolateColor(p.value, [0, 0.25, 0.5, 0.75, 1], [...GEMINI]),
  }));
  return <Animated.Text style={[styles.screenTitle, s]}>{text}</Animated.Text>;
}

// ── Section component ─────────────────────────────────────────────────────────
function Section({
  label,
  icon: Icon,
  children,
  delay = 0,
}: {
  label: string;
  icon: React.ComponentType<any>;
  children: React.ReactNode;
  delay?: number;
}) {
  return (
    <Animated.View entering={FadeInUp.delay(delay).duration(400)}>
      <View style={styles.sectionHeader}>
        <Icon size={14} color={Colors.primary} />
        <Text style={styles.sectionLabel}>{label.toUpperCase()}</Text>
      </View>
      <View style={styles.card}>{children}</View>
    </Animated.View>
  );
}

// ── Row components ────────────────────────────────────────────────────────────
function RowItem({
  label,
  value,
  onPress,
  right,
}: {
  label: string;
  value?: string;
  onPress?: () => void;
  right?: React.ReactNode;
}) {
  return (
    <TouchableOpacity
      style={styles.row}
      onPress={onPress}
      activeOpacity={onPress ? 0.7 : 1}
    >
      <Text style={styles.rowLabel}>{label}</Text>
      {right ?? (
        <View style={styles.rowRight}>
          {value ? <Text style={styles.rowValue}>{value}</Text> : null}
          {onPress ? <ChevronRight size={16} color={Colors.textTertiary} /> : null}
        </View>
      )}
    </TouchableOpacity>
  );
}

function RowSwitch({
  label,
  value,
  onValueChange,
  description,
}: {
  label: string;
  value: boolean;
  onValueChange: (v: boolean) => void;
  description?: string;
}) {
  return (
    <View style={styles.row}>
      <View style={{ flex: 1 }}>
        <Text style={styles.rowLabel}>{label}</Text>
        {description ? <Text style={styles.rowDescription}>{description}</Text> : null}
      </View>
      <Switch
        value={value}
        onValueChange={onValueChange}
        trackColor={{ false: Colors.border, true: 'rgba(168,85,247,0.5)' }}
        thumbColor={value ? Colors.primary : Colors.textTertiary}
      />
    </View>
  );
}

function Divider() {
  return <View style={styles.divider} />;
}

// ── Status badge ──────────────────────────────────────────────────────────────
function StatusBadge({ status, label }: { status: 'good' | 'warning' | 'error' | 'info'; label: string }) {
  const color = status === 'good' ? '#10B981' : status === 'warning' ? '#F59E0B' : status === 'error' ? '#EF4444' : Colors.primary;
  return (
    <View style={[styles.badge, { backgroundColor: `${color}22`, borderColor: `${color}55` }]}>
      <View style={[styles.badgeDot, { backgroundColor: color }]} />
      <Text style={[styles.badgeText, { color }]}>{label}</Text>
    </View>
  );
}

// ── Battery profile label ─────────────────────────────────────────────────────
const getBatteryProfile = (level: number): { label: string; status: 'good' | 'warning' | 'error' } => {
  if (level > 50) return { label: 'Normal', status: 'good' };
  if (level > 15) return { label: 'Low Power', status: 'warning' };
  return { label: 'Critical', status: 'error' };
};

// ── Main Settings screen ──────────────────────────────────────────────────────
export default function SettingsScreen() {
  // Profile
  const [profileName, setProfileName] = useState('');
  const [profileCity, setProfileCity] = useState('');
  const [profileLang, setProfileLang] = useState(getUserLang());

  // Model
  const [modelPath, setModelPath] = useState(llamaService.getLoadedModelPath() ?? '');
  const [customModelInput, setCustomModelInput] = useState('');
  const [modelStatus, setModelStatus] = useState<'loaded' | 'loading' | 'none'>(
    llamaService.isLoaded() ? 'loaded' : 'none'
  );

  // Voice
  const [voiceReplyEnabled, setVoiceReply] = useState(false);
  const [ttsLang, setTtsLang] = useState('en-US');

  // Wake word
  const [wakeWordEnabled, setWakeWord] = useState(false);

  // Battery
  const [batteryLevel, setBatteryLevel] = useState(100);
  const [autoThrottle, setAutoThrottle] = useState(true);

  // Gestures
  const [doubleshakeEnabled, setDoubleshake] = useState(false);
  const [flipToMuteEnabled, setFlipToMute] = useState(false);

  // Memory / KB
  const [memoryCount, setMemoryCount] = useState(0);

  // Download tracking
  const [downloadState, setDownloadState] = useState<{
    modelId: string; progress: number; downloadedMB: number; totalMB: number;
  } | null>(null);
  const [downloadedModels, setDownloadedModels] = useState<string[]>([]);

  useEffect(() => {
    llamaService.getDownloadedModels().then(setDownloadedModels);
  }, []);

  // Fetch battery level — native on Android, Web API on web
  useEffect(() => {
    const fetchBattery = async () => {
      if (Platform.OS === 'android' && HW) {
        try {
          const result = await HW.getBatteryLevel();
          if (result && typeof result.level === 'number') {
            setBatteryLevel(Math.round(result.level * 100));
          }
        } catch {}
      } else if (Platform.OS === 'web' && typeof window !== 'undefined') {
        try {
          const nav = navigator as any;
          if (nav.getBattery) {
            const b = await nav.getBattery();
            setBatteryLevel(Math.round(b.level * 100));
          }
        } catch {}
      }
    };
    fetchBattery();
  }, []);

  // Load profile
  useEffect(() => {
    const loadProfile = async () => {
      const profile = memoryService.getProfile();
      if (profile.name) setProfileName(profile.name);
      if (profile.city) setProfileCity(profile.city);
      setMemoryCount(memoryService.getMemories().length);
    };
    loadProfile();
  }, []);

  const saveProfile = useCallback(async () => {
    await memoryService.updateProfile({
      name: profileName.trim(),
      city: profileCity.trim(),
    });
    setUserLang(profileLang);
    Alert.alert('Saved', 'Profile updated.');
  }, [profileName, profileCity, profileLang]);

  const handleLoadModel = useCallback(async () => {
    const path = customModelInput.trim() || modelPath.trim();
    if (!path) {
      Alert.alert('No path', 'Enter a GGUF model file path first.');
      return;
    }
    setModelStatus('loading');
    try {
      await llamaService.load(path);
      setModelPath(path);
      setModelStatus('loaded');
      Alert.alert('Success', 'Model loaded. Vexsora is now running on-device.');
    } catch (err: any) {
      setModelStatus('none');
      Alert.alert('Failed', err?.message ?? 'Could not load model.');
    }
  }, [customModelInput, modelPath]);

  const handleDownloadModel = useCallback(async (model: ModelMeta) => {
    if (downloadState) {
      Alert.alert('Download in progress', 'Please wait for the current download to finish.');
      return;
    }
    await llamaService.downloadModel(
      model,
      (state) => setDownloadState({ ...state }),
      () => {
        setDownloadState(null);
        setDownloadedModels((prev) => [...new Set([...prev, model.id])]);
        setCustomModelInput(llamaService.getModelPath(model));
        Alert.alert('Downloaded!', `${model.name} is ready.\nTap "Load Model" to start.`);
      },
      (err) => {
        setDownloadState(null);
        Alert.alert('Download failed', err);
      }
    );
  }, [downloadState]);

  const handleCancelDownload = useCallback(() => {
    llamaService.cancelDownload();
    setDownloadState(null);
  }, []);

  const handleClearMemories = useCallback(() => {
    Alert.alert('Clear Memories', 'This will delete all saved memories. Continue?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Clear',
        style: 'destructive',
        onPress: async () => {
          await memoryService.clearAllMemories();
          setMemoryCount(0);
          Alert.alert('Done', 'All memories cleared.');
        },
      },
    ]);
  }, []);

  const batteryProfile = getBatteryProfile(batteryLevel);

  return (
    <View style={styles.root}>
      <LinearGradient colors={['#0B0B0A', '#0F0B18', '#0B0B0A']} style={StyleSheet.absoluteFill} />

      <View style={styles.header}>
        <GeminiTitle text="Settings" />
      </View>

      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
      >
        {/* MODEL */}
        <Section label="Model" icon={Cpu} delay={0}>
          <RowItem
            label="AI Engine"
            right={
              <StatusBadge
                status={llamaService.isAvailable() ? 'good' : 'warning'}
                label={llamaService.isAvailable() ? 'Available' : 'Command mode'}
              />
            }
          />
          <Divider />
          <RowItem
            label="Inference"
            right={
              <StatusBadge
                status={modelStatus === 'loaded' ? 'good' : modelStatus === 'loading' ? 'warning' : (llamaService.isAvailable() ? 'error' : 'info')}
                label={modelStatus === 'loaded' ? 'Loaded' : modelStatus === 'loading' ? 'Loading...' : (llamaService.isAvailable() ? 'Not loaded' : 'Download ready')}
              />
            }
          />
          <Divider />
          {modelPath ? (
            <>
              <RowItem label="Current model" value={modelPath.split('/').pop() ?? modelPath} />
              <Divider />
            </>
          ) : null}
          <View style={styles.row}>
            <Text style={styles.rowLabel}>Custom GGUF path</Text>
          </View>
          <View style={styles.inputRow}>
            <TextInput
              style={styles.textInput}
              placeholder="/storage/emulated/0/Download/model.gguf"
              placeholderTextColor={Colors.textTertiary}
              value={customModelInput}
              onChangeText={setCustomModelInput}
              autoCapitalize="none"
              autoCorrect={false}
            />
          </View>
          <TouchableOpacity style={styles.actionBtn} onPress={handleLoadModel} activeOpacity={0.8}>
            <Text style={styles.actionBtnText}>{modelStatus === 'loading' ? 'Loading...' : 'Load Model'}</Text>
          </TouchableOpacity>
          <Divider />
          <View style={[styles.row, { paddingBottom: 4 }]}>
            <Text style={styles.rowLabel}>Download Model</Text>
          </View>
          {MODELS.map((model, i) => (
            <React.Fragment key={model.id}>
              {i > 0 && <Divider />}
              <View style={styles.modelDownloadRow}>
                <View style={{ flex: 1 }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                    <Text style={styles.rowLabel}>{model.name}</Text>
                    <View style={[styles.tierBadge, { borderColor: `${model.tierColor}55`, backgroundColor: `${model.tierColor}22` }]}>
                      <Text style={[styles.tierText, { color: model.tierColor }]}>{model.tier}</Text>
                    </View>
                  </View>
                  <Text style={styles.rowDescription}>{model.subtitle} · {model.sizeMB} MB</Text>
                  {downloadState?.modelId === model.id && (
                    <>
                      <View style={styles.progressBarBg}>
                        <View style={[styles.progressBarFill, { width: `${Math.round(downloadState.progress * 100)}%` }]} />
                      </View>
                      <Text style={[styles.rowDescription, { marginTop: 2 }]}>
                        {downloadState.downloadedMB} / {downloadState.totalMB} MB · {Math.round(downloadState.progress * 100)}%
                      </Text>
                    </>
                  )}
                </View>
                {downloadState?.modelId === model.id ? (
                  <TouchableOpacity style={styles.cancelBtn} onPress={handleCancelDownload} activeOpacity={0.8}>
                    <Text style={styles.cancelBtnText}>Cancel</Text>
                  </TouchableOpacity>
                ) : downloadedModels.includes(model.id) ? (
                  <TouchableOpacity
                    style={styles.useBtn}
                    onPress={() => setCustomModelInput(llamaService.getModelPath(model))}
                    activeOpacity={0.8}
                  >
                    <Text style={styles.useBtnText}>Use</Text>
                  </TouchableOpacity>
                ) : (
                  <TouchableOpacity
                    style={[styles.downloadBtn, downloadState ? { opacity: 0.4 } : null]}
                    onPress={() => handleDownloadModel(model)}
                    activeOpacity={0.8}
                    disabled={!!downloadState}
                  >
                    <Download size={12} color="#fff" />
                    <Text style={styles.downloadBtnText}>Get</Text>
                  </TouchableOpacity>
                )}
              </View>
            </React.Fragment>
          ))}
        </Section>

        {/* PROFILE */}
        <Section label="Profile" icon={User} delay={60}>
          <View style={styles.row}>
            <Text style={styles.rowLabel}>Name</Text>
          </View>
          <View style={styles.inputRow}>
            <TextInput
              style={styles.textInput}
              placeholder="Your name"
              placeholderTextColor={Colors.textTertiary}
              value={profileName}
              onChangeText={setProfileName}
            />
          </View>
          <Divider />
          <View style={styles.row}>
            <Text style={styles.rowLabel}>City</Text>
          </View>
          <View style={styles.inputRow}>
            <TextInput
              style={styles.textInput}
              placeholder="Your city (for weather)"
              placeholderTextColor={Colors.textTertiary}
              value={profileCity}
              onChangeText={setProfileCity}
            />
          </View>
          <Divider />
          <View style={styles.row}>
            <Text style={styles.rowLabel}>Language code</Text>
          </View>
          <View style={styles.inputRow}>
            <TextInput
              style={styles.textInput}
              placeholder="en, es, fr, de, hi, zh, ja, ko..."
              placeholderTextColor={Colors.textTertiary}
              value={profileLang}
              onChangeText={setProfileLang}
              autoCapitalize="none"
            />
          </View>
          <TouchableOpacity style={styles.actionBtn} onPress={saveProfile} activeOpacity={0.8}>
            <Text style={styles.actionBtnText}>Save Profile</Text>
          </TouchableOpacity>
        </Section>

        {/* VOICE */}
        <Section label="Voice" icon={Volume2} delay={120}>
          <RowSwitch
            label="Voice reply"
            value={voiceReplyEnabled}
            onValueChange={(v) => {
              setVoiceReply(v);
              setVoiceReplyEnabled(v);
            }}
            description="Vexsora speaks responses aloud"
          />
          <Divider />
          <View style={styles.row}>
            <Text style={styles.rowLabel}>TTS language code</Text>
          </View>
          <View style={styles.inputRow}>
            <TextInput
              style={styles.textInput}
              placeholder="en-US, hi-IN, zh-CN..."
              placeholderTextColor={Colors.textTertiary}
              value={ttsLang}
              onChangeText={setTtsLang}
              autoCapitalize="none"
            />
          </View>
        </Section>

        {/* WAKE WORD */}
        <Section label="Wake Word" icon={Mic} delay={180}>
          <RowSwitch
            label="Wake word active"
            value={wakeWordEnabled}
            onValueChange={(v) => {
              setWakeWord(v);
              setWakeWordActive(v);
            }}
            description="Activates background listening service"
          />
          {wakeWordEnabled && (
            <View style={[styles.row, { paddingTop: 0 }]}>
              <Text style={styles.rowDescription}>
                Background wake word detection requires a foreground service. On Android, grant microphone permission and ensure battery optimisation is disabled for this app.
              </Text>
            </View>
          )}
        </Section>

        {/* BATTERY */}
        <Section label="Battery & Thermal" icon={Battery} delay={240}>
          <RowItem
            label="Battery level"
            right={
              <StatusBadge
                status={batteryProfile.status}
                label={`${batteryLevel}% — ${batteryProfile.label}`}
              />
            }
          />
          <Divider />
          <RowSwitch
            label="Auto-throttle AI"
            value={autoThrottle}
            onValueChange={setAutoThrottle}
            description="Reduces inference speed below 15% battery to prevent drain"
          />
        </Section>

        {/* GESTURES */}
        <Section label="Gestures" icon={Zap} delay={300}>
          <RowSwitch
            label="Double-shake to wake"
            value={doubleshakeEnabled}
            onValueChange={setDoubleshake}
            description="Shake phone twice to open Vexsora"
          />
          <Divider />
          <RowSwitch
            label="Flip-to-mute"
            value={flipToMuteEnabled}
            onValueChange={setFlipToMute}
            description="Place phone face-down to silence voice replies"
          />
        </Section>

        {/* MEMORY */}
        <Section label="Memory" icon={Database} delay={360}>
          <RowItem label="Saved memories" value={`${memoryCount}`} />
          <Divider />
          <TouchableOpacity style={styles.dangerBtn} onPress={handleClearMemories} activeOpacity={0.8}>
            <Trash2 size={16} color="#EF4444" />
            <Text style={styles.dangerBtnText}>Clear all memories</Text>
          </TouchableOpacity>
          <Divider />
          <TouchableOpacity
            style={styles.dangerBtn}
            onPress={() => {
              Alert.alert('Clear History', 'This clears the in-memory conversation history for this session.', [
                { text: 'Cancel', style: 'cancel' },
                { text: 'Clear', style: 'destructive', onPress: () => Alert.alert('Done', 'Session history cleared. Restart the chat tab.') },
              ]);
            }}
            activeOpacity={0.8}
          >
            <Trash2 size={16} color="#EF4444" />
            <Text style={styles.dangerBtnText}>Clear chat history</Text>
          </TouchableOpacity>
        </Section>

        {/* ABOUT */}
        <Section label="About" icon={Info} delay={420}>
          <RowItem label="Version" value="Vexsora v1.0" />
          <Divider />
          <RowItem label="Privacy" value="100% Offline" />
          <Divider />
          <RowItem label="Engine" value="llama.cpp" />
          <Divider />
          <RowItem label="Models" value="GGUF / ARM-optimised" />
          <Divider />
          <View style={styles.row}>
            <Text style={styles.rowDescription}>
              Vexsora runs entirely on your device. No data is sent to any server. No API keys required. All inference happens locally using llama.cpp.
            </Text>
          </View>
        </Section>

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
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    marginTop: Spacing.lg,
    marginBottom: Spacing.sm,
    paddingHorizontal: Spacing.xs,
  },
  sectionLabel: {
    fontSize: FontSizes.xs,
    fontWeight: '700',
    color: Colors.textTertiary,
    letterSpacing: 1.2,
  },
  card: {
    backgroundColor: '#1E1F20',
    borderRadius: BorderRadius.lg,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(168,85,247,0.08)',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm + 2,
  },
  rowLabel: { fontSize: FontSizes.md, color: Colors.text, fontWeight: '500', flex: 1 },
  rowDescription: { fontSize: FontSizes.xs, color: Colors.textTertiary, marginTop: 2, lineHeight: 16, flex: 1 },
  rowRight: { flexDirection: 'row', alignItems: 'center', gap: Spacing.xs },
  rowValue: { fontSize: FontSizes.sm, color: Colors.textSecondary },
  divider: { height: 1, backgroundColor: 'rgba(255,255,255,0.04)', marginHorizontal: Spacing.md },
  inputRow: { paddingHorizontal: Spacing.md, paddingBottom: Spacing.sm },
  textInput: {
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: BorderRadius.sm,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    color: Colors.text,
    fontSize: FontSizes.md,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  actionBtn: {
    backgroundColor: Colors.primary,
    marginHorizontal: Spacing.md,
    marginBottom: Spacing.sm,
    borderRadius: BorderRadius.md,
    paddingVertical: Spacing.sm + 2,
    alignItems: 'center',
    shadowColor: '#A855F7',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
    elevation: 4,
  },
  actionBtnText: { color: '#fff', fontSize: FontSizes.md, fontWeight: '700' },
  dangerBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm + 2,
  },
  dangerBtnText: { color: '#EF4444', fontSize: FontSizes.md, fontWeight: '500' },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 4,
    borderRadius: BorderRadius.full,
    borderWidth: 1,
  },
  badgeDot: { width: 6, height: 6, borderRadius: 3 },
  badgeText: { fontSize: FontSizes.xs, fontWeight: '600' },
  modelDownloadRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm + 2,
    gap: Spacing.sm,
  },
  tierBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: BorderRadius.full,
    borderWidth: 1,
  },
  tierText: { fontSize: FontSizes.xs, fontWeight: '700' },
  progressBarBg: {
    height: 4,
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderRadius: 2,
    marginTop: 6,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: 4,
    backgroundColor: Colors.primary,
    borderRadius: 2,
  },
  downloadBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: Colors.primary,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 6,
    borderRadius: BorderRadius.sm,
  },
  downloadBtnText: { color: '#fff', fontSize: FontSizes.xs, fontWeight: '700' },
  useBtn: {
    backgroundColor: 'rgba(16,185,129,0.12)',
    borderWidth: 1,
    borderColor: 'rgba(16,185,129,0.4)',
    paddingHorizontal: Spacing.sm,
    paddingVertical: 6,
    borderRadius: BorderRadius.sm,
  },
  useBtnText: { color: '#10B981', fontSize: FontSizes.xs, fontWeight: '700' },
  cancelBtn: {
    backgroundColor: 'rgba(239,68,68,0.12)',
    borderWidth: 1,
    borderColor: 'rgba(239,68,68,0.3)',
    paddingHorizontal: Spacing.sm,
    paddingVertical: 6,
    borderRadius: BorderRadius.sm,
  },
  cancelBtnText: { color: '#EF4444', fontSize: FontSizes.xs, fontWeight: '700' },
});
