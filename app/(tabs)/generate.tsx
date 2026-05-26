import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TextInput, TouchableOpacity, Image } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, { FadeInUp } from 'react-native-reanimated';
import { ImagePlus, Sparkles, Download, Share2, RefreshCw, Layers, Maximize2 } from 'lucide-react-native';
import { Colors, Spacing, FontSizes, BorderRadius } from '../../constants/theme';
import GlowButton from '../../components/GlowButton';

const studioTabs = ['Images', 'Content', 'Code', 'Translate'];

const stylePresets = [
  { label: 'Cyberpunk', color: Colors.primary },
  { label: 'Realistic', color: Colors.secondary },
  { label: 'Anime', color: Colors.accent },
  { label: 'Abstract', color: '#E040FB' },
  { label: 'Fantasy', color: Colors.warning },
  { label: 'Minimal', color: Colors.textTertiary },
];

const sampleImages = [
  { prompt: 'Futuristic city at night with neon lights', style: 'Cyberpunk' },
  { prompt: 'A robotic assistant in a modern lab', style: 'Realistic' },
  { prompt: 'Space station orbiting a distant planet', style: 'Abstract' },
];

export default function GenerateScreen() {
  const [prompt, setPrompt] = useState('');
  const [selectedStyle, setSelectedStyle] = useState('Cyberpunk');
  const [isGenerating, setIsGenerating] = useState(false);
  const [generated, setGenerated] = useState(false);
  const [activeTab, setActiveTab] = useState('Images');

  const handleGenerate = () => {
    if (!prompt.trim()) return;
    setIsGenerating(true);
    setTimeout(() => {
      setIsGenerating(false);
      setGenerated(true);
    }, 3000);
  };

  return (
    <View style={styles.container}>
      <LinearGradient colors={[Colors.background, Colors.backgroundSecondary]} style={styles.gradient}>
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
          <Animated.View entering={FadeInUp.duration(600)} style={styles.header}>
            <Sparkles color={Colors.secondary} size={28} />
            <Text style={styles.headerTitle}>AI Studio</Text>
          </Animated.View>

          <Animated.View entering={FadeInUp.duration(600).delay(50)} style={styles.tabsSection}>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.tabsRow}>
              {studioTabs.map((tab) => (
                <TouchableOpacity
                  key={tab}
                  onPress={() => setActiveTab(tab)}
                  style={[
                    styles.tabChip,
                    activeTab === tab && styles.tabChipActive,
                  ]}
                >
                  <Text style={[styles.tabChipText, activeTab === tab && styles.tabChipTextActive]}>
                    {tab}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </Animated.View>

          {activeTab === 'Images' ? (
            <>
              <Animated.View entering={FadeInUp.duration(600).delay(100)} style={styles.promptSection}>
                <Text style={styles.label}>Describe your image</Text>
                <View style={styles.promptCard}>
                  <TextInput
                    style={styles.promptInput}
                    placeholder="A futuristic city with flying cars and neon lights..."
                    placeholderTextColor={Colors.textTertiary}
                    value={prompt}
                    onChangeText={setPrompt}
                    multiline
                    maxLength={500}
                  />
                  <View style={styles.promptFooter}>
                    <Text style={styles.charCount}>{prompt.length}/500</Text>
                    <TouchableOpacity onPress={() => setPrompt('')}>
                      <RefreshCw color={Colors.textTertiary} size={14} />
                    </TouchableOpacity>
                  </View>
                </View>
              </Animated.View>

              <Animated.View entering={FadeInUp.duration(600).delay(200)} style={styles.styleSection}>
                <Text style={styles.label}>Style</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.styleRow}>
                  {stylePresets.map((preset) => (
                    <TouchableOpacity
                      key={preset.label}
                      onPress={() => setSelectedStyle(preset.label)}
                      style={[
                        styles.styleChip,
                        selectedStyle === preset.label && { borderColor: preset.color, backgroundColor: preset.color + '15' },
                      ]}
                    >
                      {selectedStyle === preset.label && <View style={[styles.styleDot, { backgroundColor: preset.color }]} />}
                      <Text style={[styles.styleText, selectedStyle === preset.label && { color: preset.color }]}>
                        {preset.label}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </Animated.View>

              <Animated.View entering={FadeInUp.duration(600).delay(300)} style={styles.generateSection}>
                <GlowButton
                  title={isGenerating ? 'Generating...' : 'Generate Image'}
                  onPress={handleGenerate}
                  variant="primary"
                  size="lg"
                  loading={isGenerating}
                  icon={!isGenerating ? <Sparkles color={Colors.background} size={18} /> : undefined}
                  style={styles.generateButton}
                />
              </Animated.View>

              {generated && (
                <Animated.View entering={FadeInUp.duration(600)} style={styles.resultSection}>
                  <Text style={styles.label}>Result</Text>
                  <View style={styles.resultCard}>
                    <View style={styles.resultImagePlaceholder}>
                      <ImagePlus color={Colors.primary} size={48} />
                      <Text style={styles.resultPromptText}>"{prompt}"</Text>
                      <Text style={styles.resultStyleText}>{selectedStyle} Style</Text>
                    </View>
                    <View style={styles.resultActions}>
                      <TouchableOpacity style={styles.resultAction}>
                        <Download color={Colors.primary} size={18} />
                        <Text style={styles.resultActionText}>Save</Text>
                      </TouchableOpacity>
                      <TouchableOpacity style={styles.resultAction}>
                        <Share2 color={Colors.primary} size={18} />
                        <Text style={styles.resultActionText}>Share</Text>
                      </TouchableOpacity>
                      <TouchableOpacity style={styles.resultAction}>
                        <Maximize2 color={Colors.primary} size={18} />
                        <Text style={styles.resultActionText}>Full</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                </Animated.View>
              )}

              <Animated.View entering={FadeInUp.duration(600).delay(400)} style={styles.gallerySection}>
                <Text style={styles.label}>Recent Creations</Text>
                <View style={styles.galleryGrid}>
                  {sampleImages.map((img, i) => (
                    <TouchableOpacity key={i} style={styles.galleryItem}>
                      <View style={styles.galleryImagePlaceholder}>
                        <Layers color={Colors.textTertiary} size={24} />
                      </View>
                      <Text style={styles.galleryPrompt} numberOfLines={2}>{img.prompt}</Text>
                      <Text style={styles.galleryStyle}>{img.style}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </Animated.View>
            </>
          ) : (
            <Animated.View entering={FadeInUp.duration(600).delay(100)} style={styles.comingSoonSection}>
              <Sparkles color={Colors.primary} size={48} />
              <Text style={styles.comingSoonTitle}>Coming Soon</Text>
              <Text style={styles.comingSoonSubtitle}>{activeTab} generation is being crafted by the Vexora team.</Text>
            </Animated.View>
          )}
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
    marginBottom: Spacing.lg,
    gap: Spacing.md,
  },
  headerTitle: {
    fontSize: FontSizes.xxl,
    fontWeight: '700',
    color: Colors.text,
  },
  tabsSection: {
    paddingHorizontal: Spacing.lg,
    marginBottom: Spacing.xl,
  },
  tabsRow: {
    flexDirection: 'row',
    gap: Spacing.sm,
  },
  tabChip: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm + 2,
    borderRadius: BorderRadius.full,
    borderWidth: 1,
    borderColor: Colors.border,
    backgroundColor: Colors.surface,
  },
  tabChipActive: {
    borderColor: Colors.secondary,
    backgroundColor: Colors.secondary + '15',
  },
  tabChipText: {
    fontSize: FontSizes.sm,
    fontWeight: '600',
    color: Colors.textTertiary,
  },
  tabChipTextActive: {
    color: Colors.secondary,
  },
  comingSoonSection: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Spacing.xxxl,
    paddingHorizontal: Spacing.lg,
    gap: Spacing.md,
  },
  comingSoonTitle: {
    fontSize: FontSizes.xxl,
    fontWeight: '700',
    color: Colors.text,
  },
  comingSoonSubtitle: {
    fontSize: FontSizes.md,
    color: Colors.textSecondary,
    textAlign: 'center',
    lineHeight: 22,
  },
  promptSection: {
    paddingHorizontal: Spacing.lg,
    marginBottom: Spacing.xl,
  },
  label: {
    fontSize: FontSizes.md,
    fontWeight: '600',
    color: Colors.text,
    marginBottom: Spacing.md,
  },
  promptCard: {
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: Spacing.md,
  },
  promptInput: {
    fontSize: FontSizes.md,
    color: Colors.text,
    minHeight: 80,
    lineHeight: 22,
    textAlignVertical: 'top',
  },
  promptFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: Spacing.sm,
    paddingTop: Spacing.sm,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
  },
  charCount: {
    fontSize: FontSizes.xs,
    color: Colors.textTertiary,
  },
  styleSection: {
    paddingHorizontal: Spacing.lg,
    marginBottom: Spacing.xl,
  },
  styleRow: {
    flexDirection: 'row',
    gap: Spacing.sm,
  },
  styleChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm + 2,
    borderRadius: BorderRadius.full,
    borderWidth: 1,
    borderColor: Colors.border,
    backgroundColor: Colors.surface,
    gap: Spacing.xs,
  },
  styleDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  styleText: {
    fontSize: FontSizes.sm,
    fontWeight: '600',
    color: Colors.textTertiary,
  },
  generateSection: {
    paddingHorizontal: Spacing.lg,
    marginBottom: Spacing.xl,
  },
  generateButton: {
    width: '100%',
  },
  resultSection: {
    paddingHorizontal: Spacing.lg,
    marginBottom: Spacing.xl,
  },
  resultCard: {
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    borderColor: Colors.primary + '40',
    overflow: 'hidden',
  },
  resultImagePlaceholder: {
    height: 240,
    backgroundColor: Colors.backgroundTertiary,
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
  },
  resultPromptText: {
    fontSize: FontSizes.sm,
    color: Colors.textSecondary,
    textAlign: 'center',
    paddingHorizontal: Spacing.lg,
    fontStyle: 'italic',
  },
  resultStyleText: {
    fontSize: FontSizes.xs,
    color: Colors.primary,
    fontWeight: '600',
  },
  resultActions: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingVertical: Spacing.md,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
  },
  resultAction: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    padding: Spacing.sm,
  },
  resultActionText: {
    fontSize: FontSizes.sm,
    color: Colors.primary,
    fontWeight: '500',
  },
  gallerySection: {
    paddingHorizontal: Spacing.lg,
  },
  galleryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.md,
  },
  galleryItem: {
    width: '47%',
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.lg,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: Colors.border,
  },
  galleryImagePlaceholder: {
    height: 100,
    backgroundColor: Colors.backgroundTertiary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  galleryPrompt: {
    fontSize: FontSizes.xs,
    color: Colors.textSecondary,
    padding: Spacing.sm,
    lineHeight: 16,
  },
  galleryStyle: {
    fontSize: FontSizes.xs,
    color: Colors.primary,
    fontWeight: '600',
    paddingHorizontal: Spacing.sm,
    paddingBottom: Spacing.sm,
  },
});
