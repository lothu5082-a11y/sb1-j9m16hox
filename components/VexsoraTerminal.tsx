/**
 * VexsoraTerminal
 * --------------------------------------------------------------------------
 * The premium "Void Black" terminal chat surface. This is the UI layer and
 * the ONLY thing that touches React Native view primitives. It talks to the
 * engine exclusively through `vexsoraClient`, keeping transport concerns out
 * of the view entirely.
 *
 * Visual language:
 *   • Pure black void background (#000000)
 *   • Neon violet (#8A2BE2) for human / system actions
 *   • Neon emerald (#00FF7F) glow for active AI states
 */

import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  FlatList,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  Animated,
  Easing,
  ActivityIndicator,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ArrowUp, RefreshCw, Cpu } from 'lucide-react-native';
import {
  VexsoraColors as C,
  VexsoraSpacing as S,
  VexsoraRadius as R,
  VexsoraGlow,
  MonoFont,
} from '../constants/vexsoraTheme';
import {
  vexsoraClient,
  type ChatMessage,
  type EngineStatus,
} from '../lib/vexsoraClient';

const SYSTEM_PROMPT =
  'You are Vexsora, a premium offline-first AI assistant running entirely on ' +
  'the user\'s device. Be precise, fast, and helpful.';

type LineRole = 'user' | 'assistant' | 'system';

interface TerminalLine {
  id: string;
  role: LineRole;
  text: string;
}

let _seq = 0;
const nextId = () => `ln_${Date.now()}_${_seq++}`;

const WELCOME: TerminalLine = {
  id: 'welcome',
  role: 'assistant',
  text:
    'Vexsora engine interface ready.\n' +
    'Everything here runs on-device — nothing leaves your machine.',
};

