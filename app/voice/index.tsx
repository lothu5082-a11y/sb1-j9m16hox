import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity, Switch, TextInput,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, {
  FadeInUp, useSharedValue, useAnimatedStyle, withRepeat, withSequence, withTiming,
} from 'react-native-reanimated';
import {
  Mic, Radio, Volume2, Sliders, Plus, Trash2, Check, ChevronLeft, Zap,
} from 'lucide-react-native';
import { Colors, Spacing, FontSizes, BorderRadius } from '../../constants/theme';
import { useRouter } from 'expo-router';

const sensitivityLevels = ['Low', 'Medium', 'High', 'Very High'];

const defaultWakeWords = [
  { id: '1', word: 'Hey Vexora', active: true, isDefault: true },
  { id: '2', word: 'Ok Vexora', active: true, isDefault: true },
];

export default function VoiceScreen() {
  const router = useRouter();
  const [voiceEnabled, setVoiceEnabled] = useState(true);
  const [continuousMode, setContinuousMode] = useState(false);
  const [handsFree, setHandsFree] = useState(false);
  const [sensitivity, setSensitivity] = useState(1);
  const [wakeWords, setWakeWords] = useState(defaultWakeWords);
  const [newWakeWord, setNewWakeWord] = useState('');
  const [isTraining, setIsTraining] = useState(false);
  const [trainingStep, setTrainingStep] = useState(0);
  const orbScale = useSharedValue(1);

  useEffect(() => {
    if (isTraining) {
      orbScale.value = withRepeat(
        withSequence(withTiming(1.2, { duration: 500 }), withTiming(1, { duration: 500 })),
        -1,
        false,
      );
    } else {
      orbScale.value = withTiming(1, { duration: 300 });
    }
  }, [isTraining]);

  const orbStyle = useAnimatedStyle(() => ({ transform: [{ scale: orbScale.value }] }));

  const startTraining = () => {
    setIsTraining(true);
    setTrainingStep(1);
    setTimeout(() => setTrainingStep(2), 3000);
    setTimeout(() => setTrainingStep(3), 6000);
    setTimeout(() => { setIsTraining(false); setTrainingStep(0); }, 9000);
  };

  const addWakeWord = () => {
    if (!newWakeWord.trim()) return;
    setWakeWords((prev) => [
      ...prev,
      { id: Date.now().toString(), word: newWakeWord.trim(), active: true, isDefault: false },
    ]);
    setNewWakeWord('');
  };

  const toggleWakeWord = (id: string) => {
    setWakeWords((prev) => prev.map((w) => (w.id === id ? { ...w, active: !w.active } : w)));
  };

  const removeWakeWord = (id: string) => {
    setWakeWords((prev) => prev.filter((w) => w.id !== id));
  };

  const trainingPrompts = ['', 'Say "Hey Vexora" clearly', 'Say it again', 'One more time'];

  return (
    <View style={styles.container}>
      <LinearGradient colors={[Colors.background, Colors.backgroundSecondary]} style={styles.gradient}>
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
          <Animated.View entering={FadeInUp.duration(600)} style={styles.header}>
            <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
              <ChevronLeft color={Colors.textSecondary} size={24} />
            </TouchableOpacity>
            <Mic color={Colors.primary} size={28} />
            <Text style={styles.headerTitle}>Voice Assistant</Text>
          </Animated.View>

          <Animated.View entering={FadeInUp.duration(600).delay(100)} style={styles.orbSection}>
            <Animated.View style={[styles.orbContainer, orbStyle]}>
              <View style={styles.orbOuter}>
                <View style={styles.orbInner}>
                  <Mic color={isTraining ? Colors.background : Colors.primary} size={32} />
                </View>
              </View>
            </Animated.View>
            {isTraining ? (
              <View style={styles.trainingStatus}>
                <Text style={styles.trainingLabel}>Voice Training</Text>
                <Text style={styles.trainingPrompt}>{trainingPrompts[trainingStep]}</Text>
                <View style={styles.trainingDots}>
                  {[1, 2, 3].map((step) => (
                    <View
                      key={step}
                      style={[styles.trainingDot, trainingStep >= step && styles.trainingDotActive]}
                    />
                  ))}
                </View>
              </View>
            ) : (
              <View style={styles.orbInfo}>
                <Text style={styles.orbTitle}>{voiceEnabled ? 'Voice Active' : 'Voice Off'}</Text>
                <Text style={styles.orbSubtitle}>
                  {voiceEnabled ? 'Listening for wake words' : 'Enable voice to activate'}
                </Text>
              </View>
            )}
          </Animated.View>

          <Animated.View entering={FadeInUp.duration(600).delay(200)} style={styles.section}>
            <Text style={styles.sectionTitle}>Voice Settings</Text>
            <View style={styles.card}>
              <View style={styles.settingRow}>
                <View style={styles.settingIcon}>
                  <Mic color={voiceEnabled ? Colors.primary : Colors.textTertiary} size={20} />
                </View>
                <View style={styles.settingText}>
                  <Text style={styles.settingLabel}>Voice Assistant</Text>
                  <Text style={styles.settingDesc}>Enable Vexora voice commands</Text>
                </View>
                <Switch
                  value={voiceEnabled}
                  onValueChange={setVoiceEnabled}
                  trackColor={{ false: Colors.surface, true: Colors.primary + '40' }}
                  thumbColor={voiceEnabled ? Colors.primary : Colors.textTertiary}
                />
              </View>
              <View style={styles.divider} />
              <View style={styles.settingRow}>
                <View style={styles.settingIcon}>
                  <Zap color={continuousMode ? Colors.secondary : Colors.textTertiary} size={20} />
                </View>
                <View style={styles.settingText}>
                  <Text style={styles.settingLabel}>Continuous Conversation</Text>
                  <Text style={styles.settingDesc}>Keep listening after each response</Text>
                </View>
                <Switch
                  value={continuousMode}
                  onValueChange={setContinuousMode}
                  trackColor={{ false: Colors.surface, true: Colors.secondary + '40' }}
                  thumbColor={continuousMode ? Colors.secondary : Colors.textTertiary}
                />
              </View>
              <View style={styles.divider} />
              <View style={styles.settingRow}>
                <View style={styles.settingIcon}>
                  <Volume2 color={handsFree ? Colors.accent : Colors.textTertiary} size={20} />
                </View>
                <View style={styles.settingText}>
                  <Text style={styles.settingLabel}>Hands-Free Mode</Text>
                  <Text style={styles.settingDesc}>Automatically read responses aloud</Text>
                </View>
                <Switch
                  value={handsFree}
                  onValueChange={setHandsFree}
                  trackColor={{ false: Colors.surface, true: Colors.accent + '40' }}
                  thumbColor={handsFree ? Colors.accent : Colors.textTertiary}
                />
              </View>
            </View>
          </Animated.View>

          <Animated.View entering={FadeInUp.duration(600).delay(300)} style={styles.section}>
            <Text style={styles.sectionTitle}>Wake Word Sensitivity</Text>
            <View style={styles.card}>
              <View style={styles.sensitivityHeader}>
                <Sliders color={Colors.primary} size={18} />
                <Text style={styles.sensitivityLabel}>
                  Current: <Text style={{ color: Colors.primary }}>{sensitivityLevels[sensitivity]}</Text>
                </Text>
              </View>
              <View style={styles.sensitivityRow}>
                {sensitivityLevels.map((level, idx) => (
                  <TouchableOpacity
                    key={level}
                    onPress={() => setSensitivity(idx)}
                    style={[styles.sensitivityChip, sensitivity === idx && styles.sensitivityChipActive]}
                  >
                    <Text style={[styles.sensitivityChipText, sensitivity === idx && styles.sensitivityChipTextActive]}>
                      {level}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
              <Text style={styles.sensitivityHint}>
                Higher sensitivity detects wake words more easily but may trigger accidentally.
              </Text>
            </View>
          </Animated.View>

          <Animated.View entering={FadeInUp.duration(600).delay(400)} style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Wake Words</Text>
              <Text style={styles.sectionCount}>{wakeWords.filter((w) => w.active).length} active</Text>
            </View>
            <View style={styles.wakeWordList}>
              {wakeWords.map((ww) => (
                <View key={ww.id} style={styles.wakeWordItem}>
                  <View style={[styles.wakeWordDot, ww.active && styles.wakeWordDotActive]} />
                  <Text style={[styles.wakeWordText, !ww.active && styles.wakeWordInactive]}>
                    {ww.word}
                  </Text>
                  {ww.isDefault && (
                    <View style={styles.defaultBadge}>
                      <Text style={styles.defaultBadgeText}>Default</Text>
                    </View>
                  )}
                  <View style={styles.wakeWordActions}>
                    <Switch
                      value={ww.active}
                      onValueChange={() => toggleWakeWord(ww.id)}
                      trackColor={{ false: Colors.surface, true: Colors.primary + '40' }}
                      thumbColor={ww.active ? Colors.primary : Colors.textTertiary}
                      style={{ transform: [{ scaleX: 0.8 }, { scaleY: 0.8 }] }}
                    />
                    {!ww.isDefault && (
                      <TouchableOpacity onPress={() => removeWakeWord(ww.id)} style={styles.deleteBtn}>
                        <Trash2 color={Colors.error} size={16} />
                      </TouchableOpacity>
                    )}
                  </View>
                </View>
              ))}
            </View>
            <View style={styles.addWakeWordRow}>
              <TextInput
                style={styles.addWakeWordInput}
                placeholder="Add custom wake word..."
                placeholderTextColor={Colors.textTertiary}
                value={newWakeWord}
                onChangeText={setNewWakeWord}
              />
              <TouchableOpacity onPress={addWakeWord} style={styles.addWakeWordBtn} disabled={!newWakeWord.trim()}>
                <Plus color={newWakeWord.trim() ? Colors.background : Colors.textTertiary} size={20} />
              </TouchableOpacity>
            </View>
          </Animated.View>

          <Animated.View entering={FadeInUp.duration(600).delay(500)} style={styles.section}>
            <Text style={styles.sectionTitle}>Voice Training</Text>
            <View style={styles.trainingCard}>
              <Radio color={Colors.primary} size={24} />
              <View style={styles.trainingInfo}>
                <Text style={styles.trainingTitle}>Train Your Voice</Text>
                <Text style={styles.trainingDesc}>
                  Personalize Vexora for your voice to improve accuracy and reduce false triggers.
                </Text>
              </View>
              <TouchableOpacity
                onPress={startTraining}
                style={[styles.trainButton, isTraining && styles.trainButtonActive]}
                disabled={isTraining}
              >
                <Text style={styles.trainButtonText}>{isTraining ? 'Training...' : 'Start'}</Text>
              </TouchableOpacity>
            </View>
          </Animated.View>
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
  backButton: { padding: Spacing.xs },
  headerTitle: { fontSize: FontSizes.xxl, fontWeight: '700', color: Colors.text },
  orbSection: { alignItems: 'center', paddingVertical: Spacing.xl, marginBottom: Spacing.lg },
  orbContainer: { marginBottom: Spacing.lg },
  orbOuter: {
    width: 120, height: 120, borderRadius: 60,
    borderWidth: 2, borderColor: Colors.primary,
    backgroundColor: 'rgba(0, 229, 255, 0.08)',
    alignItems: 'center', justifyContent: 'center',
    shadowColor: Colors.primary, shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.5, shadowRadius: 20, elevation: 10,
  },
  orbInner: {
    width: 80, height: 80, borderRadius: 40,
    backgroundColor: 'rgba(0, 229, 255, 0.12)',
    alignItems: 'center', justifyContent: 'center',
  },
  orbInfo: { alignItems: 'center' },
  orbTitle: { fontSize: FontSizes.xl, fontWeight: '700', color: Colors.text },
  orbSubtitle: { fontSize: FontSizes.sm, color: Colors.textTertiary, marginTop: 4 },
  trainingStatus: { alignItems: 'center', gap: Spacing.sm },
  trainingLabel: { fontSize: FontSizes.lg, fontWeight: '700', color: Colors.primary },
  trainingPrompt: { fontSize: FontSizes.md, color: Colors.textSecondary },
  trainingDots: { flexDirection: 'row', gap: Spacing.sm, marginTop: Spacing.sm },
  trainingDot: { width: 10, height: 10, borderRadius: 5, backgroundColor: Colors.border },
  trainingDotActive: { backgroundColor: Colors.primary },
  section: { paddingHorizontal: Spacing.lg, marginBottom: Spacing.xl },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: Spacing.md },
  sectionTitle: { fontSize: FontSizes.md, fontWeight: '700', color: Colors.textSecondary, textTransform: 'uppercase', letterSpacing: 1, marginBottom: Spacing.md },
  sectionCount: { fontSize: FontSizes.sm, color: Colors.primary, fontWeight: '600' },
  card: { backgroundColor: Colors.surface, borderRadius: BorderRadius.lg, borderWidth: 1, borderColor: Colors.border, padding: Spacing.md },
  settingRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md, paddingVertical: Spacing.sm },
  settingIcon: { width: 40, height: 40, borderRadius: BorderRadius.md, backgroundColor: Colors.backgroundTertiary, alignItems: 'center', justifyContent: 'center' },
  settingText: { flex: 1 },
  settingLabel: { fontSize: FontSizes.md, fontWeight: '600', color: Colors.text },
  settingDesc: { fontSize: FontSizes.xs, color: Colors.textTertiary },
  divider: { height: 1, backgroundColor: Colors.border, marginVertical: Spacing.xs },
  sensitivityHeader: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, marginBottom: Spacing.md },
  sensitivityLabel: { fontSize: FontSizes.md, color: Colors.textSecondary, fontWeight: '500' },
  sensitivityRow: { flexDirection: 'row', gap: Spacing.sm, marginBottom: Spacing.md },
  sensitivityChip: { flex: 1, paddingVertical: Spacing.sm, borderRadius: BorderRadius.md, backgroundColor: Colors.backgroundTertiary, borderWidth: 1, borderColor: Colors.border, alignItems: 'center' },
  sensitivityChipActive: { borderColor: Colors.primary, backgroundColor: 'rgba(0,229,255,0.1)' },
  sensitivityChipText: { fontSize: FontSizes.xs, fontWeight: '600', color: Colors.textTertiary },
  sensitivityChipTextActive: { color: Colors.primary },
  sensitivityHint: { fontSize: FontSizes.xs, color: Colors.textTertiary, lineHeight: 16 },
  wakeWordList: { gap: Spacing.md, marginBottom: Spacing.md },
  wakeWordItem: { flexDirection: 'row', alignItems: 'center', backgroundColor: Colors.surface, borderRadius: BorderRadius.md, padding: Spacing.md, borderWidth: 1, borderColor: Colors.border, gap: Spacing.sm },
  wakeWordDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: Colors.border },
  wakeWordDotActive: { backgroundColor: Colors.success },
  wakeWordText: { flex: 1, fontSize: FontSizes.md, fontWeight: '600', color: Colors.text },
  wakeWordInactive: { opacity: 0.4 },
  defaultBadge: { backgroundColor: 'rgba(0,229,255,0.12)', paddingHorizontal: Spacing.sm, paddingVertical: 2, borderRadius: BorderRadius.sm },
  defaultBadgeText: { fontSize: FontSizes.xs, color: Colors.primary, fontWeight: '600' },
  wakeWordActions: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  deleteBtn: { padding: Spacing.xs },
  addWakeWordRow: { flexDirection: 'row', gap: Spacing.sm },
  addWakeWordInput: { flex: 1, backgroundColor: Colors.surface, borderRadius: BorderRadius.md, borderWidth: 1, borderColor: Colors.border, paddingHorizontal: Spacing.md, paddingVertical: Spacing.sm + 2, fontSize: FontSizes.md, color: Colors.text },
  addWakeWordBtn: { width: 44, height: 44, borderRadius: BorderRadius.md, backgroundColor: Colors.primary, alignItems: 'center', justifyContent: 'center' },
  trainingCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: Colors.surface, borderRadius: BorderRadius.lg, padding: Spacing.lg, borderWidth: 1, borderColor: Colors.border, gap: Spacing.md },
  trainingInfo: { flex: 1 },
  trainingTitle: { fontSize: FontSizes.md, fontWeight: '700', color: Colors.text, marginBottom: 2 },
  trainingDesc: { fontSize: FontSizes.xs, color: Colors.textTertiary, lineHeight: 16 },
  trainButton: { backgroundColor: Colors.primary, paddingHorizontal: Spacing.lg, paddingVertical: Spacing.sm + 2, borderRadius: BorderRadius.md },
  trainButtonActive: { backgroundColor: Colors.primaryDark },
  trainButtonText: { fontSize: FontSizes.sm, fontWeight: '700', color: Colors.background },
});
