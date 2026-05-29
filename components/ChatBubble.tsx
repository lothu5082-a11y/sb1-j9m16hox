import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Platform } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, {
  FadeInUp,
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withSequence,
  withTiming,
  Easing,
  interpolate,
} from 'react-native-reanimated';
import { Copy, Check, Volume2, VolumeX } from 'lucide-react-native';
import { Colors, Spacing, FontSizes, BorderRadius } from '../constants/theme';

interface ChatBubbleProps {
  message: string;
  isUser: boolean;
  time?: string;
  type?: 'text' | 'image' | 'voice';
  isStreaming?: boolean;
  onSpeak?: () => void;
  onStopSpeak?: () => void;
  isSpeaking?: boolean;
}

// ── Inline markdown parser ────────────────────────────────────────────────────
type Seg = { text: string; bold?: boolean; italic?: boolean; code?: boolean };

function parseInline(raw: string): Seg[] {
  const segs: Seg[] = [];
  let i = 0;
  let plain = '';
  const flush = () => { if (plain) { segs.push({ text: plain }); plain = ''; } };

  while (i < raw.length) {
    if (raw[i] === '*' && raw[i + 1] === '*') {
      const end = raw.indexOf('**', i + 2);
      if (end !== -1) { flush(); segs.push({ text: raw.slice(i + 2, end), bold: true }); i = end + 2; continue; }
    }
    if (raw[i] === '`' && raw[i + 1] !== '`') {
      const end = raw.indexOf('`', i + 1);
      if (end !== -1) { flush(); segs.push({ text: raw.slice(i + 1, end), code: true }); i = end + 1; continue; }
    }
    if (raw[i] === '*' && raw[i + 1] !== '*') {
      const end = raw.indexOf('*', i + 1);
      if (end !== -1 && raw[end + 1] !== '*') { flush(); segs.push({ text: raw.slice(i + 1, end), italic: true }); i = end + 1; continue; }
    }
    plain += raw[i];
    i++;
  }
  flush();
  return segs.length ? segs : [{ text: raw }];
}

// ── Block parser ──────────────────────────────────────────────────────────────
type Block =
  | { type: 'para'; lines: string[] }
  | { type: 'h1' | 'h2' | 'h3'; content: string }
  | { type: 'ul' | 'ol'; items: string[] }
  | { type: 'code'; content: string; lang: string }
  | { type: 'hr' };

function parseBlocks(text: string): Block[] {
  const lines = text.split('\n');
  const blocks: Block[] = [];
  let i = 0;

  while (i < lines.length) {
    const line = lines[i].trimStart();

    if (line.startsWith('```')) {
      const lang = line.slice(3).trim();
      const code: string[] = [];
      i++;
      while (i < lines.length && !lines[i].trimStart().startsWith('```')) { code.push(lines[i]); i++; }
      blocks.push({ type: 'code', content: code.join('\n'), lang });
      i++;
      continue;
    }

    const hm = line.match(/^(#{1,3})\s+(.+)/);
    if (hm) {
      const lv = hm[1].length;
      blocks.push({ type: lv === 1 ? 'h1' : lv === 2 ? 'h2' : 'h3', content: hm[2] });
      i++;
      continue;
    }

    if (/^[\-\*•]\s/.test(line)) {
      const items: string[] = [];
      while (i < lines.length && /^[\-\*•]\s/.test(lines[i].trimStart())) {
        items.push(lines[i].trimStart().replace(/^[\-\*•]\s/, ''));
        i++;
      }
      blocks.push({ type: 'ul', items });
      continue;
    }

    if (/^\d+[.)]\s/.test(line)) {
      const items: string[] = [];
      while (i < lines.length && /^\d+[.)]\s/.test(lines[i].trimStart())) {
        items.push(lines[i].trimStart().replace(/^\d+[.)]\s/, ''));
        i++;
      }
      blocks.push({ type: 'ol', items });
      continue;
    }

    if (/^[-─═]{3,}$/.test(line.trim())) { blocks.push({ type: 'hr' }); i++; continue; }
    if (line.trim() === '') { i++; continue; }

    const paraLines: string[] = [];
    while (
      i < lines.length &&
      lines[i].trim() !== '' &&
      !/^#{1,3}\s/.test(lines[i].trimStart()) &&
      !lines[i].trimStart().startsWith('```') &&
      !/^[\-\*•]\s/.test(lines[i].trimStart()) &&
      !/^\d+[.)]\s/.test(lines[i].trimStart()) &&
      !/^[-─═]{3,}$/.test(lines[i].trim())
    ) { paraLines.push(lines[i]); i++; }

    if (paraLines.length) blocks.push({ type: 'para', lines: paraLines });
  }
  return blocks;
}

