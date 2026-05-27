import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, Switch, TouchableOpacity, TextInput, Alert } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, { FadeInUp } from 'react-native-reanimated';
import {
  Settings as SettingsIcon, Brain, Mic, Gamepad2, Phone, Smartphone,
  Globe, Bell, Lock, Eye, Fingerprint, ChevronRight, Sparkles, Crown,
  Database, HardDrive, Trash2, Zap, Palette, Vibrate, Key, Check,
} from 'lucide-react-native';
import { Colors, Spacing, FontSizes, BorderRadius } from '../../constants/theme';
import StatusBadge from '../../components/StatusBadge';
import { saveApiKey, loadApiKeys } from '../../lib/ai';
import { storage } from '../../lib/storage';

interface SettingRowProps {
  icon: React.ReactNode;
  title: string;
  subtitle?: string;
  value?: boolean;
  onValueChange?: (val: boolean) => void;
  rightElement?: React.ReactNode;
  color?: string;
}

function SettingRow({ icon, title, subtitle, value, onValueChange, rightElement, color = Colors.primary }: SettingRowProps) {
  return (
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

const aiModes = [
  { id: 'assistant', label: 'Assistant' },
  { id: 'study', label: 'Study' },
  { id: 'coding', label: 'Coding' },
  { id: 'creative', label: 'Creative' },
  { id: 'business', label: 'Business' },
  { id: 'travel', label: 'Travel' },
];

export default function SettingsScreen() {
  const [voiceEnabled, setVoiceEnabled] = useState(true);
  const [wakeWord, setWakeWord] = useState(false);
  const [gamingMode, setGamingMode] = useState(true);
  const [autoAnswer, setAutoAnswer] = useState(false);
  const [floatingBubble, setFloatingBubble] = useState(true);
  const [notifications, setNotifications] = useState(true);
  const [biometricLock, setBiometricLock] = useState(false);
  const [privacyMode, setPrivacyMode] = useState(false);
  const [selectedModel, setSelectedModel] = useState('gemini');
  const [selectedMode, setSelectedMode] = useState('assistant');
  const [userMemory, setUserMemory] = useState(true);
  const [conversationHistory, setConversationHistory] = useState(true);
  const [animationsEnabled, setAnimationsEnabled] = useState(true);
  const [hapticFeedback, setHapticFeedback] = useState(true);
  const [animationSpeed, setAnimationSpeed] = useState<'slow' | 'normal' | 'fast'>('normal');
  const [apiKeys, setApiKeys] = useState<Record<string, string>>({});
  const [editingKey, setEditingKey] = useState<string | null>(null);
  const [keyInput, setKeyInput] = useState('');

  useEffect(() => {
    loadApiKeys().then(setApiKeys);
    storage.getJSON<string>('vexora:selected_model').then(m => {
      if (m) setSelectedModel(m);
    });
  }, []);

  const handleSelectModel = (id: string) => {
    setSelectedModel(id);
    storage.setJSON('vexora:selected_model', id);
  };

  const handleSaveKey = async (modelId: string) => {
    if (!keyInput.trim()) return;
    await saveApiKey(modelId, keyInput.trim());
    setApiKeys(prev => ({ ...prev, [modelId]: keyInput.trim() }));
    setEditingKey(null);
    setKeyInput('');
  };

  const animationSpeeds = [
    { id: 'slow' as const, label: 'Slow' },
    { id: 'normal' as const, label: 'Normal' },
    { id: 'fast' as const, label: 'Fast' },
  ];

  const aiModels = [
    { id: 'free',   name: 'Free AI', color: Colors.success },
    { id: 'gemini', name: 'Gemini',  color: Colors.primary },
    { id: 'openai', name: 'OpenAI',  color: Colors.secondary },
    { id: 'groq',   name: 'Groq',    color: Colors.accent },
    { id: 'claude', name: 'Claude',  color: '#FF6B35' },
  ];

  return (
    <View style={styles.container}>
      <LinearGradient colors={[Colors.background, Colors.backgroundSecondary]} style={styles.gradient}>
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
          <Animated.View entering={FadeInUp.duration(600)} style={styles.header}>
            <SettingsIcon color={Colors.textTertiary} size={28} />
            <Text style={styles.headerTitle}>Settings</Text>
          </Animated.View>

          <Animated.View entering={FadeInUp.duration(600).delay(100)} style={styles.section}>
            <Text style={styles.sectionTitle}>AI Model</Text>
            <View style={styles.modelRow}>
              {aiModels.map((model) => (
                <TouchableOpacity
                  key={model.id}
                  onPress={() => handleSelectModel(model.id)}
                  style={[
                    styles.modelCard,
                    selectedModel === model.id && { borderColor: model.color, backgroundColor: model.color + '10' },
                  ]}
                >
                  <Brain
                    color={selectedModel === model.id ? model.color : Colors.textTertiary}
                    size={20}
                  />
                  <Text
                    style={[
                      styles.modelName,
                      selectedModel === model.id && { color: model.color },
                    ]}
                  >
                    {model.name}
                  </Text>
                  {selectedModel === model.id && (
                    <View style={[styles.modelDot, { backgroundColor: model.color }]} />
                  )}
                </TouchableOpacity>
              ))}
            </View>
          </Animated.View>

          <Animated.View entering={FadeInUp.duration(600).delay(150)} style={styles.section}>
            <Text style={styles.sectionTitle}>API Keys</Text>
            <Text style={[styles.sectionTitle, { fontSize: FontSizes.xs, textTransform: 'none', letterSpacing: 0, color: Colors.textTertiary, marginTop: -8, marginBottom: Spacing.md }]}>
              Gemini & Groq are free · Keys saved on device only
            </Text>
            {aiModels.filter(m => m.id !== 'free').map((model) => {
              const hasKey = !!apiKeys[model.id];
              const isEditing = editingKey === model.id;
              return (
                <View key={model.id} style={[styles.settingsGap]}>
                  <View style={[settingStyles.container, { flexDirection: 'column', alignItems: 'stretch', gap: Spacing.sm }]}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: Spacing.md }}>
                      <View style={[settingStyles.iconWrap, { borderColor: hasKey ? model.color : Colors.border }]}>
                        <Key color={hasKey ? model.color : Colors.textTertiary} size={18} />
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={settingStyles.title}>{model.name}</Text>
                        <Text style={settingStyles.subtitle}>{hasKey ? '● Key saved' : 'No key — tap to add'}</Text>
                      </View>
                      <TouchableOpacity
                        onPress={() => { setEditingKey(isEditing ? null : model.id); setKeyInput(''); }}
                        style={{ padding: 4 }}
                      >
                        <Text style={{ color: isEditing ? Colors.error : model.color, fontSize: FontSizes.sm, fontWeight: '700' }}>
                          {isEditing ? 'Cancel' : hasKey ? 'Edit' : 'Add'}
                        </Text>
                      </TouchableOpacity>
                    </View>
                    {isEditing && (
                      <View style={{ flexDirection: 'row', gap: Spacing.sm, alignItems: 'center' }}>
                        <TextInput
                          style={[styles.keyInput, { borderColor: model.color + '60' }]}
                          placeholder={`Paste ${model.name} API key...`}
                          placeholderTextColor={Colors.textTertiary}
                          value={keyInput}
                          onChangeText={setKeyInput}
                          secureTextEntry
                          autoCapitalize="none"
                          autoCorrect={false}
                        />
                        <TouchableOpacity
                          onPress={() => handleSaveKey(model.id)}
                          style={[styles.saveKeyBtn, { backgroundColor: model.color }]}
                        >
                          <Check color={Colors.background} size={18} />
                        </TouchableOpacity>
                      </View>
                    )}
                  </View>
                </View>
              );
            })}
          </Animated.View>

          <Animated.View entering={FadeInUp.duration(600).delay(200)} style={styles.section}>
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
                icon={<Sparkles color={wakeWord ? Colors.primary : Colors.textTertiary} size={20} />}
                title="Wake Word"
                subtitle='Say "Hey Vexora" to activate'
                value={wakeWord}
                onValueChange={setWakeWord}
                color={Colors.primary}
              />
            </View>
            <View style={styles.settingsGap}>
              <SettingRow
                icon={<Smartphone color={floatingBubble ? Colors.success : Colors.textTertiary} size={20} />}
                title="Floating Assistant"
                subtitle="Vexora bubble over other apps"
                value={floatingBubble}
                onValueChange={setFloatingBubble}
                color={Colors.success}
              />
            </View>
            <View style={styles.settingsGap}>
              <SettingRow
                icon={<Globe color={Colors.textTertiary} size={20} />}
                title="Language"
                subtitle="English"
                color={Colors.secondary}
              />
            </View>
          </Animated.View>

          <Animated.View entering={FadeInUp.duration(600).delay(250)} style={styles.section}>
            <Text style={styles.sectionTitle}>AI Modes</Text>
            <View style={styles.modesGrid}>
              {aiModes.map((mode) => (
                <TouchableOpacity
                  key={mode.id}
                  onPress={() => setSelectedMode(mode.id)}
                  style={[
                    styles.modeChip,
                    selectedMode === mode.id && styles.modeChipSelected,
                  ]}
                >
                  <Text
                    style={[
                      styles.modeChipText,
                      selectedMode === mode.id && styles.modeChipTextSelected,
                    ]}
                  >
                    {mode.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </Animated.View>

          <Animated.View entering={FadeInUp.duration(600).delay(300)} style={styles.section}>
            <Text style={styles.sectionTitle}>Gaming</Text>
            <View style={styles.settingsGap}>
              <SettingRow
                icon={<Gamepad2 color={gamingMode ? Colors.accent : Colors.textTertiary} size={20} />}
                title="Gaming Mode"
                subtitle="Auto-detect and optimize games"
                value={gamingMode}
                onValueChange={setGamingMode}
                color={Colors.accent}
              />
            </View>
          </Animated.View>

          <Animated.View entering={FadeInUp.duration(600).delay(400)} style={styles.section}>
            <Text style={styles.sectionTitle}>Calls</Text>
            <View style={styles.settingsGap}>
              <SettingRow
                icon={<Phone color={autoAnswer ? Colors.success : Colors.textTertiary} size={20} />}
                title="Auto Answer Calls"
                subtitle="Vexora answers when you are busy"
                value={autoAnswer}
                onValueChange={setAutoAnswer}
                color={Colors.success}
              />
            </View>
          </Animated.View>

          <Animated.View entering={FadeInUp.duration(600).delay(500)} style={styles.section}>
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
                icon={<Lock color={Colors.textTertiary} size={20} />}
                title="Encrypted Chats"
                subtitle="End-to-end encryption enabled"
                color={Colors.success}
                rightElement={<StatusBadge label="Active" color={Colors.success} />}
              />
            </View>
          </Animated.View>

          <Animated.View entering={FadeInUp.duration(600).delay(550)} style={styles.section}>
            <Text style={styles.sectionTitle}>Memory & Data</Text>
            <View style={styles.settingsGap}>
              <SettingRow
                icon={<Brain color={userMemory ? Colors.primary : Colors.textTertiary} size={20} />}
                title="User Memory"
                subtitle="Vexora remembers your preferences"
                value={userMemory}
                onValueChange={setUserMemory}
                color={Colors.primary}
              />
            </View>
            <View style={styles.settingsGap}>
              <SettingRow
                icon={<HardDrive color={conversationHistory ? Colors.secondary : Colors.textTertiary} size={20} />}
                title="Conversation History"
                subtitle="Save chat history locally"
                value={conversationHistory}
                onValueChange={setConversationHistory}
                color={Colors.secondary}
              />
            </View>
            <View style={styles.settingsGap}>
              <SettingRow
                icon={<Database color={Colors.textTertiary} size={20} />}
                title="Export Data"
                subtitle="Download your data"
                color={Colors.secondary}
              />
            </View>
            <View style={styles.settingsGap}>
              <SettingRow
                icon={<Trash2 color={Colors.error} size={20} />}
                title="Clear Memory"
                subtitle="Delete all stored preferences"
                color={Colors.error}
                rightElement={<ChevronRight color={Colors.error} size={16} />}
              />
            </View>
          </Animated.View>

          <Animated.View entering={FadeInUp.duration(600).delay(580)} style={styles.section}>
            <Text style={styles.sectionTitle}>Appearance & Animations</Text>
            <View style={styles.settingsGap}>
              <SettingRow
                icon={<Zap color={animationsEnabled ? Colors.primary : Colors.textTertiary} size={20} />}
                title="Animations"
                subtitle="Smooth transitions and effects"
                value={animationsEnabled}
                onValueChange={setAnimationsEnabled}
                color={Colors.primary}
              />
            </View>
            <View style={styles.settingsGap}>
              <SettingRow
                icon={<Vibrate color={hapticFeedback ? Colors.secondary : Colors.textTertiary} size={20} />}
                title="Haptic Feedback"
                subtitle="Vibration on button press"
                value={hapticFeedback}
                onValueChange={setHapticFeedback}
                color={Colors.secondary}
              />
            </View>
            <View style={[styles.settingsGap, { marginBottom: 0 }]}>
              <View style={[settingStyles.container, { flexDirection: 'column', alignItems: 'flex-start', gap: Spacing.md }]}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: Spacing.md }}>
                  <View style={[settingStyles.iconWrap, { borderColor: Colors.border }]}>
                    <Palette color={Colors.accent} size={20} />
                  </View>
                  <View>
                    <Text style={settingStyles.title}>Animation Speed</Text>
                    <Text style={settingStyles.subtitle}>Controls transition timing</Text>
                  </View>
                </View>
                <View style={styles.speedRow}>
                  {animationSpeeds.map((s) => (
                    <TouchableOpacity
                      key={s.id}
                      onPress={() => setAnimationSpeed(s.id)}
                      style={[
                        styles.speedChip,
                        animationSpeed === s.id && { borderColor: Colors.accent, backgroundColor: Colors.accent + '15' },
                      ]}
                    >
                      <Text style={[styles.speedChipText, animationSpeed === s.id && { color: Colors.accent }]}>
                        {s.label}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
            </View>
          </Animated.View>

          <Animated.View entering={FadeInUp.duration(600).delay(600)} style={styles.section}>
            <Text style={styles.sectionTitle}>Notifications</Text>
            <View style={styles.settingsGap}>
              <SettingRow
                icon={<Bell color={notifications ? Colors.primary : Colors.textTertiary} size={20} />}
                title="Notifications"
                subtitle="Push notifications"
                value={notifications}
                onValueChange={setNotifications}
                color={Colors.primary}
              />
            </View>
          </Animated.View>

          <Animated.View entering={FadeInUp.duration(600).delay(700)} style={styles.section}>
            <TouchableOpacity activeOpacity={0.8}>
              <LinearGradient colors={['rgba(255, 109, 0, 0.15)', 'rgba(255, 109, 0, 0.05)']} style={styles.premiumCard}>
                <Crown color={Colors.accent} size={24} />
                <View style={styles.premiumText}>
                  <Text style={styles.premiumTitle}>Upgrade to Vexora Pro</Text>
                  <Text style={styles.premiumDesc}>Unlock all AI models, unlimited generation, and more</Text>
                </View>
                <ChevronRight color={Colors.accent} size={18} />
              </LinearGradient>
            </TouchableOpacity>
          </Animated.View>

          <View style={styles.footer}>
            <Text style={styles.footerText}>Vexora AI v1.0.0</Text>
            <Text style={styles.footerSubtext}>Your AI-Powered Life Assistant</Text>
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
  modelRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.md,
  },
  modelCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.md,
    borderRadius: BorderRadius.md,
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
    gap: Spacing.sm,
    minWidth: '45%',
    flex: 1,
  },
  modelName: {
    fontSize: FontSizes.sm,
    fontWeight: '600',
    color: Colors.textTertiary,
  },
  modelDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  modesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.md,
  },
  modeChip: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm + 2,
    borderRadius: BorderRadius.full,
    borderWidth: 1,
    borderColor: Colors.border,
    backgroundColor: Colors.surface,
    minWidth: '30%',
    alignItems: 'center',
  },
  modeChipSelected: {
    borderColor: Colors.primary,
    backgroundColor: 'rgba(0, 229, 255, 0.12)',
  },
  modeChipText: {
    fontSize: FontSizes.sm,
    fontWeight: '600',
    color: Colors.textTertiary,
  },
  modeChipTextSelected: {
    color: Colors.primary,
  },
  settingsGap: {
    marginBottom: Spacing.md,
  },
  keyInput: {
    flex: 1,
    backgroundColor: Colors.backgroundTertiary,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm + 2,
    color: Colors.text,
    fontSize: FontSizes.sm,
  },
  saveKeyBtn: {
    width: 40,
    height: 40,
    borderRadius: BorderRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  speedRow: {
    flexDirection: 'row',
    gap: Spacing.sm,
    width: '100%',
  },
  speedChip: {
    flex: 1,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    borderColor: Colors.border,
    backgroundColor: Colors.backgroundTertiary,
    alignItems: 'center',
  },
  speedChipText: {
    fontSize: FontSizes.sm,
    fontWeight: '600',
    color: Colors.textTertiary,
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
  },
  footerText: {
    fontSize: FontSizes.sm,
    color: Colors.textTertiary,
    fontWeight: '600',
  },
  footerSubtext: {
    fontSize: FontSizes.xs,
    color: Colors.textTertiary,
    marginTop: 2,
  },
});
