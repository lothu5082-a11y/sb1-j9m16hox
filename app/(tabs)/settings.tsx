import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Switch,
  TouchableOpacity,
  TextInput,
  Alert,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, { FadeInUp } from 'react-native-reanimated';
import {
  Settings as SettingsIcon,
  Brain,
  Mic,
  Gamepad2,
  Shield,
  Smartphone,
  Globe,
  Lock,
  Eye,
  Fingerprint,
  ChevronRight,
  Crown,
  Wifi,
  WifiOff,
  Zap,
  Database,
  CheckCircle,
} from 'lucide-react-native';
import { Colors, Spacing, FontSizes, BorderRadius } from '../../constants/theme';
import StatusBadge from '../../components/StatusBadge';
import { setAIConfig } from './chat';

// Shared module-level AI config (also exported for chat screen)
export let vexoraAIConfig = { provider: 'local', apiKey: '' };

interface SettingRowProps {
  icon: React.ReactNode;
  title: string;
  subtitle?: string;
  value?: boolean;
  onValueChange?: (val: boolean) => void;
  rightElement?: React.ReactNode;
  color?: string;
  onPress?: () => void;
}

function SettingRow({ icon, title, subtitle, value, onValueChange, rightElement, color = Colors.primary, onPress }: SettingRowProps) {
  const content = (
    <View style={settingStyles.container}>
      <View style={[settingStyles.iconWrap, { borderColor: value !== undefined ? (value ? color : Colors.border) : Colors.border }]}>
        {icon}
      </View>
      <View style={settingStyles.textWrap}>
        <Text style={settingStyles.title}>{title}</Text>
        {subtitle && <Text style={settingStyles.subtitle}>{subtitle}</Text>}
      </View>
      {value !== undefined && onValueChange ? (
        <Switch
          value={value}
          onValueChange={onValueChange}
          trackColor={{ false: Colors.surface, true: color + '40' }}
          thumbColor={value ? color : Colors.textTertiary}
        />
      ) : (
        rightElement || <ChevronRight color={Colors.textTertiary} size={16} />
      )}
    </View>
  );

  if (onPress) {
    return <TouchableOpacity onPress={onPress} activeOpacity={0.7}>{content}</TouchableOpacity>;
  }
  return content;
}

const settingStyles = StyleSheet.create({
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
  textWrap: {
    flex: 1,
  },
  title: {
    fontSize: FontSizes.md,
    fontWeight: '600',
    color: Colors.text,
    marginBottom: 1,
  },
  subtitle: {
    fontSize: FontSizes.xs,
    color: Colors.textTertiary,
  },
});

const PROVIDERS = [
  { id: 'local', name: 'Local', color: Colors.secondary },
  { id: 'openai', name: 'OpenAI', color: Colors.primary },
  { id: 'gemini', name: 'Gemini', color: Colors.warning },
  { id: 'claude', name: 'Claude', color: '#7C3AED' },
  { id: 'groq', name: 'Groq', color: Colors.accent },
];

const PERF_MODES = ['Performance', 'Balanced', 'Battery'];

// Fake memory counts
let memoryData = { preferences: 3, facts: 7, context: 12 };

