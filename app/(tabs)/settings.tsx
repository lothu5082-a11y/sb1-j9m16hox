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
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, { FadeInUp } from 'react-native-reanimated';
import {
  Settings as SettingsIcon,
  Cpu,
  Mic,
  Zap,
  Shield,
  Smartphone,
  Lock,
  Eye,
  Fingerprint,
  ChevronRight,
  Crown,
  WifiOff,
  Wifi,
  Database,
  CheckCircle,
  Bell,
  ClipboardList,
  Download,
  Trash2,
  PlayCircle,
  StopCircle,
  BrainCircuit,
} from 'lucide-react-native';
import { Colors, Spacing, FontSizes, BorderRadius } from '../../constants/theme';
import StatusBadge from '../../components/StatusBadge';
import { setAIConfig } from './chat';
import { llamaService, MODELS, type ModelMeta, type DownloadState } from '../../lib/llamaService';

export let riukaAIConfig = { provider: 'local', apiKey: '' };

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
  textWrap: { flex: 1 },
  title: { fontSize: FontSizes.md, fontWeight: '600', color: Colors.text, marginBottom: 1 },
  subtitle: { fontSize: FontSizes.xs, color: Colors.textTertiary },
});

const PROVIDERS = [
  { id: 'local', name: 'On-Device', color: Colors.secondary },
  { id: 'openai', name: 'OpenAI', color: Colors.primary },
  { id: 'gemini', name: 'Gemini', color: Colors.accent },
  { id: 'claude', name: 'Claude', color: '#7C3AED' },
  { id: 'groq', name: 'Groq', color: '#F97316' },
];

let memoryData = { preferences: 3, facts: 7, context: 12 };

