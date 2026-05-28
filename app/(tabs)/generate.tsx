import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, { FadeInUp } from 'react-native-reanimated';
import {
  ImagePlus,
  Sparkles,
  Wand2,
  Download,
  Share2,
  RefreshCw,
  Layers,
  Maximize2,
  Cpu,
  Clock,
  Star,
} from 'lucide-react-native';
import { Colors, Spacing, FontSizes, BorderRadius } from '../../constants/theme';
import GlowButton from '../../components/GlowButton';

const stylePresets = [
  { label: 'Cyberpunk', color: Colors.primary },
  { label: 'Cinematic', color: Colors.secondary },
  { label: 'Anime', color: Colors.accent },
  { label: 'Abstract', color: '#E040FB' },
  { label: 'Photorealistic', color: Colors.warning },
  { label: 'Minimal', color: Colors.textTertiary },
  { label: 'Futuristic', color: '#A855F7' },
  { label: 'Dark Fantasy', color: '#EF4444' },
];

const ratioOptions = [
  { label: '1:1', desc: 'Square' },
  { label: '4:3', desc: 'Standard' },
  { label: '16:9', desc: 'Wide' },
  { label: '9:16', desc: 'Portrait' },
];

const samplePrompts = [
  'A cyberpunk city at midnight with neon-lit rain streets',
  'An AI robot in a futuristic lab surrounded by holographic data',
  'A deep space station orbiting a glowing purple nebula',
  'A warrior in digital armor standing on a floating island',
];

const recentCreations = [
  { prompt: 'Futuristic city at night with neon lights', style: 'Cyberpunk', time: '2m ago' },
  { prompt: 'A robotic assistant in a modern lab', style: 'Cinematic', time: '1h ago' },
  { prompt: 'Space station orbiting a distant planet', style: 'Abstract', time: '3h ago' },
  { prompt: 'Dragon made of pure electricity', style: 'Dark Fantasy', time: '1d ago' },
];