export default function SettingsScreen() {
  const [selectedProvider, setSelectedProvider] = useState(vexoraAIConfig.provider);
  const [apiKey, setApiKey] = useState(vexoraAIConfig.apiKey);
  const [apiKeyVisible, setApiKeyVisible] = useState(false);

  const [voiceEnabled, setVoiceEnabled] = useState(true);
  const [wakeWord, setWakeWord] = useState(false);
  const [floatingAssistant, setFloatingAssistant] = useState(true);

  const [autoGaming, setAutoGaming] = useState(false);
  const [perfMonitor, setPerfMonitor] = useState(true);
  const [perfMode, setPerfMode] = useState('Balanced');

  const [memoryCount] = useState(memoryData.preferences + memoryData.facts + memoryData.context);
  const [memCounts, setMemCounts] = useState({ ...memoryData });

  const [biometricLock, setBiometricLock] = useState(false);
  const [privacyMode, setPrivacyMode] = useState(false);

  const [offlinePriority, setOfflinePriority] = useState(true);

  const saveAIConfig = () => {
    const newConfig = { provider: selectedProvider, apiKey };
    vexoraAIConfig = newConfig;
    setAIConfig(newConfig);
    Alert.alert('Saved', `AI provider set to ${selectedProvider === 'local' ? 'Local' : PROVIDERS.find(p => p.id === selectedProvider)?.name ?? selectedProvider}.`);
  };

  const clearMemories = () => {
    Alert.alert('Clear Memories', 'Are you sure you want to clear all stored memories?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Clear', style: 'destructive', onPress: () => setMemCounts({ preferences: 0, facts: 0, context: 0 }) },
    ]);
  };

  const totalMem = memCounts.preferences + memCounts.facts + memCounts.context;

  return (
    <View style={styles.container}>
      <LinearGradient colors={[Colors.background, Colors.backgroundSecondary]} style={styles.gradient}>
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>

          {/* Header */}
          <Animated.View entering={FadeInUp.duration(600)} style={styles.header}>
            <SettingsIcon color={Colors.primary} size={26} />
            <Text style={styles.headerTitle}>Settings</Text>
          </Animated.View>

          {/* AI Provider */}
          <Animated.View entering={FadeInUp.duration(600).delay(80)} style={styles.section}>
            <Text style={styles.sectionTitle}>AI Provider</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.providerScroll} contentContainerStyle={styles.providerScrollContent}>
              {PROVIDERS.map((p) => {
                const active = selectedProvider === p.id;
                return (
                  <TouchableOpacity
                    key={p.id}
                    onPress={() => setSelectedProvider(p.id)}
                    style={[
                      styles.providerCard,
                      active && { borderColor: p.color, backgroundColor: p.color + '18', shadowColor: p.color, shadowOpacity: 0.35, shadowRadius: 10, elevation: 6 },
                    ]}
                  >
                    <Brain color={active ? p.color : Colors.textTertiary} size={20} />
                    <Text style={[styles.providerName, active && { color: p.color }]}>{p.name}</Text>
                    {active && <View style={[styles.providerDot, { backgroundColor: p.color }]} />}
                  </TouchableOpacity>
                );
              })}
            </ScrollView>

            {selectedProvider !== 'local' && (
              <View style={styles.apiKeyRow}>
                <View style={styles.apiKeyInputWrap}>
                  <TextInput
                    style={styles.apiKeyInput}
                    placeholder="Enter API key..."
                    placeholderTextColor={Colors.textTertiary}
                    secureTextEntry={!apiKeyVisible}
                    value={apiKey}
                    onChangeText={setApiKey}
                    autoCapitalize="none"
                    autoCorrect={false}
                  />
                  <TouchableOpacity onPress={() => setApiKeyVisible(!apiKeyVisible)} style={styles.eyeButton}>
                    <Eye color={Colors.textTertiary} size={16} />
                  </TouchableOpacity>
                </View>
                <TouchableOpacity style={styles.saveButton} onPress={saveAIConfig}>
                  <Text style={styles.saveButtonText}>Save</Text>
                </TouchableOpacity>
              </View>
            )}

            {selectedProvider === 'local' && (
              <TouchableOpacity style={styles.saveButton} onPress={saveAIConfig}>
                <Text style={styles.saveButtonText}>Apply</Text>
              </TouchableOpacity>
            )}

            <TouchableOpacity style={styles.docsLink}>
              <Text style={styles.docsLinkText}>How to get API keys →</Text>
            </TouchableOpacity>
          </Animated.View>

          {/* Voice & Assistant */}
          <Animated.View entering={FadeInUp.duration(600).delay(160)} style={styles.section}>
            <Text style={styles.sectionTitle}>Voice & Assistant</Text>
            <View style={styles.settingsGap}>
              <SettingRow
                icon={<Mic color={voiceEnabled ? Colors.primary : Colors.textTertiary} size={20} />}
                title="Voice Assistant"
                subtitle="Enable voice commands"
                value={voiceEnabled}
                onValueChange={setVoiceEnabled}
                color={Colors.primary}
              />
            </View>
            <View style={styles.settingsGap}>
              <SettingRow
                icon={<Zap color={wakeWord ? Colors.primary : Colors.textTertiary} size={20} />}
                title='Wake Word'
                subtitle='"Hey Vexora" activation'
                value={wakeWord}
                onValueChange={setWakeWord}
                color={Colors.primary}
              />
            </View>
            <View style={styles.settingsGap}>
              <SettingRow
                icon={<Smartphone color={floatingAssistant ? Colors.success : Colors.textTertiary} size={20} />}
                title="Floating Assistant"
                subtitle="AI bubble over other apps"
                value={floatingAssistant}
                onValueChange={setFloatingAssistant}
                color={Colors.success}
              />
            </View>
            <View style={styles.settingsGap}>
              <SettingRow
                icon={<Globe color={Colors.textTertiary} size={20} />}
                title="Language"
                subtitle="English"
                rightElement={<Text style={styles.chevronLabel}>English</Text>}
                color={Colors.secondary}
              />
            </View>
          </Animated.View>

          {/* Gaming */}
          <Animated.View entering={FadeInUp.duration(600).delay(240)} style={styles.section}>
            <Text style={styles.sectionTitle}>Gaming</Text>
            <View style={styles.settingsGap}>
              <SettingRow
                icon={<Gamepad2 color={autoGaming ? Colors.accent : Colors.textTertiary} size={20} />}
                title="Auto Gaming Mode"
                subtitle="Auto-detect games and optimize"
                value={autoGaming}
                onValueChange={setAutoGaming}
                color={Colors.accent}
              />
            </View>
            <View style={styles.settingsGap}>
              <SettingRow
                icon={<Shield color={perfMonitor ? Colors.secondary : Colors.textTertiary} size={20} />}
                title="Performance Monitor"
                subtitle="Real-time FPS, CPU, RAM overlay"
                value={perfMonitor}
                onValueChange={setPerfMonitor}
                color={Colors.secondary}
              />
            </View>
            <Text style={styles.subLabel}>Performance Mode</Text>
            <View style={styles.modeRow}>
              {PERF_MODES.map((mode) => (
                <TouchableOpacity
                  key={mode}
                  onPress={() => setPerfMode(mode)}
                  style={[styles.modeChip, perfMode === mode && styles.modeChipActive]}
                >
                  <Text style={[styles.modeChipText, perfMode === mode && styles.modeChipTextActive]}>{mode}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </Animated.View>

          {/* Memory */}
          <Animated.View entering={FadeInUp.duration(600).delay(320)} style={styles.section}>
            <Text style={styles.sectionTitle}>Memory & Context</Text>
            <View style={styles.memoryCard}>
              <View style={styles.memoryHeader}>
                <Database color={Colors.primary} size={20} />
                <Text style={styles.memoryCount}>{totalMem} memories stored</Text>
              </View>
              <View style={styles.memoryStatsRow}>
                <View style={styles.memoryStat}>
                  <Text style={styles.memoryStatNum}>{memCounts.preferences}</Text>
                  <Text style={styles.memoryStatLabel}>Preferences</Text>
                </View>
                <View style={styles.memoryStatDivider} />
                <View style={styles.memoryStat}>
                  <Text style={styles.memoryStatNum}>{memCounts.facts}</Text>
                  <Text style={styles.memoryStatLabel}>Facts</Text>
                </View>
                <View style={styles.memoryStatDivider} />
                <View style={styles.memoryStat}>
                  <Text style={styles.memoryStatNum}>{memCounts.context}</Text>
                  <Text style={styles.memoryStatLabel}>Context</Text>
                </View>
              </View>
              <View style={styles.memoryButtons}>
                <TouchableOpacity
                  style={styles.memoryBtn}
                  onPress={() => Alert.alert('Memories', 'Memory management coming soon.')}
                >
                  <Text style={styles.memoryBtnText}>View Memories</Text>
                </TouchableOpacity>
                <TouchableOpacity style={[styles.memoryBtn, styles.memoryBtnDanger]} onPress={clearMemories}>
                  <Text style={styles.memoryBtnTextDanger}>Clear All</Text>
                </TouchableOpacity>
              </View>
            </View>
          </Animated.View>

          {/* Security */}
          <Animated.View entering={FadeInUp.duration(600).delay(400)} style={styles.section}>
            <Text style={styles.sectionTitle}>Security & Privacy</Text>
            <View style={styles.settingsGap}>
              <SettingRow
                icon={<Fingerprint color={biometricLock ? Colors.primary : Colors.textTertiary} size={20} />}
                title="Biometric Lock"
                subtitle="Fingerprint or face unlock"
                value={biometricLock}
                onValueChange={setBiometricLock}
                color={Colors.primary}
              />
            </View>
            <View style={styles.settingsGap}>
              <SettingRow
                icon={<Eye color={privacyMode ? Colors.warning : Colors.textTertiary} size={20} />}
                title="Privacy Mode"
                subtitle="Limited access for non-owners"
                value={privacyMode}
                onValueChange={setPrivacyMode}
                color={Colors.warning}
              />
            </View>
            <View style={styles.settingsGap}>
              <SettingRow
                icon={<Lock color={Colors.success} size={20} />}
                title="Encrypted Storage"
                subtitle="End-to-end encryption"
                rightElement={<StatusBadge label="Active" color={Colors.success} />}
                color={Colors.success}
              />
            </View>
            <View style={styles.settingsGap}>
              <SettingRow
                icon={<Shield color={Colors.success} size={20} />}
                title="Root Detection"
                subtitle="Device integrity verified"
                rightElement={<StatusBadge label="Safe" color={Colors.success} />}
                color={Colors.success}
              />
            </View>
          </Animated.View>

          {/* Offline AI */}
          <Animated.View entering={FadeInUp.duration(600).delay(480)} style={styles.section}>
            <Text style={styles.sectionTitle}>Offline AI</Text>
            <View style={styles.settingsGap}>
              <SettingRow
                icon={<WifiOff color={offlinePriority ? Colors.secondary : Colors.textTertiary} size={20} />}
                title="Offline Mode Priority"
                subtitle="Use local AI first"
                value={offlinePriority}
                onValueChange={setOfflinePriority}
                color={Colors.secondary}
              />
            </View>
            <View style={styles.offlineInfoCard}>
              <Wifi color={Colors.textTertiary} size={16} />
              <Text style={styles.offlineInfoText}>
                Offline AI uses pattern matching. For advanced capabilities, configure a cloud provider above.
              </Text>
            </View>
          </Animated.View>

          {/* About / Premium */}
          <Animated.View entering={FadeInUp.duration(600).delay(560)} style={styles.section}>
            <TouchableOpacity activeOpacity={0.8}>
              <LinearGradient colors={['rgba(255, 109, 0, 0.18)', 'rgba(255, 109, 0, 0.06)']} style={styles.premiumCard}>
                <Crown color={Colors.accent} size={24} />
                <View style={styles.premiumText}>
                  <Text style={styles.premiumTitle}>Upgrade to Vexora Pro</Text>
                  <Text style={styles.premiumDesc}>Unlock all AI models, unlimited generation, and priority response</Text>
                </View>
                <ChevronRight color={Colors.accent} size={18} />
              </LinearGradient>
            </TouchableOpacity>
          </Animated.View>

          {/* Footer */}
          <View style={styles.footer}>
            <CheckCircle color={Colors.textTertiary} size={14} />
            <Text style={styles.footerText}>Vexora AI v1.0.0</Text>
            <Text style={styles.footerSubtext}>Vexora AI — Intelligent Future Assistant</Text>
          </View>
        </ScrollView>
      </LinearGradient>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  gradient: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: Spacing.xxxl,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.xxxl + Spacing.md,
    marginBottom: Spacing.xl,
    gap: Spacing.md,
  },
  headerTitle: {
    fontSize: FontSizes.xxl,
    fontWeight: '700',
    color: Colors.text,
  },
  section: {
    paddingHorizontal: Spacing.lg,
    marginBottom: Spacing.xl,
  },
  sectionTitle: {
    fontSize: FontSizes.md,
    fontWeight: '700',
    color: Colors.textSecondary,
    marginBottom: Spacing.md,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  subLabel: {
    fontSize: FontSizes.sm,
    fontWeight: '600',
    color: Colors.textTertiary,
    marginTop: Spacing.sm,
    marginBottom: Spacing.sm,
  },
  providerScroll: {
    marginBottom: Spacing.md,
  },
  providerScrollContent: {
    gap: Spacing.md,
    paddingRight: Spacing.md,
  },
  providerCard: {
    flexDirection: 'column',
    alignItems: 'center',
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.md,
    width: 90,
    borderRadius: BorderRadius.md,
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
    gap: Spacing.xs,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0,
    shadowRadius: 0,
    elevation: 0,
  },
  providerName: {
    fontSize: FontSizes.sm,
    fontWeight: '600',
    color: Colors.textTertiary,
  },
  providerDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  apiKeyRow: {
    flexDirection: 'row',
    gap: Spacing.md,
    marginBottom: Spacing.sm,
  },
  apiKeyInputWrap: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    borderColor: Colors.border,
    paddingHorizontal: Spacing.md,
  },
  apiKeyInput: {
    flex: 1,
    fontSize: FontSizes.md,
    color: Colors.text,
    paddingVertical: Spacing.md,
  },
  eyeButton: {
    padding: Spacing.xs,
  },
  saveButton: {
    backgroundColor: Colors.primary,
    borderRadius: BorderRadius.md,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    alignSelf: 'flex-start',
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
    elevation: 4,
  },
  saveButtonText: {
    fontSize: FontSizes.md,
    fontWeight: '700',
    color: Colors.background,
  },
  docsLink: {
    marginTop: Spacing.sm,
    alignSelf: 'flex-start',
  },
  docsLinkText: {
    fontSize: FontSizes.sm,
    color: Colors.primary,
    fontWeight: '500',
  },
  settingsGap: {
    marginBottom: Spacing.md,
  },
  chevronLabel: {
    fontSize: FontSizes.sm,
    color: Colors.textTertiary,
    fontWeight: '500',
  },
  modeRow: {
    flexDirection: 'row',
    gap: Spacing.md,
  },
  modeChip: {
    flex: 1,
    paddingVertical: Spacing.sm + 2,
    borderRadius: BorderRadius.md,
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
    alignItems: 'center',
  },
  modeChipActive: {
    borderColor: Colors.primary,
    backgroundColor: 'rgba(0, 229, 255, 0.08)',
  },
  modeChipText: {
    fontSize: FontSizes.sm,
    fontWeight: '600',
    color: Colors.textTertiary,
  },
  modeChipTextActive: {
    color: Colors.primary,
  },
  memoryCard: {
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: Spacing.lg,
  },
  memoryHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    marginBottom: Spacing.lg,
  },
  memoryCount: {
    fontSize: FontSizes.md,
    fontWeight: '600',
    color: Colors.text,
  },
  memoryStatsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    marginBottom: Spacing.lg,
  },
  memoryStat: {
    alignItems: 'center',
    flex: 1,
  },
  memoryStatNum: {
    fontSize: FontSizes.xl,
    fontWeight: '700',
    color: Colors.primary,
  },
  memoryStatLabel: {
    fontSize: FontSizes.xs,
    color: Colors.textTertiary,
    marginTop: 2,
  },
  memoryStatDivider: {
    width: 1,
    height: 32,
    backgroundColor: Colors.border,
  },
  memoryButtons: {
    flexDirection: 'row',
    gap: Spacing.md,
  },
  memoryBtn: {
    flex: 1,
    paddingVertical: Spacing.sm + 2,
    borderRadius: BorderRadius.md,
    backgroundColor: Colors.backgroundTertiary,
    borderWidth: 1,
    borderColor: Colors.border,
    alignItems: 'center',
  },
  memoryBtnText: {
    fontSize: FontSizes.sm,
    fontWeight: '600',
    color: Colors.text,
  },
  memoryBtnDanger: {
    borderColor: Colors.error + '50',
    backgroundColor: 'rgba(255, 23, 68, 0.06)',
  },
  memoryBtnTextDanger: {
    fontSize: FontSizes.sm,
    fontWeight: '600',
    color: Colors.error,
  },
  offlineInfoCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: Colors.backgroundTertiary,
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.border,
    gap: Spacing.sm,
  },
  offlineInfoText: {
    flex: 1,
    fontSize: FontSizes.xs,
    color: Colors.textTertiary,
    lineHeight: 18,
  },
  premiumCard: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: BorderRadius.lg,
    padding: Spacing.lg,
    borderWidth: 1,
    borderColor: Colors.accent + '40',
    gap: Spacing.md,
  },
  premiumText: {
    flex: 1,
  },
  premiumTitle: {
    fontSize: FontSizes.md,
    fontWeight: '700',
    color: Colors.accent,
    marginBottom: 2,
  },
  premiumDesc: {
    fontSize: FontSizes.xs,
    color: Colors.textTertiary,
    lineHeight: 16,
  },
  footer: {
    paddingHorizontal: Spacing.lg,
    alignItems: 'center',
    marginTop: Spacing.lg,
    gap: Spacing.xs,
  },
  footerText: {
    fontSize: FontSizes.sm,
    color: Colors.textTertiary,
    fontWeight: '600',
  },
  footerSubtext: {
    fontSize: FontSizes.xs,
    color: Colors.textTertiary,
  },
});
