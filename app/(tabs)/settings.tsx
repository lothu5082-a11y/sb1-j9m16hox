import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Switch, TouchableOpacity } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, { FadeInUp } from 'react-native-reanimated';
import {
  Settings as SettingsIcon,
  Brain,
  Mic,
  Gamepad2,
  Shield,
  Phone,
  Smartphone,
  Globe,
  Volume2,
  Bell,
  Lock,
  Eye,
  Fingerprint,
  ChevronRight,
  Sparkles,
  Crown,
} from 'lucide-react-native';
import { Colors, Spacing, FontSizes, BorderRadius } from '../../constants/theme';
import StatusBadge from '../../components/StatusBadge';

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

  const aiModels = [
    { id: 'gemini', name: 'Gemini', color: Colors.primary },
    { id: 'openai', name: 'OpenAI', color: Colors.secondary },
    { id: 'groq', name: 'Groq', color: Colors.accent },
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
                  onPress={() => setSelectedModel(model.id)}
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
                subtitle='Say "Hey Nova" to activate'
                value={wakeWord}
                onValueChange={setWakeWord}
                color={Colors.primary}
              />
            </View>
            <View style={styles.settingsGap}>
              <SettingRow
                icon={<Smartphone color={floatingBubble ? Colors.success : Colors.textTertiary} size={20} />}
                title="Floating Assistant"
                subtitle="AI bubble over other apps"
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
                subtitle="Nova answers when you are busy"
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
                  <Text style={styles.premiumTitle}>Upgrade to Nova Pro</Text>
                  <Text style={styles.premiumDesc}>Unlock all AI models, unlimited generation, and more</Text>
                </View>
                <ChevronRight color={Colors.accent} size={18} />
              </LinearGradient>
            </TouchableOpacity>
          </Animated.View>

          <View style={styles.footer}>
            <Text style={styles.footerText}>Nova v1.0.0</Text>
            <Text style={styles.footerSubtext}>Your Intelligent Future Assistant</Text>
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
    gap: Spacing.md,
  },
  modelCard: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.md,
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
    gap: Spacing.sm,
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
  settingsGap: {
    marginBottom: Spacing.md,
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
