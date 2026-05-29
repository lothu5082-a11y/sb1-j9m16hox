import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  Dimensions,
  Platform,
  KeyboardAvoidingView,
  ScrollView,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withRepeat,
  withSequence,
  Easing,
  FadeInUp,
} from 'react-native-reanimated';
import { Plus, Mic, Send, ChevronDown, Settings } from 'lucide-react-native';
import { router } from 'expo-router';
import { Colors, Spacing, FontSizes, BorderRadius } from '../../constants/theme';
import { setPendingCommand } from './chat';

const { width: W, height: H } = Dimensions.get('window');

const PROMPTS = [
  'Any new ideas to explore?',
  'What can I help you with?',
  'Something on your mind?',
  "Let's think together.",
  'What would you like to create?',
  'Ask me anything.',
  'Ready when you are.',
  'How can I assist today?',
];

const QUICK_CHIPS = [
  { label: '💡 Inspire me', cmd: 'Inspire me' },
  { label: '📝 Write email', cmd: 'Draft an email to my boss about taking tomorrow off' },
  { label: '🔐 Password', cmd: 'Password 16' },
  { label: '🌦️ Weather', cmd: 'Weather in London' },
  { label: '😂 Tell a joke', cmd: 'Tell me a joke' },
  { label: '⚛️ My level', cmd: '/evolve' },
  { label: '🧠 Memories', cmd: '/memory' },
  { label: '📰 News', cmd: 'News' },
];

// ── Gemini 4-pointed star ─────────────────────────────────────────────────────
function GeminiStar({ size = 52 }: { size?: number }) {
  const scale = useSharedValue(1);
  useEffect(() => {
    scale.value = withRepeat(
      withSequence(
        withTiming(1.07, { duration: 2200, easing: Easing.inOut(Easing.ease) }),
        withTiming(0.93, { duration: 2200, easing: Easing.inOut(Easing.ease) })
      ), -1, false
    );
  }, []);
  const aStyle = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));

  if (Platform.OS === 'web') {
    const Svg = 'svg' as any;
    const Path = 'path' as any;
    const Defs = 'defs' as any;
    const LG = 'linearGradient' as any;
    const Stop = 'stop' as any;
    return (
      <Animated.View style={[{ width: size, height: size }, aStyle]}>
        <Svg width={size} height={size} viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
          <Defs>
            <LG id="gs1" x1="0%" y1="0%" x2="100%" y2="100%">
              <Stop offset="0%"   stopColor="#4285F4" />
              <Stop offset="33%"  stopColor="#EA4335" />
              <Stop offset="66%"  stopColor="#FBBC05" />
              <Stop offset="100%" stopColor="#34A853" />
            </LG>
          </Defs>
          <Path
            d="M50,0 C52,20 80,48 100,50 C80,52 52,80 50,100 C48,80 20,52 0,50 C20,48 48,20 50,0 Z"
            fill="url(#gs1)"
          />
        </Svg>
      </Animated.View>
    );
  }

  // Native fallback — two overlapping bars
  return (
    <Animated.View style={[{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }, aStyle]}>
      <View style={{ position: 'absolute', width: size * 0.22, height: size, borderRadius: size * 0.11, backgroundColor: '#4285F4' }} />
      <View style={{ position: 'absolute', width: size, height: size * 0.22, borderRadius: size * 0.11, backgroundColor: '#EA4335' }} />
    </Animated.View>
  );
}

// ── Fading rotating prompt ────────────────────────────────────────────────────
function RotatingPrompt() {
  const [idx, setIdx] = useState(0);
  const opacity = useSharedValue(1);
  useEffect(() => {
    const t = setInterval(() => {
      opacity.value = withTiming(0, { duration: 320 });
      setTimeout(() => {
        setIdx(i => (i + 1) % PROMPTS.length);
        opacity.value = withTiming(1, { duration: 320 });
      }, 360);
    }, 3600);
    return () => clearInterval(t);
  }, []);
  const aStyle = useAnimatedStyle(() => ({ opacity: opacity.value }));
  return (
    <Animated.Text style={[st.prompt, aStyle]} numberOfLines={2}>
      {PROMPTS[idx]}
    </Animated.Text>
  );
}