// ── Status pill ───────────────────────────────────────────────────────────────
function StatusPill({ status }: { status: EngineStatus }) {
  const pulse = useRef(new Animated.Value(0)).current;
  const live = status === 'online';

  useEffect(() => {
    if (!live) {
      pulse.stopAnimation();
      pulse.setValue(0);
      return;
    }
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, {
          toValue: 1,
          duration: 1100,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(pulse, {
          toValue: 0,
          duration: 1100,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [live, pulse]);

  const color =
    status === 'online'
      ? C.emerald
      : status === 'offline'
      ? C.danger
      : C.amber;
  const label =
    status === 'online'
      ? 'ENGINE LIVE'
      : status === 'offline'
      ? 'ENGINE OFFLINE'
      : status === 'checking'
      ? 'PROBING…'
      : 'UNKNOWN';

  const dotStyle = {
    opacity: live ? pulse.interpolate({ inputRange: [0, 1], outputRange: [0.4, 1] }) : 1,
    transform: [
      { scale: live ? pulse.interpolate({ inputRange: [0, 1], outputRange: [0.85, 1.25] }) : 1 },
    ],
  };

  return (
    <View style={[styles.pill, { borderColor: color + '55' }]}>
      <Animated.View
        style={[
          styles.dot,
          dotStyle,
          { backgroundColor: color, shadowColor: color },
        ]}
      />
      <Text style={[styles.pillText, { color }]}>{label}</Text>
    </View>
  );
}

// ── Blinking caret (shared) ────────────────────────────────────────────────
function BlinkingCaret() {
  const blink = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(blink, { toValue: 1, duration: 520, useNativeDriver: true }),
        Animated.timing(blink, { toValue: 0, duration: 520, useNativeDriver: true }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [blink]);
  return <Animated.Text style={[styles.cursor, { opacity: blink }]}>▋</Animated.Text>;
}

// ── "Thinking" row — shown only until the first token streams in ───────────────
function ThinkingRow() {
  return (
    <View style={styles.lineRow}>
      <Text style={[styles.glyph, styles.glyphAssistant]}>◆</Text>
      <View style={styles.lineBody}>
        <View style={styles.thinkingRow}>
          <Text style={styles.thinkingText}>thinking</Text>
          <BlinkingCaret />
        </View>
      </View>
    </View>
  );
}

// ── Single terminal line ────────────────────────────────────────────────────
function LineView({ line, active }: { line: TerminalLine; active?: boolean }) {
  if (line.role === 'system') {
    return (
      <View style={styles.diagnostic}>
        <Text style={styles.diagnosticTitle}>⚠ LOCAL ENGINE UNAVAILABLE</Text>
        <Text style={styles.diagnosticBody}>{line.text}</Text>
      </View>
    );
  }

  const isUser = line.role === 'user';
  return (
    <View style={styles.lineRow}>
      <Text style={[styles.glyph, isUser ? styles.glyphUser : styles.glyphAssistant]}>
        {isUser ? '❯' : '◆'}
      </Text>
      <View style={[styles.lineBody, active && styles.lineBodyActive]}>
        {!isUser && <Text style={styles.speaker}>vexsora</Text>}
        {/* Active AI bubble: tokens append in real time, trailed by a live caret. */}
        <Text style={[styles.lineText, isUser && styles.lineTextUser]} selectable>
          {line.text}
          {active && <BlinkingCaret />}
        </Text>
      </View>
    </View>
  );
}

// ── Main terminal ─────────────────────────────────────────────────────────────
export default function VexsoraTerminal() {
  const insets = useSafeAreaInsets();
  const listRef = useRef<FlatList<TerminalLine>>(null);

  const [lines, setLines] = useState<TerminalLine[]>([WELCOME]);
  const [input, setInput] = useState('');
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState<EngineStatus>('unknown');
  // The assistant line currently receiving streamed tokens (null when idle).
  const [streamingId, setStreamingId] = useState<string | null>(null);

  const checkEngine = useCallback(async () => {
    setStatus('checking');
    setStatus(await vexsoraClient.status());
  }, []);

  useEffect(() => {
    checkEngine();
  }, [checkEngine]);

  const scrollToEnd = useCallback(() => {
    requestAnimationFrame(() => listRef.current?.scrollToEnd({ animated: true }));
  }, []);

  const send = useCallback(async () => {
    const text = input.trim();
    if (!text || busy) return;

    const userLine: TerminalLine = { id: nextId(), role: 'user', text };
    setLines((prev) => [...prev, userLine]);
    setInput('');
    setBusy(true);

    const aiId = nextId();
    setStreamingId(aiId);

    // Build history (assistant + user turns only) for the engine.
    const history: ChatMessage[] = [...lines, userLine]
      .filter((l) => l.role === 'user' || l.role === 'assistant')
      .map((l) => ({ role: l.role as 'user' | 'assistant', content: l.text }));

    // Create the assistant line on the first token, then keep updating it in
    // place so streamed tokens land in the active bubble immediately.
    const upsertAssistant = (content: string) =>
      setLines((prev) =>
        prev.some((l) => l.id === aiId)
          ? prev.map((l) => (l.id === aiId ? { ...l, text: content } : l))
          : [...prev, { id: aiId, role: 'assistant', text: content }]
      );

    const result = await vexsoraClient.chatStream(history, {
      systemPrompt: SYSTEM_PROMPT,
      onToken: (_delta, full) => upsertAssistant(full),
    });

    if (result.ok) {
      setStatus('online');
      upsertAssistant(result.content);
    } else {
      // The client already produced a clean, non-crashing diagnostic message.
      // Any partial text already streamed into the bubble is left intact.
      if (result.reason === 'offline' || result.reason === 'timeout') setStatus('offline');
      setLines((prev) => [...prev, { id: nextId(), role: 'system', text: result.message }]);
    }
    setStreamingId(null);
    setBusy(false);
  }, [input, busy, lines]);

  const canSend = input.trim().length > 0 && !busy;
  // Show the "thinking" footer only while waiting for the very first token.
  const awaitingFirstToken =
    busy && streamingId !== null && !lines.some((l) => l.id === streamingId);

  return (
    <View style={styles.root}>
      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top + S.sm }]}>
        <View style={styles.brandRow}>
          <View style={styles.logoMark}>
            <Cpu size={16} color={C.violet} />
          </View>
          <View>
            <Text style={styles.brand}>VEXSORA</Text>
            <Text style={styles.brandSub}>offline · 127.0.0.1:8080</Text>
          </View>
        </View>
        <TouchableOpacity
          onPress={checkEngine}
          activeOpacity={0.7}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <StatusPill status={status} />
        </TouchableOpacity>
      </View>
      <View style={styles.headerRule} />

      {/* Conversation */}
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={insets.top}
      >
        <FlatList
          ref={listRef}
          data={lines}
          keyExtractor={(l) => l.id}
          renderItem={({ item }) => (
            <LineView line={item} active={item.id === streamingId} />
          )}
          contentContainerStyle={styles.listContent}
          ListFooterComponent={awaitingFirstToken ? <ThinkingRow /> : null}
          onContentSizeChange={scrollToEnd}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          removeClippedSubviews={Platform.OS === 'android'}
          initialNumToRender={20}
          windowSize={11}
        />

        {/* Offline retry affordance */}
        {status === 'offline' && !busy && (
          <TouchableOpacity style={styles.retry} onPress={checkEngine} activeOpacity={0.8}>
            <RefreshCw size={13} color={C.violet} />
            <Text style={styles.retryText}>Re-probe local engine</Text>
          </TouchableOpacity>
        )}

        {/* Composer */}
        <View style={[styles.composer, { paddingBottom: insets.bottom + S.sm }]}>
          <View style={styles.composerRule} />
          <View style={styles.inputRow}>
            <Text style={styles.prompt}>❯</Text>
            <TextInput
              style={styles.input}
              value={input}
              onChangeText={setInput}
              placeholder="message the local engine…"
              placeholderTextColor={C.textFaint}
              multiline
              editable={!busy}
              onSubmitEditing={send}
              blurOnSubmit={false}
              selectionColor={C.violet}
              cursorColor={C.violet}
            />
            <TouchableOpacity
              style={[styles.sendBtn, canSend ? styles.sendBtnActive : styles.sendBtnIdle]}
              onPress={send}
              disabled={!canSend}
              activeOpacity={0.8}
            >
              {busy ? (
                <ActivityIndicator size="small" color={C.emerald} />
              ) : (
                <ArrowUp size={18} color={canSend ? C.void : C.textFaint} />
              )}
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: C.void },
  flex: { flex: 1 },

  // Header
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: S.lg,
    paddingBottom: S.sm,
    backgroundColor: C.void,
  },
  brandRow: { flexDirection: 'row', alignItems: 'center', gap: S.sm },
  logoMark: {
    width: 34,
    height: 34,
    borderRadius: R.md,
    backgroundColor: C.violetDim,
    borderWidth: 1,
    borderColor: C.violet + '66',
    alignItems: 'center',
    justifyContent: 'center',
    ...VexsoraGlow.violet,
    shadowOpacity: 0.5,
    shadowRadius: 10,
  },
  brand: {
    color: C.text,
    fontSize: 16,
    fontWeight: '800',
    letterSpacing: 3,
    fontFamily: MonoFont,
  },
  brandSub: {
    color: C.textDim,
    fontSize: 10,
    letterSpacing: 1,
    fontFamily: MonoFont,
    marginTop: 1,
  },
  headerRule: { height: 1, backgroundColor: C.border },

  // Status pill
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: R.pill,
    borderWidth: 1,
    backgroundColor: C.surface,
  },
  dot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.9,
    shadowRadius: 6,
    elevation: 4,
  },
  pillText: { fontSize: 9, fontWeight: '700', letterSpacing: 1, fontFamily: MonoFont },

  // List
  listContent: { paddingVertical: S.lg, paddingHorizontal: S.lg, gap: S.lg },
  lineRow: { flexDirection: 'row', alignItems: 'flex-start', gap: S.sm },
  glyph: { fontSize: 14, fontFamily: MonoFont, lineHeight: 22, marginTop: 1 },
  glyphUser: { color: C.violet },
  glyphAssistant: { color: C.emerald },
  lineBody: { flex: 1 },
  lineBodyActive: {
    backgroundColor: C.emeraldDim,
    borderRadius: R.md,
    borderWidth: 1,
    borderColor: C.emerald + '40',
    paddingHorizontal: S.sm,
    paddingVertical: 8,
    ...VexsoraGlow.emerald,
    shadowOpacity: 0.35,
    shadowRadius: 10,
  },
  speaker: {
    color: C.emerald,
    fontSize: 10,
    letterSpacing: 1.5,
    fontFamily: MonoFont,
    marginBottom: 3,
    opacity: 0.8,
  },
  lineText: {
    color: C.text,
    fontSize: 14,
    lineHeight: 22,
    fontFamily: MonoFont,
  },
  lineTextUser: { color: C.textDim },

  // Thinking
  thinkingRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  thinkingText: {
    color: C.emerald,
    fontSize: 14,
    fontFamily: MonoFont,
    opacity: 0.7,
  },
  cursor: { color: C.emerald, fontSize: 14, fontFamily: MonoFont },

  // Diagnostic (engine offline)
  diagnostic: {
    borderWidth: 1,
    borderColor: C.danger + '55',
    backgroundColor: C.dangerDim,
    borderRadius: R.md,
    padding: S.md,
    gap: 6,
  },
  diagnosticTitle: {
    color: C.danger,
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 1,
    fontFamily: MonoFont,
  },
  diagnosticBody: {
    color: C.text,
    fontSize: 13,
    lineHeight: 20,
    fontFamily: MonoFont,
    opacity: 0.9,
  },

  // Retry
  retry: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginHorizontal: S.lg,
    marginBottom: S.sm,
    paddingVertical: 10,
    borderRadius: R.md,
    borderWidth: 1,
    borderColor: C.violet + '55',
    backgroundColor: C.violetDim,
  },
  retryText: {
    color: C.violetBright,
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0.5,
    fontFamily: MonoFont,
  },

  // Composer
  composer: { backgroundColor: C.void, paddingHorizontal: S.lg, paddingTop: S.sm },
  composerRule: { height: 1, backgroundColor: C.border, marginBottom: S.md },
  inputRow: { flexDirection: 'row', alignItems: 'flex-end', gap: S.sm },
  prompt: {
    color: C.violet,
    fontSize: 16,
    fontFamily: MonoFont,
    lineHeight: 38,
  },
  input: {
    flex: 1,
    color: C.text,
    fontSize: 14,
    fontFamily: MonoFont,
    maxHeight: 120,
    minHeight: 38,
    paddingTop: Platform.OS === 'ios' ? 10 : 6,
    paddingBottom: Platform.OS === 'ios' ? 10 : 6,
  },
  sendBtn: {
    width: 38,
    height: 38,
    borderRadius: R.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sendBtnIdle: {
    backgroundColor: C.surfaceAlt,
    borderWidth: 1,
    borderColor: C.border,
  },
  sendBtnActive: {
    backgroundColor: C.violet,
    ...VexsoraGlow.violet,
  },
});
