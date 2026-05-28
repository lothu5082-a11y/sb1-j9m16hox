import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Switch } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, {
  FadeInUp,
  withTiming,
  useAnimatedStyle,
  useSharedValue,
} from 'react-native-reanimated';
import {
  Gamepad2,
  Zap,
  BellOff,
  Crosshair,
  Mic,
  Smartphone,
  Activity,
  Cpu,
  HardDrive,
  Wifi,
  ChevronRight,
  Lightbulb,
} from 'lucide-react-native';
import { Colors, Spacing, FontSizes, BorderRadius } from '../../constants/theme';
import StatusBadge from '../../components/StatusBadge';

// ─── ToggleSetting ────────────────────────────────────────────────────────────
interface ToggleSettingProps {
  icon: React.ReactNode;
  title: string;
  description: string;
  value: boolean;
  onValueChange: (val: boolean) => void;
  color?: string;
}

function ToggleSetting({ icon, title, description, value, onValueChange, color = Colors.primary }: ToggleSettingProps) {
  return (
    <View style={toggleStyles.container}>
      <View style={[toggleStyles.iconWrap, { borderColor: value ? color : Colors.border }]}>{icon}</View>
      <View style={toggleStyles.textWrap}>
        <Text style={[toggleStyles.title, { color: value ? color : Colors.text }]}>{title}</Text>
        <Text style={toggleStyles.desc}>{description}</Text>
      </View>
      <Switch
        value={value}
        onValueChange={onValueChange}
        trackColor={{ false: Colors.surface, true: color + '40' }}
        thumbColor={value ? color : Colors.textTertiary}
      />
    </View>
  );
}

const toggleStyles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.lg,
    padding: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.border,
    gap: Spacing.md,
  },
  iconWrap: {
    width: 44,
    height: 44,
    borderRadius: BorderRadius.md,
    backgroundColor: Colors.backgroundTertiary,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  textWrap: { flex: 1 },
  title: { fontSize: FontSizes.md, fontWeight: '600', marginBottom: 2 },
  desc: { fontSize: FontSizes.xs, color: Colors.textTertiary },
});