// ── InlineText ────────────────────────────────────────────────────────────────
function InlineText({ text, style }: { text: string; style?: any }) {
  const segs = parseInline(text);
  return (
    <Text style={style}>
      {segs.map((s, i) => {
        if (s.bold)   return <Text key={i} style={mdStyles.bold}>{s.text}</Text>;
        if (s.code)   return <Text key={i} style={mdStyles.inlineCode}>{s.text}</Text>;
        if (s.italic) return <Text key={i} style={mdStyles.italic}>{s.text}</Text>;
        return <Text key={i}>{s.text}</Text>;
      })}
    </Text>
  );
}

// ── CodeBlock ─────────────────────────────────────────────────────────────────
function CodeBlock({ content, lang }: { content: string; lang: string }) {
  const [copied, setCopied] = useState(false);
  const copy = () => {
    if (Platform.OS === 'web' && (navigator as any)?.clipboard) {
      (navigator as any).clipboard.writeText(content).then(() => {
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      });
    }
  };
  return (
    <View style={mdStyles.codeBlock}>
      <View style={mdStyles.codeHeader}>
        <Text style={mdStyles.codeLang}>{lang || 'code'}</Text>
        <TouchableOpacity onPress={copy} hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}>
          {copied
            ? <Check size={11} color={Colors.secondary} />
            : <Copy size={11} color={Colors.textTertiary} />}
        </TouchableOpacity>
      </View>
      <Text style={mdStyles.codeText} selectable>{content}</Text>
    </View>
  );
}

// ── MarkdownMessage ───────────────────────────────────────────────────────────
function MarkdownMessage({ text, isStreaming = false }: { text: string; isStreaming?: boolean }) {
  const blocks = parseBlocks(text);

  return (
    <View>
      {blocks.map((block, bi) => {
        const gap = bi > 0 ? mdStyles.blockGap : undefined;

        if (block.type === 'code')
          return <View key={bi} style={gap}><CodeBlock content={block.content} lang={block.lang} /></View>;

        if (block.type === 'h1' || block.type === 'h2' || block.type === 'h3') {
          const hs = block.type === 'h1' ? mdStyles.h1 : block.type === 'h2' ? mdStyles.h2 : mdStyles.h3;
          return <View key={bi} style={gap}><InlineText text={block.content} style={hs} /></View>;
        }

        if (block.type === 'ul')
          return (
            <View key={bi} style={gap}>
              {block.items.map((item, ii) => (
                <View key={ii} style={mdStyles.listRow}>
                  <Text style={mdStyles.bullet}>•</Text>
                  <View style={{ flex: 1 }}><InlineText text={item} style={mdStyles.body} /></View>
                </View>
              ))}
            </View>
          );

        if (block.type === 'ol')
          return (
            <View key={bi} style={gap}>
              {block.items.map((item, ii) => (
                <View key={ii} style={mdStyles.listRow}>
                  <Text style={mdStyles.olNum}>{ii + 1}.</Text>
                  <View style={{ flex: 1 }}><InlineText text={item} style={mdStyles.body} /></View>
                </View>
              ))}
            </View>
          );

        if (block.type === 'hr')
          return <View key={bi} style={[mdStyles.hr, gap]} />;

        // Paragraph
        if (block.type !== 'para') return null;
        const content = block.lines.join('\n');
        const isLast = bi === blocks.length - 1;
        return (
          <View key={bi} style={gap}>
            <InlineText text={isLast && isStreaming ? content + '▋' : content} style={mdStyles.body} />
          </View>
        );
      })}

      {isStreaming && blocks.length === 0 && <Text style={mdStyles.body}>▋</Text>}
    </View>
  );
}

