import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Dimensions,
  Platform,
  KeyboardAvoidingView,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withSequence,
  withTiming,
  withSpring,
  Easing,
  FadeIn,
  FadeOut,
  interpolateColor,
} from 'react-native-reanimated';
import Svg, {
  Path,
  Defs,
  LinearGradient as SvgLinearGradient,
  Stop,
} from 'react-native-svg';
import { ChevronDown, Settings, Mic, Send, Menu } from 'lucide-react-native';
import { router } from 'expo-router';
import { Colors, Spacing, FontSizes, BorderRadius } from '../../constants/theme';
import { setPendingCommand } from './chat';

const { width: W, height: H } = Dimensions.get('window');

const SUB_PROMPTS = [
  'Hello, how can I help?',
  'What would you like to do?',
  'Ask me anything.',
  'Ready when you are.',
  'I can help with that.',
  "What's on your mind?",
  "Let's figure it out together.",
  'Your offline AI, always here.',
];

const QUICK_CHIPS = [
  { label: 'Text Mom on WhatsApp', cmd: 'Text Mom on WhatsApp saying hi' },
  { label: 'Search YouTube for music', cmd: 'YouTube lofi chill music' },
  { label: 'Turn on flashlight', cmd: 'torch on' },
  { label: 'Set alarm for 7am', cmd: 'Set alarm for 7am' },
  { label: 'Read notifications', cmd: 'Read my recent notifications' },
  { label: "How's my battery?", cmd: 'battery' },
  { label: 'Open YouTube', cmd: 'open youtube' },
  { label: 'Inspire me', cmd: 'Inspire me' },
];

const GEMINI_COLORS = ['#A855F7', '#3B82F6', '#10B981', '#EC4899', '#A855F7'] as const;

// ── 4-pointed Vexsora star ────────────────────────────────────────────────────
function VexsoraStar({ size = 80 }: { size?: number }) {
  const scale = useSharedValue(1);
  const glowOpacity = useSharedValue(0.3);
  const colorPhase = useSharedValue(0);

  useEffect(() => {
    scale.value = withRepeat(
      withSequence(
        withTiming(1.1, { duration: 2500, easing: Easing.inOut(Easing.sin) }),
        withTiming(0.93, { duration: 2500, easing: Easing.inOut(Easing.sin) })
      ),
      -1,
      false
    );
    glowOpacity.value = withRepeat(
      withSequence(
        withTiming(0.65, { duration: 2500, easing: Easing.inOut(Easing.sin) }),
        withTiming(0.15, { duration: 2500, easing: Easing.inOut(Easing.sin) })
      ),
      -1,
      false
    );
    colorPhase.value = withRepeat(
      withTiming(1, { duration: 4000, easing: Easing.linear }),
      -1,
      false
    );
  }, []);

  const starStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));
  const glowStyle = useAnimatedStyle(() => ({
    opacity: glowOpacity.value,
  }));

  // Build 4-pointed star SVG path
  const s = size;
  const cx = s / 2;
  const cy = s / 2;
  const outer = s * 0.46;
  const inner = s * 0.14;
  const pts: string[] = [];
  for (let i = 0; i < 8; i++) {
    const angle = (i * Math.PI) / 4 - Math.PI / 2;
    const r = i % 2 === 0 ? outer : inner;
    pts.push(`${cx + r * Math.cos(angle)},${cy + r * Math.sin(angle)}`);
  }
  const starPath = `M${pts.join('L')}Z`;

  return (
    <View style={{ width: s, height: s, alignItems: 'center', justifyContent: 'center' }}>
      <Animated.View
        style={[
          {
            position: 'absolute',
            width: s * 1.6,
            height: s * 1.6,
            borderRadius: (s * 1.6) / 2,
            backgroundColor: 'rgba(168,85,247,0.18)',
          },
          glowStyle,
        ]}
      />
      <Animated.View
        style={[
          {
            position: 'absolute',
            width: s * 1.2,
            height: s * 1.2,
            borderRadius: (s * 1.2) / 2,
            backgroundColor: 'rgba(59,130,246,0.12)',
          },
          glowStyle,
        ]}
      />
      <Animated.View style={starStyle}>
        <Svg width={s} height={s}>
          <Defs>
            <SvgLinearGradient id="starGrad" x1="0" y1="0" x2="1" y2="1">
              <Stop offset="0%" stopColor="#A855F7" stopOpacity="1" />
              <Stop offset="50%" stopColor="#3B82F6" stopOpacity="1" />
              <Stop offset="100%" stopColor="#C084FC" stopOpacity="1" />
            </SvgLinearGradient>
          </Defs>
          <Path d={starPath} fill="url(#starGrad)" />
        </Svg>
      </Animated.View>
    </View>
  );
}