// ─── AnimatedGauge ────────────────────────────────────────────────────────────
function AnimatedGauge({ value, max, label, color }: { value: number; max: number; label: string; color: string }) {
  const animWidth = useSharedValue(0);

  useEffect(() => {
    animWidth.value = withTiming(value / max, { duration: 600 });
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

// ─── Helpers ──────────────────────────────────────────────────────────────────
const fpsColor = (fps: number) => fps >= 55 ? Colors.success : fps >= 40 ? Colors.warning : Colors.error;
const cpuColor = (cpu: number) => cpu < 50 ? Colors.success : cpu <= 70 ? Colors.warning : Colors.error;
const pingColor = (ping: number) => ping < 30 ? Colors.success : ping <= 70 ? Colors.warning : Colors.error;

const GAME_LIST = [
  { name: 'Mobile Legends', color: Colors.accent },
  { name: 'PUBG Mobile', color: Colors.warning },
  { name: 'Free Fire', color: Colors.success },
  { name: 'Call of Duty', color: Colors.primary },
];

const PERF_MODES = ['Performance', 'Balanced', 'Battery'];

// ─── Main Screen ──────────────────────────────────────────────────────────────
export default function GamingScreen() {
  const [gamingMode, setGamingMode] = useState(false);
  const [autoTap, setAutoTap] = useState(false);
  const [voiceCommands, setVoiceCommands] = useState(true);
  const [doNotDisturb, setDoNotDisturb] = useState(true);
  const [floatingAssistant, setFloatingAssistant] = useState(true);
  const [smartAim, setSmartAim] = useState(false);
  const [perfMode, setPerfMode] = useState('Balanced');

  const [stats, setStats] = useState({ fps: 60, cpu: 42, ram: 55, ping: 28, gpu: 65 });

  useEffect(() => {
    const interval = setInterval(() => {
      setStats({
        fps: 55 + Math.floor(Math.random() * 6),
        cpu: 30 + Math.floor(Math.random() * 35),
        ram: 40 + Math.floor(Math.random() * 30),
        ping: 15 + Math.floor(Math.random() * 50),
        gpu: 50 + Math.floor(Math.random() * 35),
      });
    }, 2000);
    return () => clearInterval(interval);
  }, []);

  const suggestions = gamingMode
    ? [
        'Close background apps to free 800MB RAM',
        'Enable DND mode to prevent notification interruptions',
        stats.ping > 50 ? 'High ping detected — check WiFi signal strength' : 'Network looks great — low ping detected',
      ]
    : [];

  return (
    <View style={styles.container}>
      <LinearGradient colors={[Colors.background, Colors.backgroundSecondary]} style={styles.gradient}>
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>

          {/* Header */}
          <Animated.View entering={FadeInUp.duration(600)} style={styles.header}>
            <View style={styles.headerTextGroup}>
              <Text style={styles.headerTitle}>GAMING</Text>
              <Text style={styles.headerSubtitle}>Vexora AI</Text>
            </View>
            <StatusBadge
              label={gamingMode ? 'Active' : 'Inactive'}
              color={gamingMode ? Colors.accent : Colors.textTertiary}
              active={gamingMode}
              pulse={gamingMode}
            />
          </Animated.View>

          {/* Activate Button */}
          <Animated.View entering={FadeInUp.duration(600).delay(100)} style={styles.mainToggle}>
            <TouchableOpacity onPress={() => setGamingMode(!gamingMode)} activeOpacity={0.8}>
              <LinearGradient
                colors={gamingMode ? [Colors.accent, '#FF8F00'] : [Colors.surface, Colors.surfaceLight]}
                style={[
                  styles.mainToggleGradient,
                  gamingMode && {
                    shadowColor: Colors.accent,
                    shadowOffset: { width: 0, height: 0 },
                    shadowOpacity: 0.7,
                    shadowRadius: 28,
                    elevation: 14,
                  },
                ]}
              >
                <Zap color={gamingMode ? Colors.background : Colors.accent} size={34} />
                <Text style={[styles.mainToggleText, { color: gamingMode ? Colors.background : Colors.accent }]}>
                  {gamingMode ? 'GAMING MODE ON' : 'ACTIVATE GAMING MODE'}
                </Text>
              </LinearGradient>
            </TouchableOpacity>
          </Animated.View>

          {/* Performance Monitor */}
          <Animated.View entering={FadeInUp.duration(600).delay(200)} style={styles.section}>
            <Text style={styles.sectionTitle}>Performance Monitor</Text>
            <View style={styles.monitorCard}>
              <View style={styles.monitorGrid}>
                <View style={styles.monitorItem}>
                  <Activity color={fpsColor(stats.fps)} size={20} />
                  <Text style={[styles.monitorValue, { color: fpsColor(stats.fps) }]}>{stats.fps}</Text>
                  <Text style={styles.monitorLabel}>FPS</Text>
                </View>
                <View style={styles.monitorItem}>
                  <Cpu color={cpuColor(stats.cpu)} size={20} />
                  <Text style={[styles.monitorValue, { color: cpuColor(stats.cpu) }]}>{stats.cpu}%</Text>
                  <Text style={styles.monitorLabel}>CPU</Text>
                </View>
                <View style={styles.monitorItem}>
                  <HardDrive color={Colors.accent} size={20} />
                  <Text style={styles.monitorValue}>{stats.ram}%</Text>
                  <Text style={styles.monitorLabel}>RAM</Text>
                </View>
                <View style={styles.monitorItem}>
                  <Wifi color={pingColor(stats.ping)} size={20} />
                  <Text style={[styles.monitorValue, { color: pingColor(stats.ping) }]}>{stats.ping}ms</Text>
                  <Text style={styles.monitorLabel}>Ping</Text>
                </View>
              </View>
              <View style={styles.gaugesContainer}>
                <AnimatedGauge value={stats.cpu} max={100} label="CPU Usage" color={cpuColor(stats.cpu)} />
                <AnimatedGauge value={stats.ram} max={100} label="RAM Usage" color={Colors.secondary} />
                <AnimatedGauge value={stats.gpu} max={100} label="GPU Usage" color={Colors.accent} />
              </View>
            </View>
          </Animated.View>

          {/* Performance Mode */}
          <Animated.View entering={FadeInUp.duration(600).delay(300)} style={styles.section}>
            <Text style={styles.sectionTitle}>Performance Mode</Text>
            <View style={styles.modeRow}>
              {PERF_MODES.map((mode) => (
                <TouchableOpacity
                  key={mode}
                  onPress={() => setPerfMode(mode)}
                  style={[styles.modeCard, perfMode === mode && styles.modeCardActive]}
                >
                  <Text style={[styles.modeText, perfMode === mode && styles.modeTextActive]}>
                    {mode}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </Animated.View>

          {/* Gaming Tools */}
          <Animated.View entering={FadeInUp.duration(600).delay(400)} style={styles.section}>
            <Text style={styles.sectionTitle}>Gaming Tools</Text>
            <View style={styles.settingsGap}>
              <ToggleSetting
                icon={<Crosshair color={smartAim ? Colors.accent : Colors.textTertiary} size={20} />}
                title="Smart Aim Assist"
                description="Overlay aim assistance"
                value={smartAim}
                onValueChange={setSmartAim}
                color={Colors.accent}
              />
            </View>
            <View style={styles.settingsGap}>
              <ToggleSetting
                icon={<Mic color={voiceCommands ? Colors.primary : Colors.textTertiary} size={20} />}
                title="Voice Commands"
                description="Control game with voice"
                value={voiceCommands}
                onValueChange={setVoiceCommands}
                color={Colors.primary}
              />
            </View>
            <View style={styles.settingsGap}>
              <ToggleSetting
                icon={<BellOff color={doNotDisturb ? Colors.warning : Colors.textTertiary} size={20} />}
                title="Do Not Disturb"
                description="Block notifications in-game"
                value={doNotDisturb}
                onValueChange={setDoNotDisturb}
                color={Colors.warning}
              />
            </View>
            <View style={styles.settingsGap}>
              <ToggleSetting
                icon={<Smartphone color={floatingAssistant ? Colors.success : Colors.textTertiary} size={20} />}
                title="Floating Assistant"
                description="Overlay bubble while gaming"
                value={floatingAssistant}
                onValueChange={setFloatingAssistant}
                color={Colors.success}
              />
            </View>
          </Animated.View>

          {/* Quick Game Launch */}
          <Animated.View entering={FadeInUp.duration(600).delay(500)} style={styles.section}>
            <Text style={styles.sectionTitle}>Quick Game Launch</Text>
            <View style={styles.gameList}>
              {GAME_LIST.map((game) => (
                <TouchableOpacity key={game.name} style={styles.gameItem}>
                  <View style={[styles.gameIcon, { backgroundColor: game.color + '20' }]}>
                    <Gamepad2 color={game.color} size={20} />
                  </View>
                  <Text style={styles.gameName}>{game.name}</Text>
                  <ChevronRight color={Colors.textTertiary} size={16} />
                </TouchableOpacity>
              ))}
            </View>
          </Animated.View>

          {/* Performance Suggestions (only when gaming mode is on) */}
          {gamingMode && (
            <Animated.View entering={FadeInUp.duration(500)} style={styles.section}>
              <Text style={styles.sectionTitle}>Performance Suggestions</Text>
              <View style={styles.suggestionsCard}>
                {suggestions.map((tip, i) => (
                  <View key={i} style={[styles.suggestionRow, i < suggestions.length - 1 && styles.suggestionBorder]}>
                    <View style={styles.suggestionIcon}>
                      <Lightbulb color={Colors.warning} size={14} />
                    </View>
                    <Text style={styles.suggestionText}>{tip}</Text>
                  </View>
                ))}
              </View>
            </Animated.View>
          )}
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
    letterSpacing: 2,
  },
  headerSubtitle: {
    fontSize: FontSizes.sm,
    color: Colors.accent,
    fontWeight: '600',
    letterSpacing: 1,
  },

  mainToggle: { paddingHorizontal: Spacing.lg, marginBottom: Spacing.xl },
  mainToggleGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Spacing.xl,
    borderRadius: BorderRadius.xl,
    gap: Spacing.md,
    shadowColor: Colors.accent,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.25,
    shadowRadius: 12,
    elevation: 6,
  },
  mainToggleText: { fontSize: FontSizes.lg, fontWeight: '800', letterSpacing: 1.5 },

  section: { paddingHorizontal: Spacing.lg, marginBottom: Spacing.xl },
  sectionTitle: {
    fontSize: FontSizes.md,
    fontWeight: '700',
    color: Colors.textSecondary,
    marginBottom: Spacing.md,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },

  monitorCard: {
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.lg,
    padding: Spacing.lg,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  monitorGrid: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: Spacing.lg },
  monitorItem: { alignItems: 'center', gap: 2 },
  monitorValue: { fontSize: FontSizes.xl, fontWeight: '700', color: Colors.text },
  monitorLabel: { fontSize: FontSizes.xs, color: Colors.textTertiary, fontWeight: '500' },
  gaugesContainer: { marginTop: Spacing.sm },

  modeRow: { flexDirection: 'row', gap: Spacing.md },
  modeCard: {
    flex: 1,
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.md,
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
    alignItems: 'center',
  },
  modeCardActive: {
    borderColor: Colors.primary,
    backgroundColor: 'rgba(0, 229, 255, 0.08)',
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  modeText: { fontSize: FontSizes.sm, fontWeight: '600', color: Colors.textTertiary },
  modeTextActive: { color: Colors.primary },

  settingsGap: { marginBottom: Spacing.md },

  gameList: { gap: Spacing.md },
  gameItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.lg,
    padding: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.border,
    gap: Spacing.md,
  },
  gameIcon: {
    width: 44,
    height: 44,
    borderRadius: BorderRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  gameName: { flex: 1, fontSize: FontSizes.md, fontWeight: '600', color: Colors.text },

  suggestionsCard: {
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    borderColor: Colors.border,
    overflow: 'hidden',
  },
  suggestionRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Spacing.md,
    padding: Spacing.md,
  },
  suggestionBorder: { borderBottomWidth: 1, borderBottomColor: Colors.border },
  suggestionIcon: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: 'rgba(255, 214, 0, 0.12)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  suggestionText: { flex: 1, fontSize: FontSizes.sm, color: Colors.textSecondary, lineHeight: 20 },
});