// ── Shimmer ───────────────────────────────────────────────────────────────────
function ShimmerLine() {
  const pos = useSharedValue(-1);
  useEffect(() => {
    pos.value = withRepeat(withTiming(2, { duration: 3200, easing: Easing.inOut(Easing.ease) }), -1, false);
  }, []);
  const style = useAnimatedStyle(() => ({
    transform: [{ translateX: `${pos.value * 100}%` as any }],
    opacity: interpolate(pos.value, [-1, 0, 0.5, 1, 2], [0, 0.8, 1, 0.8, 0]),
  }));
  return (
    <Animated.View style={[StyleSheet.absoluteFill, { overflow: 'hidden' }]} pointerEvents="none">
      <Animated.View style={[styles.shimmer, style]} />
    </Animated.View>
  );
}

// ── ChatBubble ────────────────────────────────────────────────────────────────
export default function ChatBubble({
  message, isUser, time, type = 'text', isStreaming = false,
  onSpeak, onStopSpeak, isSpeaking = false,
}: ChatBubbleProps) {
  const [copied, setCopied] = useState(false);

  const copyMessage = async () => {
    if (!message) return;
    try {
      if (Platform.OS === 'web' && (navigator as any)?.clipboard)
        await (navigator as any).clipboard.writeText(message);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {}
  };

  return (
    <Animated.View
      entering={FadeInUp.duration(280).springify()}
      style={[styles.container, isUser ? styles.userContainer : styles.assistantContainer]}
    >
      {!isUser && (
        <View style={[styles.avatar, isSpeaking && styles.avatarSpeaking]}>
          <Text style={styles.avatarText}>R</Text>
        </View>
      )}
      <View style={styles.bubbleWrapper}>
        {!isUser && <Text style={styles.senderLabel}>Riuka AI</Text>}

        {isUser ? (
          <LinearGradient
            colors={[Colors.primary, Colors.primaryDark]}
            start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
            style={[styles.bubble, styles.userBubble]}
          >
            <Text style={[styles.message, styles.userMessage]}>{message}</Text>
            {time && <Text style={[styles.time, styles.userTime]}>{time}</Text>}
          </LinearGradient>
        ) : (
          <View style={[styles.bubble, styles.assistantBubble, isSpeaking && styles.assistantBubbleSpeaking]}>
            <ShimmerLine />
            <MarkdownMessage text={message} isStreaming={isStreaming} />
            {time && !isStreaming && <Text style={[styles.time, styles.assistantTime]}>{time}</Text>}
          </View>
        )}

        {!isUser && message.length > 0 && !isStreaming && (
          <View style={styles.actionRow}>
            <TouchableOpacity style={styles.actionBtn} onPress={copyMessage} activeOpacity={0.7}>
              {copied
                ? <Check color={Colors.secondary} size={11} />
                : <Copy color={Colors.textTertiary} size={11} />}
              <Text style={[styles.actionText, copied && styles.actionTextDone]}>
                {copied ? 'Copied!' : 'Copy'}
              </Text>
            </TouchableOpacity>

            {(onSpeak || onStopSpeak) && (
              <TouchableOpacity
                style={[styles.actionBtn, isSpeaking && styles.actionBtnActive]}
                onPress={isSpeaking ? onStopSpeak : onSpeak}
                activeOpacity={0.7}
              >
                {isSpeaking
                  ? <VolumeX color={Colors.primary} size={11} />
                  : <Volume2 color={Colors.textTertiary} size={11} />}
                <Text style={[styles.actionText, isSpeaking && styles.actionTextActive]}>
                  {isSpeaking ? 'Stop' : 'Speak'}
                </Text>
              </TouchableOpacity>
            )}
          </View>
        )}
      </View>
    </Animated.View>
  );
}

// ── Markdown styles ───────────────────────────────────────────────────────────
const mdStyles = StyleSheet.create({
  body:        { fontSize: FontSizes.md, color: Colors.text, lineHeight: 22 },
  h1:          { fontSize: 20, fontWeight: '800', color: Colors.text, lineHeight: 28 },
  h2:          { fontSize: FontSizes.lg, fontWeight: '700', color: Colors.text, lineHeight: 26 },
  h3:          { fontSize: FontSizes.md, fontWeight: '700', color: Colors.primary, lineHeight: 22 },
  bold:        { fontWeight: '700', color: Colors.text },
  italic:      { fontStyle: 'italic' },
  inlineCode:  {
    fontFamily: Platform.OS === 'web' ? 'monospace' : 'Courier New',
    fontSize: FontSizes.sm,
    backgroundColor: 'rgba(168,85,247,0.12)',
    color: Colors.primary,
    paddingHorizontal: 3,
    borderRadius: 3,
  },
  blockGap:    { marginTop: 8 },
  listRow:     { flexDirection: 'row', alignItems: 'flex-start', marginTop: 3 },
  bullet:      { color: Colors.primary, fontSize: FontSizes.md, lineHeight: 22, width: 16 },
  olNum:       { color: Colors.primary, fontSize: FontSizes.sm, lineHeight: 22, width: 22, fontWeight: '600' },
  hr:          { height: 1, backgroundColor: Colors.border, marginVertical: 6 },
  codeBlock:   {
    backgroundColor: '#080810',
    borderRadius: 8,
    overflow: 'hidden',
    marginTop: 4,
    borderWidth: 1,
    borderColor: 'rgba(168,85,247,0.22)',
  },
  codeHeader:  {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(168,85,247,0.15)',
    backgroundColor: 'rgba(168,85,247,0.07)',
  },
  codeLang:    {
    fontSize: 10,
    color: Colors.primary,
    fontWeight: '600',
    fontFamily: Platform.OS === 'web' ? 'monospace' : 'Courier New',
  },
  codeText:    {
    fontFamily: Platform.OS === 'web' ? 'monospace' : 'Courier New',
    fontSize: 13,
    color: '#e2e8f0',
    lineHeight: 20,
    padding: 10,
  },
});

// ── Bubble styles ─────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    marginBottom: Spacing.md,
    paddingHorizontal: Spacing.lg,
  },
  userContainer:      { justifyContent: 'flex-end' },
  assistantContainer: { justifyContent: 'flex-start', alignItems: 'flex-start' },
  avatar: {
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: 'rgba(168, 85, 247, 0.15)',
    borderWidth: 1.5, borderColor: Colors.primary,
    alignItems: 'center', justifyContent: 'center',
    marginRight: Spacing.sm, marginTop: 14,
    shadowColor: Colors.primary, shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.5, shadowRadius: 8, elevation: 4,
  },
  avatarSpeaking: {
    borderColor: Colors.secondary,
    backgroundColor: 'rgba(16, 185, 129, 0.15)',
    shadowColor: Colors.secondary,
  },
  avatarText:   { fontSize: FontSizes.sm, fontWeight: '700', color: Colors.primary },
  bubbleWrapper: { maxWidth: '80%' },
  senderLabel: {
    fontSize: FontSizes.xs, color: Colors.textTertiary,
    fontWeight: '500', marginBottom: 3, marginLeft: 2,
  },
  bubble: {
    borderRadius: BorderRadius.lg,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.md,
  },
  userBubble: {
    borderBottomRightRadius: Spacing.xs,
    shadowColor: Colors.primary, shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3, shadowRadius: 8, elevation: 4,
  },
  shimmer: {
    position: 'absolute', top: 0, bottom: 0, width: '40%',
    backgroundColor: 'rgba(168,85,247,0.06)', borderRadius: 4,
  },
  assistantBubble: {
    backgroundColor: Colors.surface,
    borderWidth: 1, borderColor: Colors.border,
    borderBottomLeftRadius: Spacing.xs,
    overflow: 'hidden',
  },
  assistantBubbleSpeaking: {
    borderColor: Colors.secondary + '60',
    backgroundColor: 'rgba(16, 185, 129, 0.04)',
  },
  message:        { fontSize: FontSizes.md, lineHeight: 22 },
  userMessage:    { color: '#ffffff', fontWeight: '500' },
  time:           { fontSize: FontSizes.xs, marginTop: Spacing.xs },
  userTime:       { color: 'rgba(255, 255, 255, 0.5)', textAlign: 'right' },
  assistantTime:  { color: Colors.textTertiary },
  actionRow: {
    flexDirection: 'row', alignItems: 'center',
    gap: Spacing.md, marginTop: 4, marginLeft: 4,
  },
  actionBtn:       { flexDirection: 'row', alignItems: 'center', gap: 3, paddingVertical: 2 },
  actionBtnActive: { opacity: 0.9 },
  actionText:      { fontSize: 10, color: Colors.textTertiary, fontWeight: '500' },
  actionTextDone:  { color: Colors.secondary },
  actionTextActive:{ color: Colors.primary },
});