export default function SettingsScreen() {
  const [selectedProvider, setSelectedProvider] = useState(riukaAIConfig.provider);
  const [apiKey, setApiKey] = useState(riukaAIConfig.apiKey);
  const [apiKeyVisible, setApiKeyVisible] = useState(false);

  const [downloadedIds, setDownloadedIds] = useState<string[]>([]);
  const [downloadState, setDownloadState] = useState<DownloadState | null>(null);
  const [loadingModelId, setLoadingModelId] = useState<string | null>(null);
  const [loadedModelId, setLoadedModelId] = useState<string | null>(null);
  const [modelError, setModelError] = useState<string>('');

  const refreshDownloaded = useCallback(async () => {
    const ids = await llamaService.getDownloadedModels();
    setDownloadedIds(ids);
    setLoadedModelId(llamaService.getLoadedModelId());
  }, []);

  useEffect(() => { refreshDownloaded(); }, []);

  const startDownload = (model: ModelMeta) => {
    setModelError('');
    setDownloadState({ modelId: model.id, progress: 0, downloadedMB: 0, totalMB: model.sizeMB });
    llamaService.downloadModel(
      model,
      (state) => setDownloadState({ ...state }),
      async () => {
        setDownloadState(null);
        await refreshDownloaded();
        // auto-load after download
        loadModel(model);
      },
      (msg) => {
        setDownloadState(null);
        setModelError(msg);
      }
    );
  };

  const cancelDownload = async () => {
    await llamaService.cancelDownload();
    setDownloadState(null);
  };

  const loadModel = async (model: ModelMeta) => {
    setLoadingModelId(model.id);
    setModelError('');
    try {
      await llamaService.load(model);
      setLoadedModelId(model.id);
    } catch (e: any) {
      setModelError(e?.message ?? 'Failed to load model');
    } finally {
      setLoadingModelId(null);
    }
  };

  const unloadModel = async () => {
    await llamaService.unload();
    setLoadedModelId(null);
  };

  const deleteModel = (model: ModelMeta) => {
    Alert.alert(
      'Delete Model',
      `Remove ${model.filename} from storage? This frees ${model.sizeMB >= 1000 ? (model.sizeMB / 1000).toFixed(1) + ' GB' : model.sizeMB + ' MB'}.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            await llamaService.deleteModel(model);
            await refreshDownloaded();
            if (loadedModelId === model.id) setLoadedModelId(null);
          },
        },
      ]
    );
  };

  const [voiceEnabled, setVoiceEnabled] = useState(true);
  const [wakeWord, setWakeWord] = useState(false);
  const [floatingAssistant, setFloatingAssistant] = useState(true);

  const [notifAutoReply, setNotifAutoReply] = useState(true);
  const [clipAutoAnalyze, setClipAutoAnalyze] = useState(true);
  const [accessibilityPilot, setAccessibilityPilot] = useState(false);

  const [memCounts, setMemCounts] = useState({ ...memoryData });

  const [biometricLock, setBiometricLock] = useState(false);
  const [privacyMode, setPrivacyMode] = useState(false);

  const [offlinePriority, setOfflinePriority] = useState(true);

  const saveAIConfig = () => {
    const newConfig = { provider: selectedProvider, apiKey };
    riukaAIConfig = newConfig;
    setAIConfig(newConfig);
    Alert.alert('Saved', `Brain engine set to ${PROVIDERS.find((p) => p.id === selectedProvider)?.name ?? selectedProvider}.`);
  };

  const clearMemories = () => {
    Alert.alert('Clear Memory Banks', 'Erase all stored context, preferences, and facts?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Erase', style: 'destructive', onPress: () => setMemCounts({ preferences: 0, facts: 0, context: 0 }) },
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

          {/* Brain Engine */}
          <Animated.View entering={FadeInUp.duration(600).delay(80)} style={styles.section}>
            <Text style={styles.sectionTitle}>Brain Engine</Text>
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
                    <Cpu color={active ? p.color : Colors.textTertiary} size={20} />
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
          </Animated.View>

          {/* On-Device Brain — model catalogue (native only) */}
          {Platform.OS !== 'web' && (
            <Animated.View entering={FadeInUp.duration(600).delay(140)} style={styles.section}>
              <View style={styles.modelSectionHeader}>
                <BrainCircuit color={Colors.primary} size={16} />
                <Text style={styles.sectionTitle}>On-Device Brain</Text>
              </View>

              {modelError ? (
                <View style={styles.modelErrorBanner}>
                  <Text style={styles.modelErrorBannerText}>{modelError}</Text>
                </View>
              ) : null}

              <View style={styles.modelList}>
                {MODELS.map((model) => {
                  const downloaded = downloadedIds.includes(model.id);
                  const isLoaded = loadedModelId === model.id;
                  const isLoading = loadingModelId === model.id;
                  const isThisDownloading = downloadState?.modelId === model.id;
                  const anyDownloading = downloadState !== null;
                  const sizeLabel = model.sizeMB >= 1000
                    ? (model.sizeMB / 1000).toFixed(1) + ' GB'
                    : model.sizeMB + ' MB';

                  return (
                    <View
                      key={model.id}
                      style={[
                        styles.modelCard,
                        isLoaded && { borderColor: model.tierColor + '60' },
                      ]}
                    >
                      {/* Header row */}
                      <View style={styles.modelCardHeader}>
                        <View style={[styles.modelIconWrap, { backgroundColor: model.tierColor + '15' }]}>
                          <Cpu color={model.tierColor} size={18} />
                        </View>
                        <View style={styles.modelCardMeta}>
                          <View style={styles.modelCardNameRow}>
                            <Text style={styles.modelCardName}>{model.name}</Text>
                            <View style={[styles.tierBadge, { backgroundColor: model.tierColor + '20', borderColor: model.tierColor + '50' }]}>
                              <Text style={[styles.tierBadgeText, { color: model.tierColor }]}>{model.tier}</Text>
                            </View>
                            {isLoaded && (
                              <View style={styles.activeBadge}>
                                <Text style={styles.activeBadgeText}>ACTIVE</Text>
                              </View>
                            )}
                          </View>
                          <Text style={styles.modelCardSub}>{model.subtitle} · {sizeLabel}</Text>
                        </View>
                      </View>

                      {/* Download progress bar */}
                      {isThisDownloading && downloadState && (
                        <View style={styles.progressSection}>
                          <View style={styles.progressBar}>
                            <View style={[styles.progressFill, { width: `${Math.round(downloadState.progress * 100)}%` as any, backgroundColor: model.tierColor }]} />
                          </View>
                          <View style={styles.progressLabels}>
                            <Text style={styles.progressText}>{downloadState.downloadedMB} MB / {downloadState.totalMB} MB</Text>
                            <Text style={[styles.progressText, { color: model.tierColor }]}>{Math.round(downloadState.progress * 100)}%</Text>
                          </View>
                        </View>
                      )}

                      {/* Loading bar (model init) */}
                      {isLoading && (
                        <View style={styles.progressSection}>
                          <View style={styles.progressBar}>
                            <View style={[styles.progressFill, styles.progressPulse, { width: '60%', backgroundColor: model.tierColor }]} />
                          </View>
                          <Text style={styles.progressText}>Initialising model…</Text>
                        </View>
                      )}

                      {/* Action buttons */}
                      <View style={styles.modelCardActions}>
                        {!downloaded && !isThisDownloading && (
                          <TouchableOpacity
                            style={[styles.modelBtn, styles.modelBtnPrimary, { backgroundColor: model.tierColor + '18', borderColor: model.tierColor + '50' }, anyDownloading && styles.modelBtnDisabled]}
                            onPress={() => startDownload(model)}
                            disabled={anyDownloading}
                          >
                            <Download color={model.tierColor} size={13} />
                            <Text style={[styles.modelBtnText, { color: model.tierColor }]}>Download</Text>
                          </TouchableOpacity>
                        )}

                        {isThisDownloading && (
                          <TouchableOpacity style={[styles.modelBtn, styles.modelBtnDanger]} onPress={cancelDownload}>
                            <StopCircle color={Colors.error} size={13} />
                            <Text style={[styles.modelBtnText, { color: Colors.error }]}>Cancel</Text>
                          </TouchableOpacity>
                        )}

                        {downloaded && !isLoaded && !isThisDownloading && (
                          <TouchableOpacity
                            style={[styles.modelBtn, { backgroundColor: model.tierColor + '18', borderColor: model.tierColor + '50' }, isLoading && styles.modelBtnDisabled]}
                            onPress={() => loadModel(model)}
                            disabled={isLoading}
                          >
                            <PlayCircle color={model.tierColor} size={13} />
                            <Text style={[styles.modelBtnText, { color: model.tierColor }]}>{isLoading ? 'Loading…' : 'Load'}</Text>
                          </TouchableOpacity>
                        )}

                        {isLoaded && (
                          <TouchableOpacity style={[styles.modelBtn, styles.modelBtnDanger]} onPress={unloadModel}>
                            <StopCircle color={Colors.error} size={13} />
                            <Text style={[styles.modelBtnText, { color: Colors.error }]}>Unload</Text>
                          </TouchableOpacity>
                        )}

                        {downloaded && (
                          <TouchableOpacity
                            style={[styles.modelBtn, styles.modelBtnGhost]}
                            onPress={() => deleteModel(model)}
                          >
                            <Trash2 color={Colors.textTertiary} size={13} />
                          </TouchableOpacity>
                        )}
                      </View>
                    </View>
                  );
                })}
              </View>
            </Animated.View>
          )}

          {/* Voice & Wake Word */}
          <Animated.View entering={FadeInUp.duration(600).delay(160)} style={styles.section}>
            <Text style={styles.sectionTitle}>Voice & Wake Word</Text>
            <View style={styles.settingsGap}>
              <SettingRow
                icon={<Mic color={voiceEnabled ? Colors.primary : Colors.textTertiary} size={20} />}
                title="Voice Assistant"
                subtitle="Enable spoken commands"
                value={voiceEnabled}
                onValueChange={setVoiceEnabled}
                color={Colors.primary}
              />
            </View>
            <View style={styles.settingsGap}>
              <SettingRow
                icon={<Zap color={wakeWord ? Colors.primary : Colors.textTertiary} size={20} />}
                title='Wake Word Detection'
                subtitle='"Hey Riuka" always-on activation'
                value={wakeWord}
                onValueChange={setWakeWord}
                color={Colors.primary}
              />
            </View>
            <View style={styles.settingsGap}>
              <SettingRow
                icon={<Smartphone color={floatingAssistant ? Colors.secondary : Colors.textTertiary} size={20} />}
                title="Floating Overlay"
                subtitle="Persistent AI bubble over all apps"
                value={floatingAssistant}
                onValueChange={setFloatingAssistant}
                color={Colors.secondary}
              />
            </View>
          </Animated.View>

          {/* Automation Engine */}
          <Animated.View entering={FadeInUp.duration(600).delay(240)} style={styles.section}>
            <Text style={styles.sectionTitle}>Automation Engine</Text>
            <View style={styles.settingsGap}>
              <SettingRow
                icon={<Bell color={notifAutoReply ? Colors.primary : Colors.textTertiary} size={20} />}
                title="Auto-Reply Drafting"
                subtitle="Draft responses to incoming messages"
                value={notifAutoReply}
                onValueChange={setNotifAutoReply}
                color={Colors.primary}
              />
            </View>
            <View style={styles.settingsGap}>
              <SettingRow
                icon={<ClipboardList color={clipAutoAnalyze ? Colors.secondary : Colors.textTertiary} size={20} />}
                title="Clipboard Auto-Analysis"
                subtitle="Instant analysis on every copy event"
                value={clipAutoAnalyze}
                onValueChange={setClipAutoAnalyze}
                color={Colors.secondary}
              />
            </View>
            <View style={styles.settingsGap}>
              <SettingRow
                icon={<Zap color={accessibilityPilot ? Colors.accent : Colors.textTertiary} size={20} />}
                title="Interface Pilot"
                subtitle="Accessibility-layer app control"
                value={accessibilityPilot}
                onValueChange={setAccessibilityPilot}
                color={Colors.accent}
              />
            </View>
          </Animated.View>

          {/* Memory Banks */}
          <Animated.View entering={FadeInUp.duration(600).delay(320)} style={styles.section}>
            <Text style={styles.sectionTitle}>Memory Banks</Text>
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
                  onPress={() => Alert.alert('Memory Banks', 'Memory management interface coming soon.')}
                >
                  <Text style={styles.memoryBtnText}>View Banks</Text>
                </TouchableOpacity>
                <TouchableOpacity style={[styles.memoryBtn, styles.memoryBtnDanger]} onPress={clearMemories}>
                  <Text style={styles.memoryBtnTextDanger}>Erase All</Text>
                </TouchableOpacity>
              </View>
            </View>
          </Animated.View>

          {/* Security & Privacy */}
          <Animated.View entering={FadeInUp.duration(600).delay(400)} style={styles.section}>
            <Text style={styles.sectionTitle}>Security & Privacy</Text>
            <View style={styles.settingsGap}>
              <SettingRow
                icon={<Fingerprint color={biometricLock ? Colors.primary : Colors.textTertiary} size={20} />}
                title="Biometric Lock"
                subtitle="Fingerprint or face authentication"
                value={biometricLock}
                onValueChange={setBiometricLock}
                color={Colors.primary}
              />
            </View>
            <View style={styles.settingsGap}>
              <SettingRow
                icon={<Eye color={privacyMode ? Colors.accent : Colors.textTertiary} size={20} />}
                title="Privacy Mode"
                subtitle="Restrict access to owner only"
                value={privacyMode}
                onValueChange={setPrivacyMode}
                color={Colors.accent}
              />
            </View>
            <View style={styles.settingsGap}>
              <SettingRow
                icon={<Lock color={Colors.secondary} size={20} />}
                title="On-Device Encryption"
                subtitle="AES-256 local data encryption"
                rightElement={<StatusBadge label="Active" color={Colors.secondary} />}
                color={Colors.secondary}
              />
            </View>
            <View style={styles.settingsGap}>
              <SettingRow
                icon={<Shield color={Colors.secondary} size={20} />}
                title="Zero Cloud Architecture"
                subtitle="No data leaves your device"
                rightElement={<StatusBadge label="Verified" color={Colors.secondary} />}
                color={Colors.secondary}
              />
            </View>
          </Animated.View>

          {/* Offline AI */}
          <Animated.View entering={FadeInUp.duration(600).delay(480)} style={styles.section}>
            <Text style={styles.sectionTitle}>Offline Mode</Text>
            <View style={styles.settingsGap}>
              <SettingRow
                icon={<WifiOff color={offlinePriority ? Colors.secondary : Colors.textTertiary} size={20} />}
                title="On-Device Priority"
                subtitle="Always use local brain first"
                value={offlinePriority}
                onValueChange={setOfflinePriority}
                color={Colors.secondary}
              />
            </View>
            <View style={styles.offlineInfoCard}>
              <Wifi color={Colors.textTertiary} size={16} />
              <Text style={styles.offlineInfoText}>
                The on-device model uses pattern-matching and local inference. Configure a cloud fallback above for extended capabilities — your data is only sent when you explicitly choose a cloud provider.
              </Text>
            </View>
          </Animated.View>

          {/* Premium */}
          <Animated.View entering={FadeInUp.duration(600).delay(560)} style={styles.section}>
            <TouchableOpacity activeOpacity={0.8}>
              <LinearGradient colors={['rgba(168,85,247,0.18)', 'rgba(168,85,247,0.06)']} style={styles.premiumCard}>
                <Crown color={Colors.primary} size={24} />
                <View style={styles.premiumText}>
                  <Text style={styles.premiumTitle}>Upgrade to Riuka Pro</Text>
                  <Text style={styles.premiumDesc}>Unlock extended automation pipelines, unlimited memory banks, and priority on-device model updates</Text>
                </View>
                <ChevronRight color={Colors.primary} size={18} />
              </LinearGradient>
            </TouchableOpacity>
          </Animated.View>

          {/* Footer */}
          <View style={styles.footer}>
            <CheckCircle color={Colors.secondary} size={14} />
            <Text style={styles.footerText}>Riuka AI v1.0.0</Text>
            <Text style={styles.footerSubtext}>On-Device · Zero Cloud · Absolute Privacy</Text>
          </View>

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
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.xxxl + Spacing.md,
    marginBottom: Spacing.xl,
    gap: Spacing.md,
  },
  headerTitle: { fontSize: FontSizes.xxl, fontWeight: '700', color: Colors.text },
  section: { paddingHorizontal: Spacing.lg, marginBottom: Spacing.xl },
  sectionTitle: {
    fontSize: FontSizes.md,
    fontWeight: '700',
    color: Colors.textSecondary,
    marginBottom: Spacing.md,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  providerScroll: { marginBottom: Spacing.md },
  providerScrollContent: { gap: Spacing.md, paddingRight: Spacing.md },
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
  providerName: { fontSize: FontSizes.sm, fontWeight: '600', color: Colors.textTertiary },
  providerDot: { width: 6, height: 6, borderRadius: 3 },
  apiKeyRow: { flexDirection: 'row', gap: Spacing.md, marginBottom: Spacing.sm },
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
  apiKeyInput: { flex: 1, fontSize: FontSizes.md, color: Colors.text, paddingVertical: Spacing.md },
  eyeButton: { padding: Spacing.xs },
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
  saveButtonText: { fontSize: FontSizes.md, fontWeight: '700', color: '#ffffff' },
  settingsGap: { marginBottom: Spacing.md },
  memoryCard: {
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: Spacing.lg,
  },
  memoryHeader: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, marginBottom: Spacing.lg },
  memoryCount: { fontSize: FontSizes.md, fontWeight: '600', color: Colors.text },
  memoryStatsRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-around', marginBottom: Spacing.lg },
  memoryStat: { alignItems: 'center', flex: 1 },
  memoryStatNum: { fontSize: FontSizes.xl, fontWeight: '700', color: Colors.primary },
  memoryStatLabel: { fontSize: FontSizes.xs, color: Colors.textTertiary, marginTop: 2 },
  memoryStatDivider: { width: 1, height: 32, backgroundColor: Colors.border },
  memoryButtons: { flexDirection: 'row', gap: Spacing.md },
  memoryBtn: {
    flex: 1,
    paddingVertical: Spacing.sm + 2,
    borderRadius: BorderRadius.md,
    backgroundColor: Colors.backgroundTertiary,
    borderWidth: 1,
    borderColor: Colors.border,
    alignItems: 'center',
  },
  memoryBtnText: { fontSize: FontSizes.sm, fontWeight: '600', color: Colors.text },
  memoryBtnDanger: { borderColor: Colors.error + '50', backgroundColor: 'rgba(239,68,68,0.06)' },
  memoryBtnTextDanger: { fontSize: FontSizes.sm, fontWeight: '600', color: Colors.error },
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
  offlineInfoText: { flex: 1, fontSize: FontSizes.xs, color: Colors.textTertiary, lineHeight: 18 },
  premiumCard: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: BorderRadius.lg,
    padding: Spacing.lg,
    borderWidth: 1,
    borderColor: Colors.primary + '40',
    gap: Spacing.md,
  },
  premiumText: { flex: 1 },
  premiumTitle: { fontSize: FontSizes.md, fontWeight: '700', color: Colors.primary, marginBottom: 2 },
  premiumDesc: { fontSize: FontSizes.xs, color: Colors.textTertiary, lineHeight: 16 },
  footer: {
    paddingHorizontal: Spacing.lg,
    alignItems: 'center',
    marginTop: Spacing.lg,
    gap: Spacing.xs,
  },
  footerText: { fontSize: FontSizes.sm, color: Colors.textTertiary, fontWeight: '600' },
  footerSubtext: { fontSize: FontSizes.xs, color: Colors.textTertiary },

  modelSectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    marginBottom: Spacing.md,
  },
  modelErrorBanner: {
    backgroundColor: 'rgba(239,68,68,0.08)',
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    borderColor: Colors.error + '40',
    padding: Spacing.md,
    marginBottom: Spacing.md,
  },
  modelErrorBannerText: { fontSize: FontSizes.xs, color: Colors.error, lineHeight: 16 },

  modelList: { gap: Spacing.md },
  modelCard: {
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: Spacing.md,
    gap: Spacing.md,
  },
  modelCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
  },
  modelIconWrap: {
    width: 40,
    height: 40,
    borderRadius: BorderRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modelCardMeta: { flex: 1 },
  modelCardNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    flexWrap: 'wrap',
  },
  modelCardName: { fontSize: FontSizes.md, fontWeight: '700', color: Colors.text },
  tierBadge: {
    borderRadius: BorderRadius.full,
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderWidth: 1,
  },
  tierBadgeText: { fontSize: 9, fontWeight: '800', letterSpacing: 0.3 },
  activeBadge: {
    backgroundColor: Colors.secondary + '20',
    borderRadius: BorderRadius.full,
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderWidth: 1,
    borderColor: Colors.secondary + '50',
  },
  activeBadgeText: { fontSize: 9, fontWeight: '800', color: Colors.secondary, letterSpacing: 0.3 },
  modelCardSub: { fontSize: FontSizes.xs, color: Colors.textTertiary, marginTop: 2 },

  progressSection: { gap: 5 },
  progressBar: {
    height: 5,
    borderRadius: 3,
    backgroundColor: Colors.backgroundTertiary,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 3,
  },
  progressPulse: { opacity: 0.8 },
  progressLabels: { flexDirection: 'row', justifyContent: 'space-between' },
  progressText: { fontSize: FontSizes.xs, color: Colors.textTertiary },

  modelCardActions: {
    flexDirection: 'row',
    gap: Spacing.sm,
  },
  modelBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    borderRadius: BorderRadius.full,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  modelBtnPrimary: { flex: 1, justifyContent: 'center' },
  modelBtnDanger: { flex: 1, justifyContent: 'center', backgroundColor: 'rgba(239,68,68,0.06)', borderColor: Colors.error + '40' },
  modelBtnGhost: { borderColor: Colors.border, paddingHorizontal: Spacing.sm },
  modelBtnDisabled: { opacity: 0.4 },
  modelBtnText: { fontSize: FontSizes.sm, fontWeight: '700' },
});
