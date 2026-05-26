import React, { useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, { FadeInUp } from 'react-native-reanimated';
import {
  ChevronLeft, Image as ImageIcon, Video, ScanText, Eye,
  Search, FileText, Sparkles, Upload, ChevronRight,
} from 'lucide-react-native';
import { Colors, Spacing, FontSizes, BorderRadius } from '../../constants/theme';
import { useRouter } from 'expo-router';

type MediaTab = 'image' | 'video' | 'screen';

const imageCapabilities = [
  { icon: ScanText, label: 'OCR', desc: 'Extract text from any image', color: Colors.primary },
  { icon: Search, label: 'Object Recognition', desc: 'Identify objects, people, places', color: Colors.secondary },
  { icon: Eye, label: 'Scene Understanding', desc: 'Get a full description of any photo', color: Colors.accent },
  { icon: Sparkles, label: 'Image Generation', desc: 'Create AI images from text prompts', color: '#E040FB' },
  { icon: FileText, label: 'Document Analysis', desc: 'Analyze PDFs, charts, and forms', color: Colors.warning },
];

const videoCapabilities = [
  { icon: ScanText, label: 'Transcription', desc: 'Convert speech to text automatically', color: Colors.primary },
  { icon: FileText, label: 'Video Summary', desc: 'Get key points from any video', color: Colors.secondary },
  { icon: Search, label: 'Scene Recognition', desc: 'Identify scenes and objects in video', color: Colors.accent },
  { icon: Eye, label: 'Key Moments', desc: 'Find the most important parts', color: Colors.success },
];

const screenCapabilities = [
  { icon: Eye, label: 'Screen Reading', desc: 'Understand what is on your screen', color: Colors.primary },
  { icon: ScanText, label: 'Error Explanation', desc: 'Explain app errors and how to fix them', color: Colors.error },
  { icon: Search, label: 'UI Navigation Help', desc: 'Guide you through any app interface', color: Colors.secondary },
  { icon: FileText, label: 'Form Assistance', desc: 'Help fill out forms and fields', color: Colors.accent },
];

const recentAnalyses = [
  { type: 'image', label: 'Screenshot of invoice', result: 'Extracted 3 line items and total', time: '2 min ago' },
  { type: 'video', label: 'YouTube tutorial clip', result: 'Generated 8-point summary', time: '1 hour ago' },
  { type: 'screen', label: 'App error dialog', result: 'Explained error and suggested fix', time: 'Yesterday' },
];

export default function MediaScreen() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<MediaTab>('image');

  const tabs: { id: MediaTab; label: string; icon: typeof ImageIcon }[] = [
    { id: 'image', label: 'Images', icon: ImageIcon },
    { id: 'video', label: 'Video', icon: Video },
    { id: 'screen', label: 'Screen', icon: Eye },
  ];

  const capabilities =
    activeTab === 'image' ? imageCapabilities : activeTab === 'video' ? videoCapabilities : screenCapabilities;

  const primaryActionLabel =
    activeTab === 'image' ? 'Analyze Image' : activeTab === 'video' ? 'Analyze Video' : 'Analyze Screen';

  const tabDescription =
    activeTab === 'image'
      ? 'Extract text, identify objects, generate images, and understand any photo.'
      : activeTab === 'video'
      ? 'Transcribe speech, summarize content, and extract key moments from videos.'
      : 'Understand your current screen, explain UI elements, and get navigation help.';

  return (
    <View style={styles.container}>
      <LinearGradient colors={[Colors.background, Colors.backgroundSecondary]} style={styles.gradient}>
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
          <Animated.View entering={FadeInUp.duration(600)} style={styles.header}>
            <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
              <ChevronLeft color={Colors.textSecondary} size={24} />
            </TouchableOpacity>
            <Eye color={Colors.secondary} size={28} />
            <Text style={styles.headerTitle}>Media Intelligence</Text>
          </Animated.View>

          <Animated.View entering={FadeInUp.duration(600).delay(100)} style={styles.tabSection}>
            <View style={styles.tabRow}>
              {tabs.map((tab) => {
                const TabIcon = tab.icon;
                return (
                  <TouchableOpacity
                    key={tab.id}
                    onPress={() => setActiveTab(tab.id)}
                    style={[styles.tab, activeTab === tab.id && styles.tabActive]}
                  >
                    <TabIcon
                      color={activeTab === tab.id ? Colors.primary : Colors.textTertiary}
                      size={18}
                    />
                    <Text style={[styles.tabText, activeTab === tab.id && styles.tabTextActive]}>
                      {tab.label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </Animated.View>

          <Animated.View entering={FadeInUp.duration(600).delay(200)} style={styles.uploadSection}>
            <TouchableOpacity style={styles.uploadCard} activeOpacity={0.7}>
              <Upload color={Colors.primary} size={32} />
              <Text style={styles.uploadTitle}>{primaryActionLabel}</Text>
              <Text style={styles.uploadDesc}>{tabDescription}</Text>
              <View style={styles.uploadButton}>
                <Text style={styles.uploadButtonText}>
                  {activeTab === 'screen' ? 'Capture Screen' : 'Choose File'}
                </Text>
              </View>
            </TouchableOpacity>
          </Animated.View>

          <Animated.View entering={FadeInUp.duration(600).delay(300)} style={styles.section}>
            <Text style={styles.sectionTitle}>Capabilities</Text>
            <View style={styles.capabilityList}>
              {capabilities.map((cap) => {
                const CapIcon = cap.icon;
                return (
                  <View key={cap.label} style={styles.capabilityItem}>
                    <View style={[styles.capabilityIcon, { backgroundColor: cap.color + '15' }]}>
                      <CapIcon color={cap.color} size={20} />
                    </View>
                    <View style={styles.capabilityText}>
                      <Text style={styles.capabilityLabel}>{cap.label}</Text>
                      <Text style={styles.capabilityDesc}>{cap.desc}</Text>
                    </View>
                    <ChevronRight color={Colors.textTertiary} size={16} />
                  </View>
                );
              })}
            </View>
          </Animated.View>

          <Animated.View entering={FadeInUp.duration(600).delay(400)} style={styles.section}>
            <Text style={styles.sectionTitle}>Recent Analyses</Text>
            <View style={styles.recentList}>
              {recentAnalyses.map((item, i) => (
                <TouchableOpacity key={i} style={styles.recentItem} activeOpacity={0.7}>
                  <View style={[styles.recentIcon, {
                    backgroundColor: item.type === 'image'
                      ? Colors.primary + '15'
                      : item.type === 'video'
                      ? Colors.secondary + '15'
                      : Colors.accent + '15',
                  }]}>
                    {item.type === 'image' ? (
                      <ImageIcon color={Colors.primary} size={18} />
                    ) : item.type === 'video' ? (
                      <Video color={Colors.secondary} size={18} />
                    ) : (
                      <Eye color={Colors.accent} size={18} />
                    )}
                  </View>
                  <View style={styles.recentContent}>
                    <Text style={styles.recentLabel}>{item.label}</Text>
                    <Text style={styles.recentResult}>{item.result}</Text>
                  </View>
                  <Text style={styles.recentTime}>{item.time}</Text>
                </TouchableOpacity>
              ))}
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
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.xxxl + Spacing.md,
    marginBottom: Spacing.xl, gap: Spacing.md,
  },
  backButton: { padding: Spacing.xs },
  headerTitle: { fontSize: FontSizes.xxl, fontWeight: '700', color: Colors.text },
  tabSection: { paddingHorizontal: Spacing.lg, marginBottom: Spacing.xl },
  tabRow: { flexDirection: 'row', gap: Spacing.md },
  tab: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    paddingVertical: Spacing.md, borderRadius: BorderRadius.md,
    backgroundColor: Colors.surface, borderWidth: 1, borderColor: Colors.border, gap: Spacing.sm,
  },
  tabActive: { borderColor: Colors.primary, backgroundColor: 'rgba(0,229,255,0.08)' },
  tabText: { fontSize: FontSizes.sm, fontWeight: '600', color: Colors.textTertiary },
  tabTextActive: { color: Colors.primary },
  uploadSection: { paddingHorizontal: Spacing.lg, marginBottom: Spacing.xl },
  uploadCard: {
    backgroundColor: Colors.surface, borderRadius: BorderRadius.xl,
    borderWidth: 1.5, borderColor: Colors.primary + '40',
    borderStyle: 'dashed', padding: Spacing.xxl,
    alignItems: 'center', gap: Spacing.md,
  },
  uploadTitle: { fontSize: FontSizes.xl, fontWeight: '700', color: Colors.text },
  uploadDesc: { fontSize: FontSizes.sm, color: Colors.textTertiary, textAlign: 'center', lineHeight: 20, maxWidth: 260 },
  uploadButton: {
    backgroundColor: Colors.primary, paddingHorizontal: Spacing.xl,
    paddingVertical: Spacing.md, borderRadius: BorderRadius.md, marginTop: Spacing.sm,
  },
  uploadButtonText: { fontSize: FontSizes.md, fontWeight: '700', color: Colors.background },
  section: { paddingHorizontal: Spacing.lg, marginBottom: Spacing.xl },
  sectionTitle: {
    fontSize: FontSizes.md, fontWeight: '700', color: Colors.textSecondary,
    textTransform: 'uppercase', letterSpacing: 1, marginBottom: Spacing.md,
  },
  capabilityList: { gap: Spacing.md },
  capabilityItem: {
    flexDirection: 'row', alignItems: 'center', gap: Spacing.md,
    backgroundColor: Colors.surface, borderRadius: BorderRadius.lg,
    padding: Spacing.md, borderWidth: 1, borderColor: Colors.border,
  },
  capabilityIcon: { width: 44, height: 44, borderRadius: BorderRadius.md, alignItems: 'center', justifyContent: 'center' },
  capabilityText: { flex: 1 },
  capabilityLabel: { fontSize: FontSizes.md, fontWeight: '600', color: Colors.text },
  capabilityDesc: { fontSize: FontSizes.xs, color: Colors.textTertiary },
  recentList: { gap: Spacing.md },
  recentItem: {
    flexDirection: 'row', alignItems: 'center', gap: Spacing.md,
    backgroundColor: Colors.surface, borderRadius: BorderRadius.lg,
    padding: Spacing.md, borderWidth: 1, borderColor: Colors.border,
  },
  recentIcon: { width: 40, height: 40, borderRadius: BorderRadius.md, alignItems: 'center', justifyContent: 'center' },
  recentContent: { flex: 1 },
  recentLabel: { fontSize: FontSizes.md, fontWeight: '600', color: Colors.text },
  recentResult: { fontSize: FontSizes.xs, color: Colors.textTertiary },
  recentTime: { fontSize: FontSizes.xs, color: Colors.textTertiary },
});