// ── Sparkle dot field ─────────────────────────────────────────────────────────
function SparkleDots() {
  const dots = useRef(
    Array.from({ length: 18 }, (_, i) => ({
      x: Math.random() * W,
      y: Math.random() * 180,
      size: 1.5 + Math.random() * 2.5,
      delay: i * 180,
    }))
  ).current;

  return (
    <View style={StyleSheet.absoluteFillObject} pointerEvents="none">
      {dots.map((d, i) => (
        <SparkDot key={i} x={d.x} y={d.y} size={d.size} delay={d.delay} />
      ))}
    </View>
  );
}

function SparkDot({ x, y, size, delay }: { x: number; y: number; size: number; delay: number }) {
  const op = useSharedValue(0.1);
  useEffect(() => {
    const timer = setTimeout(() => {
      op.value = withRepeat(
        withSequence(
          withTiming(0.8, { duration: 1400 + Math.random() * 800 }),
          withTiming(0.1, { duration: 1400 + Math.random() * 800 })
        ),
        -1,
        false
      );
    }, delay);
    return () => clearTimeout(timer);
  }, []);
  const style = useAnimatedStyle(() => ({ opacity: op.value }));
  return (
    <Animated.View
      style={[
        style,
        {
          position: 'absolute',
          left: x,
          top: y,
          width: size,
          height: size,
          borderRadius: size / 2,
          backgroundColor: '#A855F7',
        },
      ]}
    />
  );
}

// ── Cycling sub-prompt ────────────────────────────────────────────────────────
function SubPromptCycler() {
  const [idx, setIdx] = useState(0);
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    const interval = setInterval(() => {
      setVisible(false);
      setTimeout(() => {
        setIdx((i) => (i + 1) % SUB_PROMPTS.length);
        setVisible(true);
      }, 400);
    }, 3500);
    return () => clearInterval(interval);
  }, []);

  return (
    <View style={{ height: 48, justifyContent: 'center', alignItems: 'center' }}>
      {visible && (
        <Animated.Text entering={FadeIn.duration(350)} exiting={FadeOut.duration(350)} style={styles.subPrompt}>
          {SUB_PROMPTS[idx]}
        </Animated.Text>
      )}
    </View>
  );
}

// ── Waveform bars (shown when input is empty) ─────────────────────────────────
function WaveformBars() {
  const bars = [useSharedValue(0.4), useSharedValue(0.7), useSharedValue(1), useSharedValue(0.6), useSharedValue(0.3)];
  useEffect(() => {
    bars.forEach((b, i) => {
      b.value = withRepeat(
        withSequence(
          withTiming(1, { duration: 300 + i * 80, easing: Easing.inOut(Easing.sin) }),
          withTiming(0.2, { duration: 300 + i * 80, easing: Easing.inOut(Easing.sin) })
        ),
        -1,
        false
      );
    });
  }, []);
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 2, height: 18 }}>
      {bars.map((b, i) => {
        const s = useAnimatedStyle(() => ({ height: 18 * b.value }));
        return (
          <Animated.View
            key={i}
            style={[{ width: 3, borderRadius: 2, backgroundColor: Colors.primary }, s]}
          />
        );
      })}
    </View>
  );
}

// ── Gemini-style color cycling header title ────────────────────────────────────
function GeminiTitle({ text }: { text: string }) {
  const p = useSharedValue(0);
  useEffect(() => {
    p.value = withRepeat(withTiming(1, { duration: 4000, easing: Easing.linear }), -1, false);
  }, []);
  const s = useAnimatedStyle(() => ({
    color: interpolateColor(p.value, [0, 0.25, 0.5, 0.75, 1], [...GEMINI_COLORS]),
  }));
  return <Animated.Text style={[styles.modelPillText, s]}>{text}</Animated.Text>;
}