// ── Sparkle dot field ─────────────────────────────────────────────────────────
function SparklePattern() {
  const [dots] = useState(() => {
    const res: { x: number; y: number; s: number; o: number }[] = [];
    const cols = 20;
    const rows = 7;
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        if (Math.random() > 0.52) {
          res.push({
            x: (c / cols) * W + (Math.random() - 0.5) * (W / cols),
            y: r * 13 + Math.random() * 6,
            s: 1.5 + Math.random() * 2,
            o: 0.08 + Math.random() * 0.3,
          });
        }
      }
    }
    return res;
  });
  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      {dots.map((d, i) => (
        <View key={i} style={{
          position: 'absolute', left: d.x, top: d.y,
          width: d.s, height: d.s, borderRadius: d.s / 2,
          backgroundColor: '#A855F7', opacity: d.o,
        }} />
      ))}
    </View>
  );
}

// ── Input bar ─────────────────────────────────────────────────────────────────
function InputBar({ value, onChange, onSend, onMic }: {
  value: string;
  onChange: (t: string) => void;
  onSend: () => void;
  onMic?: () => void;
}) {
  const [focused, setFocused] = useState(false);
  const hasText = value.trim().length > 0;
  return (
    <View style={[st.inputBar, focused && st.inputBarFocused]}>
      <TouchableOpacity style={st.plusBtn} onPress={() => onChange('')}>
        <Plus color="rgba(255,255,255,0.50)" size={21} />
      </TouchableOpacity>
      <TextInput
        style={st.inputField}
        value={value}
        onChangeText={onChange}
        placeholder="Ask Riuka..."
        placeholderTextColor="rgba(255,255,255,0.25)"
        multiline
        returnKeyType="send"
        onSubmitEditing={onSend}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
      />
      <TouchableOpacity style={st.micBtn} onPress={onMic}>
        <Mic color="rgba(255,255,255,0.50)" size={19} />
      </TouchableOpacity>
      <TouchableOpacity
        style={[st.waveBtn, hasText && st.waveBtnSend]}
        onPress={hasText ? onSend : undefined}
        activeOpacity={0.8}
      >
        {hasText ? (
          <Send color="#fff" size={17} />
        ) : (
          <View style={st.waveform}>
            {[0.4, 0.9, 1, 0.9, 0.4].map((h, i) => (
              <View key={i} style={[st.waveBar, { height: 14 * h }]} />
            ))}
          </View>
        )}
      </TouchableOpacity>
    </View>
  );
}

