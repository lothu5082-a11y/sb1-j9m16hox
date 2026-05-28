import React, { useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, { FadeInUp } from 'react-native-reanimated';
import {
  ChevronLeft, MessageSquare, Mail, Send, Sparkles, Globe,
  CheckCheck, AlignLeft, ChevronRight, Clock,
} from 'lucide-react-native';
import { Colors, Spacing, FontSizes, BorderRadius } from '../../constants/theme';
import { useRouter } from 'expo-router';

type MessagingTab = 'draft' | 'smart_reply' | 'translate';

const platforms = [
  { id: 'sms', label: 'SMS', color: Colors.success },
  { id: 'whatsapp', label: 'WhatsApp', color: '#25D366' },
  { id: 'telegram', label: 'Telegram', color: '#229ED9' },
  { id: 'email', label: 'Email', color: Colors.primary },
];

const tones = ['Friendly', 'Formal', 'Casual', 'Professional', 'Brief'];

const smartReplySuggestions = [
  'Sure, sounds great!',
  'Let me check and get back to you.',
  'Thanks for letting me know!',
  'Sorry, I\'m busy right now. Can we talk later?',
];

const recentDrafts = [
  { platform: 'WhatsApp', preview: 'Hey, just checking in to see if...', time: '5 min ago' },
  { platform: 'Email', preview: 'Dear team, I wanted to share the update...', time: '2 hours ago' },
];

export default function MessagingScreen() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<MessagingTab>('draft');
  const [selectedPlatform, setSelectedPlatform] = useState('whatsapp');
  const [selectedTone, setSelectedTone] = useState('Friendly');
  const [prompt, setPrompt] = useState('');
  const [isDrafting, setIsDrafting] = useState(false);
  const [draftResult, setDraftResult] = useState('');
  const [translateInput, setTranslateInput] = useState('');
  const [targetLang, setTargetLang] = useState('Arabic');

  const languages = ['Arabic', 'French', 'Spanish', 'German', 'Japanese', 'Chinese', 'Hindi'];

  const handleDraft = () => {
    if (!prompt.trim()) return;
    setIsDrafting(true);
    setTimeout(() => {
      setDraftResult(
        `Hi! I hope you're doing well. ${prompt.trim()} I'd really appreciate your response at your earliest convenience. Thanks so much!`,
      );
      setIsDrafting(false);
    }, 1800);
  };

  const tabs: { id: MessagingTab; label: string }[] = [
    { id: 'draft', label: 'Draft Message' },
    { id: 'smart_reply', label: 'Smart Reply' },
    { id: 'translate', label: 'Translate' },
  ];

  return (
    <View style={styles.container}>
      <LinearGradient colors={[Colors.background, Colors.backgroundSecondary]} style={styles.gradient}>
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
          <Animated.View entering={FadeInUp.duration(600)} style={styles.header}>
            <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
              <ChevronLeft color={Colors.textSecondary} size={24} />
            </TouchableOpacity>
            <MessageSquare color={Colors.primary} size={28} />
            <Text style={styles.headerTitle}>Messaging Assistant</Text>
          </Animated.View>

          <Animated.View entering={FadeInUp.duration(600).delay(100)} style={styles.tabSection}>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.tabRow}>
              {tabs.map((tab) => (
                <TouchableOpacity
                  key={tab.id}
                  onPress={() => setActiveTab(tab.id)}
                  style={[styles.tab, activeTab === tab.id && styles.tabActive]}
                >
                  <Text style={[styles.tabText, activeTab === tab.id && styles.tabTextActive]}>
                    {tab.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </Animated.View>

          {activeTab === 'draft' && (
            <Animated.View entering={FadeInUp.duration(500)}>
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Platform</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.platformRow}>
                  {platforms.map((p) => (
                    <TouchableOpacity
                      key={p.id}
                      onPress={() => setSelectedPlatform(p.id)}
                      style={[styles.platformChip, selectedPlatform === p.id && { borderColor: p.color, backgroundColor: p.color + '15' }]}
                    >
                      <Text style={[styles.platformText, selectedPlatform === p.id && { color: p.color }]}>
                        {p.label}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </View>

              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Tone</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.platformRow}>
                  {tones.map((tone) => (
                    <TouchableOpacity
                      key={tone}
                      onPress={() => setSelectedTone(tone)}
                      style={[styles.platformChip, selectedTone === tone && { borderColor: Colors.secondary, backgroundColor: Colors.secondary + '15' }]}
                    >
                      <Text style={[styles.platformText, selectedTone === tone && { color: Colors.secondary }]}>
                        {tone}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </View>

              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Describe Your Message</Text>
                <View style={styles.promptCard}>
                  <TextInput
                    style={styles.promptInput}
                    placeholder="What do you want to say? e.g. 'Ask Ahmed if he's free this weekend'"
                    placeholderTextColor={Colors.textTertiary}
                    value={prompt}
                    onChangeText={setPrompt}
                    multiline
                    maxLength={400}
                  />
                </View>
                <TouchableOpacity
                  onPress={handleDraft}
                  style={[styles.actionButton, (!prompt.trim() || isDrafting) && styles.actionButtonDisabled]}
                  disabled={!prompt.trim() || isDrafting}
                >
                  <Sparkles color={prompt.trim() ? Colors.background : Colors.textTertiary} size={18} />
                  <Text style={[styles.actionButtonText, (!prompt.trim() || isDrafting) && styles.actionButtonTextDisabled]}>
                    {isDrafting ? 'Drafting...' : 'Draft Message'}
                  </Text>
                </TouchableOpacity>

                {draftResult !== '' && (
                  <View style={styles.resultCard}>
                    <View style={styles.resultHeader}>
                      <CheckCheck color={Colors.success} size={16} />
                      <Text style={styles.resultTitle}>Draft Ready</Text>
                    </View>
                    <Text style={styles.resultText}>{draftResult}</Text>
                    <View style={styles.resultActions}>
                      <TouchableOpacity style={styles.resultAction}>
                        <Send color={Colors.primary} size={16} />
                        <Text style={styles.resultActionText}>Use Draft</Text>
                      </TouchableOpacity>
                      <TouchableOpacity onPress={() => setDraftResult('')} style={styles.resultAction}>
                        <AlignLeft color={Colors.textTertiary} size={16} />
                        <Text style={[styles.resultActionText, { color: Colors.textTertiary }]}>Discard</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                )}
              </View>

              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Recent Drafts</Text>
                <View style={styles.recentList}>
                  {recentDrafts.map((d, i) => (
                    <TouchableOpacity key={i} style={styles.recentItem} activeOpacity={0.7}>
                      <View style={styles.recentIcon}>
                        <MessageSquare color={Colors.primary} size={16} />
                      </View>
                      <View style={styles.recentContent}>
                        <Text style={styles.recentPlatform}>{d.platform}</Text>
                        <Text style={styles.recentPreview} numberOfLines={1}>{d.preview}</Text>
                      </View>
                      <View style={styles.recentMeta}>
                        <Clock color={Colors.textTertiary} size={12} />
                        <Text style={styles.recentTime}>{d.time}</Text>
                      </View>
                      <ChevronRight color={Colors.textTertiary} size={14} />
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
            </Animated.View>
          )}

          {activeTab === 'smart_reply' && (
            <Animated.View entering={FadeInUp.duration(500)} style={styles.section}>
              <Text style={styles.sectionTitle}>Suggested Replies</Text>
              <Text style={styles.smartReplyHint}>Based on your recent conversation context:</Text>
              <View style={styles.suggestionsGrid}>
                {smartReplySuggestions.map((s, i) => (
                  <TouchableOpacity key={i} style={styles.suggestionCard} activeOpacity={0.7}>
                    <Text style={styles.suggestionText}>{s}</Text>
                    <Send color={Colors.primary} size={14} />
                  </TouchableOpacity>
                ))}
              </View>
            </Animated.View>
          )}

          {activeTab === 'translate' && (
            <Animated.View entering={FadeInUp.duration(500)}>
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Translate To</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.platformRow}>
                  {languages.map((lang) => (
                    <TouchableOpacity
                      key={lang}
                      onPress={() => setTargetLang(lang)}
                      style={[styles.platformChip, targetLang === lang && { borderColor: Colors.primary, backgroundColor: 'rgba(0,229,255,0.1)' }]}
                    >
                      <Globe color={targetLang === lang ? Colors.primary : Colors.textTertiary} size={12} />
                      <Text style={[styles.platformText, targetLang === lang && { color: Colors.primary }]}>{lang}</Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </View>
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Enter Text</Text>
                <View style={styles.promptCard}>
                  <TextInput
                    style={styles.promptInput}
                    placeholder="Type or paste text to translate..."
                    placeholderTextColor={Colors.textTertiary}
                    value={translateInput}
                    onChangeText={setTranslateInput}
                    multiline
                    maxLength={500}
                  />
                </View>
                <TouchableOpacity style={[styles.actionButton, !translateInput.trim() && styles.actionButtonDisabled]} disabled={!translateInput.trim()}>
                  <Globe color={translateInput.trim() ? Colors.background : Colors.textTertiary} size={18} />
                  <Text style={[styles.actionButtonText, !translateInput.trim() && styles.actionButtonTextDisabled]}>
                    Translate to {targetLang}
                  </Text>
                </TouchableOpacity>
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
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.xxxl + Spacing.md,
    marginBottom: Spacing.xl, gap: Spacing.md,
  },
  backButton: { padding: Spacing.xs },
  headerTitle: { fontSize: FontSizes.xxl, fontWeight: '700', color: Colors.text },
  tabSection: { marginBottom: Spacing.xl },
  tabRow: { paddingHorizontal: Spacing.lg, gap: Spacing.sm },
  tab: {
    paddingHorizontal: Spacing.lg, paddingVertical: Spacing.sm + 2,
    borderRadius: BorderRadius.full, backgroundColor: Colors.surface,
    borderWidth: 1, borderColor: Colors.border,
  },
  tabActive: { borderColor: Colors.primary, backgroundColor: 'rgba(0,229,255,0.08)' },
  tabText: { fontSize: FontSizes.sm, fontWeight: '600', color: Colors.textTertiary },
  tabTextActive: { color: Colors.primary },
  section: { paddingHorizontal: Spacing.lg, marginBottom: Spacing.xl },
  sectionTitle: {
    fontSize: FontSizes.md, fontWeight: '700', color: Colors.textSecondary,
    textTransform: 'uppercase', letterSpacing: 1, marginBottom: Spacing.md,
  },
  platformRow: { gap: Spacing.sm },
  platformChip: {
    flexDirection: 'row', alignItems: 'center', gap: Spacing.xs,
    paddingHorizontal: Spacing.md, paddingVertical: Spacing.sm + 2,
    borderRadius: BorderRadius.full, backgroundColor: Colors.surface,
    borderWidth: 1, borderColor: Colors.border,
  },
  platformText: { fontSize: FontSizes.sm, fontWeight: '600', color: Colors.textTertiary },
  promptCard: {
    backgroundColor: Colors.surface, borderRadius: BorderRadius.lg,
    borderWidth: 1, borderColor: Colors.border, padding: Spacing.md,
    marginBottom: Spacing.md,
  },
  promptInput: { fontSize: FontSizes.md, color: Colors.text, minHeight: 80, lineHeight: 22, textAlignVertical: 'top' },
  actionButton: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    backgroundColor: Colors.primary, borderRadius: BorderRadius.md,
    paddingVertical: Spacing.md, gap: Spacing.sm,
  },
  actionButtonDisabled: { backgroundColor: Colors.surface, borderWidth: 1, borderColor: Colors.border },
  actionButtonText: { fontSize: FontSizes.md, fontWeight: '700', color: Colors.background },
  actionButtonTextDisabled: { color: Colors.textTertiary },
  resultCard: {
    backgroundColor: Colors.surface, borderRadius: BorderRadius.lg,
    borderWidth: 1, borderColor: Colors.success + '40',
    padding: Spacing.md, marginTop: Spacing.md,
  },
  resultHeader: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, marginBottom: Spacing.md },
  resultTitle: { fontSize: FontSizes.md, fontWeight: '700', color: Colors.success },
  resultText: { fontSize: FontSizes.md, color: Colors.text, lineHeight: 22, marginBottom: Spacing.md },
  resultActions: {
    flexDirection: 'row', gap: Spacing.lg,
    borderTopWidth: 1, borderTopColor: Colors.border, paddingTop: Spacing.md,
  },
  resultAction: { flexDirection: 'row', alignItems: 'center', gap: Spacing.xs },
  resultActionText: { fontSize: FontSizes.sm, fontWeight: '600', color: Colors.primary },
  smartReplyHint: { fontSize: FontSizes.sm, color: Colors.textTertiary, marginBottom: Spacing.md },
  suggestionsGrid: { gap: Spacing.md },
  suggestionCard: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    backgroundColor: Colors.surface, borderRadius: BorderRadius.md,
    padding: Spacing.md, borderWidth: 1, borderColor: Colors.border,
  },
  suggestionText: { flex: 1, fontSize: FontSizes.md, color: Colors.text },
  recentList: { gap: Spacing.md },
  recentItem: {
    flexDirection: 'row', alignItems: 'center', gap: Spacing.md,
    backgroundColor: Colors.surface, borderRadius: BorderRadius.md,
    padding: Spacing.md, borderWidth: 1, borderColor: Colors.border,
  },
  recentIcon: { width: 36, height: 36, borderRadius: BorderRadius.sm, backgroundColor: 'rgba(0,229,255,0.1)', alignItems: 'center', justifyContent: 'center' },
  recentContent: { flex: 1 },
  recentPlatform: { fontSize: FontSizes.xs, color: Colors.primary, fontWeight: '700', marginBottom: 2 },
  recentPreview: { fontSize: FontSizes.sm, color: Colors.textSecondary },
  recentMeta: { flexDirection: 'row', alignItems: 'center', gap: 2 },
  recentTime: { fontSize: FontSizes.xs, color: Colors.textTertiary },
});