// ── Main HomeScreen ───────────────────────────────────────────────────────────
export default function HomeScreen() {
  const [inputText, setInputText] = useState('');
  const [modelMenuOpen, setModelMenuOpen] = useState(false);
  const inputRef = useRef<TextInput>(null);

  const handleSend = useCallback(() => {
    const text = inputText.trim();
    if (!text) return;
    setPendingCommand(text);
    setInputText('');
    router.navigate('/(tabs)/chat');
  }, [inputText]);

  const handleChipPress = useCallback((cmd: string) => {
    setPendingCommand(cmd);
    router.navigate('/(tabs)/chat');
  }, []);

  const handleMic = useCallback(() => {
    router.navigate('/(tabs)/chat');
  }, []);

  return (
    <View style={styles.root}>
      <LinearGradient
        colors={['#0B0B0A', '#0F0B18', '#0B0B0A']}
        style={StyleSheet.absoluteFill}
      />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.headerBtn} onPress={() => {}}>
          <Menu size={22} color={Colors.textSecondary} />
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.modelPill}
          onPress={() => setModelMenuOpen((v) => !v)}
          activeOpacity={0.8}
        >
          <GeminiTitle text="Vexsora" />
          <ChevronDown size={14} color={Colors.textSecondary} style={{ marginLeft: 4 }} />
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.headerBtn}
          onPress={() => router.navigate('/(tabs)/settings')}
        >
          <Settings size={22} color={Colors.textSecondary} />
        </TouchableOpacity>
      </View>

      {/* Main scrollable content */}
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={{ flex: 1 }}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {/* Star + greeting */}
          <View style={styles.heroSection}>
            <Animated.View entering={FadeIn.duration(800)}>
              <VexsoraStar size={88} />
            </Animated.View>
            <SubPromptCycler />
          </View>

          {/* Quick-action chips */}
          <View style={styles.chipsSection}>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.chipsRow}
            >
              {QUICK_CHIPS.map((chip, i) => (
                <Animated.View
                  key={chip.cmd}
                  entering={FadeIn.delay(i * 60).duration(400)}
                >
                  <TouchableOpacity
                    style={styles.chip}
                    onPress={() => handleChipPress(chip.cmd)}
                    activeOpacity={0.75}
                  >
                    <Text style={styles.chipText}>{chip.label}</Text>
                  </TouchableOpacity>
                </Animated.View>
              ))}
            </ScrollView>
          </View>

          {/* Input bar + sparkle dots */}
          <View style={styles.inputSection}>
            <SparkleDots />
            <View style={styles.inputPill}>
              <TextInput
                ref={inputRef}
                style={styles.input}
                placeholder="Ask Vexsora..."
                placeholderTextColor={Colors.textTertiary}
                value={inputText}
                onChangeText={setInputText}
                onSubmitEditing={handleSend}
                returnKeyType="send"
                multiline={false}
              />
              <TouchableOpacity style={styles.micBtn} onPress={handleMic} activeOpacity={0.7}>
                <Mic size={20} color={Colors.primary} />
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.sendBtn,
                  inputText.trim().length > 0 && styles.sendBtnActive,
                ]}
                onPress={handleSend}
                activeOpacity={0.8}
              >
                {inputText.trim().length > 0 ? (
                  <Send size={18} color="#fff" />
                ) : (
                  <WaveformBars />
                )}
              </TouchableOpacity>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#0B0B0A',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.md,
    paddingTop: Platform.OS === 'android' ? 48 : 56,
    paddingBottom: Spacing.sm,
  },
  headerBtn: {
    width: 40,
    height: 40,
    borderRadius: BorderRadius.full,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.05)',
  },
  modelPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(168,85,247,0.12)',
    borderRadius: BorderRadius.full,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs + 2,
    borderWidth: 1,
    borderColor: 'rgba(168,85,247,0.25)',
  },
  modelPillText: {
    fontSize: FontSizes.md,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
  scrollContent: {
    flexGrow: 1,
    paddingBottom: Spacing.xxl,
  },
  heroSection: {
    alignItems: 'center',
    paddingTop: H * 0.1,
    paddingBottom: Spacing.xl,
  },
  subPrompt: {
    fontSize: FontSizes.xxl,
    fontWeight: '300',
    color: Colors.text,
    textAlign: 'center',
    letterSpacing: 0.2,
    paddingHorizontal: Spacing.xl,
  },
  chipsSection: {
    marginBottom: Spacing.xl,
  },
  chipsRow: {
    paddingHorizontal: Spacing.md,
    gap: Spacing.sm,
    flexDirection: 'row',
  },
  chip: {
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.full,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderWidth: 1,
    borderColor: 'rgba(168,85,247,0.18)',
  },
  chipText: {
    color: Colors.textSecondary,
    fontSize: FontSizes.sm,
    fontWeight: '500',
  },
  inputSection: {
    paddingHorizontal: Spacing.md,
    paddingTop: Spacing.lg,
    position: 'relative',
    overflow: 'hidden',
    minHeight: 120,
    justifyContent: 'center',
  },
  inputPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.full,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderWidth: 1,
    borderColor: 'rgba(168,85,247,0.2)',
    shadowColor: '#A855F7',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 4,
  },
  input: {
    flex: 1,
    color: Colors.text,
    fontSize: FontSizes.md,
    paddingVertical: Spacing.xs,
    paddingHorizontal: Spacing.sm,
  },
  micBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: Spacing.xs,
  },
  sendBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(168,85,247,0.15)',
  },
  sendBtnActive: {
    backgroundColor: Colors.primary,
    shadowColor: '#A855F7',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.6,
    shadowRadius: 10,
    elevation: 6,
  },
});