// ── Main screen ───────────────────────────────────────────────────────────────
export default function AskScreen() {
  const [text, setText] = useState('');

  const send = () => {
    const q = text.trim();
    if (!q) return;
    setPendingCommand(q);
    setText('');
    router.push('/chat' as any);
  };

  const sendChip = (cmd: string) => {
    setPendingCommand(cmd);
    router.push('/chat' as any);
  };

  return (
    <KeyboardAvoidingView
      style={st.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      {/* Pure black base */}
      <View style={[StyleSheet.absoluteFill, { backgroundColor: '#050508' }]} />

      {/* Bottom blue-purple glow */}
      <LinearGradient
        colors={['transparent', 'rgba(40,30,100,0.30)', 'rgba(20,20,80,0.60)']}
        locations={[0, 0.5, 1]}
        style={st.bottomGlow}
        pointerEvents="none"
      />

      {/* Sparkle field sits just above the input */}
      <View style={st.sparkleZone} pointerEvents="none">
        <SparklePattern />
      </View>

      {/* Header */}
      <View style={st.header}>
        <View style={st.hamburger}>
          {[0, 1, 2].map(i => <View key={i} style={st.hLine} />)}
        </View>
        <TouchableOpacity style={st.modelPill} activeOpacity={0.7}>
          <Text style={st.modelText}>Riuka AI</Text>
          <ChevronDown color="rgba(255,255,255,0.45)" size={13} />
        </TouchableOpacity>
        <TouchableOpacity onPress={() => router.push('/settings' as any)} style={st.editBtn}>
          <Settings color="rgba(255,255,255,0.50)" size={19} />
        </TouchableOpacity>
      </View>

      {/* Center: star + rotating prompt */}
      <View style={st.center}>
        <GeminiStar size={56} />
        <View style={{ height: 30 }} />
        <RotatingPrompt />
      </View>

      {/* Suggestion chips */}
      <Animated.View entering={FadeInUp.duration(500).delay(150)} style={st.chipsWrap}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={st.chipsRow}>
          {QUICK_CHIPS.map((c) => (
            <TouchableOpacity key={c.cmd} style={st.chip} onPress={() => sendChip(c.cmd)} activeOpacity={0.7}>
              <Text style={st.chipText}>{c.label}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </Animated.View>

      {/* Bottom pill input */}
      <Animated.View entering={FadeInUp.duration(400).delay(80)} style={st.inputWrap}>
        <InputBar value={text} onChange={setText} onSend={send} />
      </Animated.View>
    </KeyboardAvoidingView>
  );
}

const st = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#050508' },

  bottomGlow: {
    position: 'absolute', left: 0, right: 0, bottom: 0, height: H * 0.45,
  },

  sparkleZone: {
    position: 'absolute', left: 0, right: 0,
    bottom: 170, height: 95,
    overflow: 'hidden',
  },

  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.xxxl + Spacing.sm,
    paddingBottom: Spacing.md,
  },
  hamburger: { gap: 4, padding: 6 },
  hLine: { width: 20, height: 1.5, backgroundColor: 'rgba(255,255,255,0.45)', borderRadius: 1 },
  modelPill: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  modelText: { fontSize: FontSizes.md, fontWeight: '600', color: 'rgba(255,255,255,0.85)' },
  editBtn: { padding: 6 },

  center: {
    flex: 1, alignItems: 'center', justifyContent: 'center',
    paddingHorizontal: Spacing.xl, paddingBottom: 60,
  },
  prompt: {
    fontSize: 28, fontWeight: '400', color: '#ffffff',
    textAlign: 'center', lineHeight: 38, letterSpacing: -0.3,
  },

  chipsWrap: { paddingBottom: Spacing.md },
  chipsRow: { paddingHorizontal: Spacing.lg, gap: Spacing.sm, flexDirection: 'row' },
  chip: {
    backgroundColor: 'rgba(255,255,255,0.07)',
    borderRadius: BorderRadius.full,
    paddingHorizontal: 14, paddingVertical: 8,
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.10)',
  },
  chipText: { fontSize: FontSizes.sm, color: 'rgba(255,255,255,0.75)', fontWeight: '500' },

  inputWrap: {
    paddingHorizontal: Spacing.md,
    paddingBottom: Platform.OS === 'ios' ? 30 : Spacing.lg + 10,
  },
  inputBar: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderRadius: 36, paddingVertical: 10, paddingHorizontal: 6,
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)',
    minHeight: 58,
  },
  inputBarFocused: {
    borderColor: 'rgba(168,85,247,0.40)',
    backgroundColor: 'rgba(255,255,255,0.10)',
  },
  plusBtn: { paddingHorizontal: 12, paddingVertical: 6 },
  inputField: {
    flex: 1, color: '#ffffff',
    fontSize: FontSizes.md, maxHeight: 120,
    paddingVertical: 4,
  },
  micBtn: { paddingHorizontal: 10, paddingVertical: 6 },
  waveBtn: {
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: 'rgba(59,130,246,0.55)',
    alignItems: 'center', justifyContent: 'center',
    marginRight: 4,
  },
  waveBtnSend: { backgroundColor: '#3B82F6' },
  waveform: { flexDirection: 'row', alignItems: 'center', gap: 2 },
  waveBar: { width: 2.5, backgroundColor: '#fff', borderRadius: 2, opacity: 0.85 },
});