export default function GenerateScreen() {
  const [prompt, setPrompt] = useState('');
  const [selectedStyle, setSelectedStyle] = useState('Cyberpunk');
  const [selectedRatio, setSelectedRatio] = useState('1:1');
  const [isGenerating, setIsGenerating] = useState(false);
  const [generated, setGenerated] = useState(false);
  const [quality, setQuality] = useState<'standard' | 'high'>('standard');

  const handleGenerate = () => {
    if (!prompt.trim()) {
      Alert.alert('Add a prompt', 'Describe the image you want to create.');
      return;
    }
    setIsGenerating(true);
    setGenerated(false);
    setTimeout(() => {
      setIsGenerating(false);
      setGenerated(true);
    }, 3000);
  };

  const handleSurpriseMe = () => {
    const random = samplePrompts[Math.floor(Math.random() * samplePrompts.length)];
    setPrompt(random);
  };

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={[Colors.background, Colors.backgroundSecondary]}
        style={styles.gradient}
      >
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scrollContent}
        >
          <Animated.View entering={FadeInUp.duration(600)} style={styles.header}>
            <View style={styles.headerLeft}>
              <View style={styles.headerIcon}>
                <Wand2 color={Colors.secondary} size={22} />
              </View>
              <View>
                <Text style={styles.headerTitle}>AI Studio</Text>
                <Text style={styles.headerSub}>Image Generation</Text>
              </View>
            </View>
            <View style={styles.modelBadge}>
              <Cpu color={Colors.secondary} size={12} />
              <Text style={styles.modelBadgeText}>SDXL</Text>
            </View>
          </Animated.View>

          <Animated.View entering={FadeInUp.duration(600).delay(100)} style={styles.promptSection}>
            <View style={styles.labelRow}>
              <Text style={styles.label}>Describe your image</Text>
              <TouchableOpacity onPress={handleSurpriseMe} style={styles.surpriseBtn}>
                <Star color={Colors.warning} size={14} />
                <Text style={styles.surpriseText}>Surprise me</Text>
              </TouchableOpacity>
            </View>
            <View style={styles.promptCard}>
              <TextInput
                style={styles.promptInput}
                placeholder="A futuristic city with flying cars and neon lights at sunset..."
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
            <Text style={styles.label}>Art Style</Text>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.styleRow}
            >
              {stylePresets.map((preset) => (
                <TouchableOpacity
                  key={preset.label}
                  onPress={() => setSelectedStyle(preset.label)}
                  style={[
                    styles.styleChip,
                    selectedStyle === preset.label && {
                      borderColor: preset.color,
                      backgroundColor: preset.color + '18',
                    },
                  ]}
                >
                  {selectedStyle === preset.label && (
                    <View style={[styles.styleDot, { backgroundColor: preset.color }]} />
                  )}
                  <Text
                    style={[
                      styles.styleText,
                      selectedStyle === preset.label && { color: preset.color },
                    ]}
                  >
                    {preset.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </Animated.View>

          <Animated.View entering={FadeInUp.duration(600).delay(250)} style={styles.optionsRow}>
            <View style={styles.optionGroup}>
              <Text style={styles.optionLabel}>Aspect Ratio</Text>
              <View style={styles.ratioRow}>
                {ratioOptions.map((r) => (
                  <TouchableOpacity
                    key={r.label}
                    onPress={() => setSelectedRatio(r.label)}
                    style={[
                      styles.ratioChip,
                      selectedRatio === r.label && styles.ratioChipActive,
                    ]}
                  >
                    <Text
                      style={[
                        styles.ratioLabel,
                        selectedRatio === r.label && { color: Colors.primary },
                      ]}
                    >
                      {r.label}
                    </Text>
                    <Text style={styles.ratioDesc}>{r.desc}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            <View style={styles.qualityGroup}>
              <Text style={styles.optionLabel}>Quality</Text>
              <View style={styles.qualityRow}>
                {(['standard', 'high'] as const).map((q) => (
                  <TouchableOpacity
                    key={q}
                    onPress={() => setQuality(q)}
                    style={[styles.qualityChip, quality === q && styles.qualityChipActive]}
                  >
                    <Text
                      style={[
                        styles.qualityText,
                        quality === q && { color: Colors.primary },
                      ]}
                    >
                      {q.charAt(0).toUpperCase() + q.slice(1)}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
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
            {isGenerating && (
              <View style={styles.generatingInfo}>
                <Clock color={Colors.textTertiary} size={12} />
                <Text style={styles.generatingText}>Estimated time: ~15 seconds</Text>
              </View>
            )}
          </Animated.View>

          {generated && (
            <Animated.View entering={FadeInUp.duration(600)} style={styles.resultSection}>
              <View style={styles.labelRow}>
                <Text style={styles.label}>Result</Text>
                <View style={[styles.modelBadge, { backgroundColor: Colors.success + '20', borderColor: Colors.success + '40' }]}>
                  <Text style={[styles.modelBadgeText, { color: Colors.success }]}>Generated</Text>
                </View>
              </View>
              <View style={styles.resultCard}>
                <LinearGradient
                  colors={['rgba(0,229,255,0.05)', 'rgba(0,191,165,0.05)']}
                  style={styles.resultImagePlaceholder}
                >
                  <ImagePlus color={Colors.primary} size={48} strokeWidth={1} />
                  <Text style={styles.resultPromptText}>"{prompt}"</Text>
                  <Text style={styles.resultStyleText}>
                    {selectedStyle} · {selectedRatio}
                  </Text>
                </LinearGradient>
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
                    <Text style={styles.resultActionText}>Expand</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.resultAction} onPress={handleGenerate}>
                    <RefreshCw color={Colors.textTertiary} size={18} />
                    <Text style={[styles.resultActionText, { color: Colors.textTertiary }]}>
                      Retry
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>
            </Animated.View>
          )}

          <Animated.View entering={FadeInUp.duration(600).delay(400)} style={styles.gallerySection}>
            <Text style={styles.label}>Recent Creations</Text>
            <View style={styles.galleryGrid}>
              {recentCreations.map((img, i) => (
                <TouchableOpacity key={i} style={styles.galleryItem} activeOpacity={0.8}>
                  <LinearGradient
                    colors={['rgba(0,229,255,0.03)', 'rgba(0,191,165,0.06)']}
                    style={styles.galleryImagePlaceholder}
                  >
                    <Layers color={Colors.textTertiary} size={22} />
                  </LinearGradient>
                  <View style={styles.galleryInfo}>
                    <Text style={styles.galleryPrompt} numberOfLines={2}>
                      {img.prompt}
                    </Text>
                    <View style={styles.galleryMeta}>
                      <Text style={styles.galleryStyle}>{img.style}</Text>
                      <Text style={styles.galleryTime}>{img.time}</Text>
                    </View>
                  </View>
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
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.xxxl + Spacing.md,
    marginBottom: Spacing.xl,
  },
  headerLeft: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md },
  headerIcon: {
    width: 44,
    height: 44,
    borderRadius: BorderRadius.md,
    backgroundColor: 'rgba(0, 191, 165, 0.12)',
    borderWidth: 1,
    borderColor: Colors.secondary + '40',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: FontSizes.xxl,
    fontWeight: '700',
    color: Colors.text,
  },
  headerSub: { fontSize: FontSizes.xs, color: Colors.textTertiary, marginTop: 1 },
  modelBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 4,
    borderRadius: BorderRadius.full,
    backgroundColor: Colors.secondary + '15',
    borderWidth: 1,
    borderColor: Colors.secondary + '30',
  },
  modelBadgeText: { fontSize: FontSizes.xs, fontWeight: '700', color: Colors.secondary },
  promptSection: { paddingHorizontal: Spacing.lg, marginBottom: Spacing.xl },
  labelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.md,
  },
  label: { fontSize: FontSizes.md, fontWeight: '700', color: Colors.text },
  surpriseBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 4,
    borderRadius: BorderRadius.full,
    borderWidth: 1,
    borderColor: Colors.warning + '40',
    backgroundColor: Colors.warning + '10',
  },
  surpriseText: { fontSize: FontSizes.xs, color: Colors.warning, fontWeight: '600' },
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
    minHeight: 90,
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
  charCount: { fontSize: FontSizes.xs, color: Colors.textTertiary },
  styleSection: { paddingHorizontal: Spacing.lg, marginBottom: Spacing.xl },
  styleRow: { flexDirection: 'row', gap: Spacing.sm, paddingRight: Spacing.lg },
  styleChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.full,
    borderWidth: 1,
    borderColor: Colors.border,
    backgroundColor: Colors.surface,
    gap: Spacing.xs,
  },
  styleDot: { width: 6, height: 6, borderRadius: 3 },
  styleText: { fontSize: FontSizes.sm, fontWeight: '600', color: Colors.textTertiary },
  optionsRow: {
    paddingHorizontal: Spacing.lg,
    marginBottom: Spacing.xl,
    gap: Spacing.lg,
  },
  optionGroup: {},
  optionLabel: {
    fontSize: FontSizes.sm,
    fontWeight: '600',
    color: Colors.textSecondary,
    marginBottom: Spacing.sm,
  },
  ratioRow: { flexDirection: 'row', gap: Spacing.sm },
  ratioChip: {
    flex: 1,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.md,
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
    alignItems: 'center',
  },
  ratioChipActive: {
    borderColor: Colors.primary,
    backgroundColor: Colors.primary + '10',
  },
  ratioLabel: { fontSize: FontSizes.sm, fontWeight: '700', color: Colors.textTertiary },
  ratioDesc: { fontSize: FontSizes.xs, color: Colors.textTertiary, marginTop: 1 },
  qualityGroup: {},
  qualityRow: { flexDirection: 'row', gap: Spacing.sm },
  qualityChip: {
    flex: 1,
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.md,
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
    alignItems: 'center',
  },
  qualityChipActive: {
    borderColor: Colors.primary,
    backgroundColor: Colors.primary + '10',
  },
  qualityText: { fontSize: FontSizes.sm, fontWeight: '600', color: Colors.textTertiary },
  generateSection: { paddingHorizontal: Spacing.lg, marginBottom: Spacing.xl },
  generateButton: { width: '100%' },
  generatingInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.xs,
    marginTop: Spacing.md,
  },
  generatingText: { fontSize: FontSizes.xs, color: Colors.textTertiary },
  resultSection: { paddingHorizontal: Spacing.lg, marginBottom: Spacing.xl },
  resultCard: {
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    borderColor: Colors.primary + '30',
    overflow: 'hidden',
  },
  resultImagePlaceholder: {
    height: 260,
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
    maxWidth: 280,
  },
  resultStyleText: { fontSize: FontSizes.xs, color: Colors.primary, fontWeight: '700' },
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
  resultActionText: { fontSize: FontSizes.sm, color: Colors.primary, fontWeight: '600' },
  gallerySection: { paddingHorizontal: Spacing.lg },
  galleryGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.md },
  galleryItem: {
    width: '47%',
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.lg,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: Colors.border,
  },
  galleryImagePlaceholder: {
    height: 110,
    alignItems: 'center',
    justifyContent: 'center',
  },
  galleryInfo: { padding: Spacing.sm },
  galleryPrompt: {
    fontSize: FontSizes.xs,
    color: Colors.textSecondary,
    lineHeight: 16,
    marginBottom: Spacing.xs,
  },
  galleryMeta: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  galleryStyle: { fontSize: FontSizes.xs, color: Colors.primary, fontWeight: '700' },
  galleryTime: { fontSize: FontSizes.xs, color: Colors.textTertiary },
});
