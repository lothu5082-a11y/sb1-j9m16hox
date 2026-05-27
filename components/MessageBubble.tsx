import React, { useState } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, ScrollView,
  Clipboard, Share, Alert,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Copy, RefreshCw, Share2, Check, Code, User, Sparkles } from 'lucide-react-native';
import { Colors, Spacing, FontSizes, BorderRadius } from '../constants/theme';

export interface DisplayMessage {
  id: string;
  text: string;
  isUser: boolean;
  time: string;
  status?: 'sending' | 'sent' | 'error';
}

interface MessageBubbleProps {
  message: DisplayMessage;
  onRegenerate?: () => void;
}

// ── Inline markdown ──────────────────────────────────────────────────────────

function renderInline(text: string, baseStyle: object, keyPrefix: string) {
  // patterns: **bold**, *italic*, `code`, ~~strike~~
  const parts = text.split(/(\*\*[^*]+\*\*|\*[^*]+\*|`[^`]+`|~~[^~]+~~)/g);
  return parts.map((part, i) => {
    const key = `${keyPrefix}-${i}`;
    if (part.startsWith('**') && part.endsWith('**'))
      return <Text key={key} style={[baseStyle, styles.bold]}>{part.slice(2, -2)}</Text>;
    if (part.startsWith('*') && part.endsWith('*'))
      return <Text key={key} style={[baseStyle, styles.italic]}>{part.slice(1, -1)}</Text>;
    if (part.startsWith('`') && part.endsWith('`'))
      return <Text key={key} style={[baseStyle, styles.inlineCode]}>{part.slice(1, -1)}</Text>;
    if (part.startsWith('~~') && part.endsWith('~~'))
      return <Text key={key} style={[baseStyle, styles.strike]}>{part.slice(2, -2)}</Text>;
    return <Text key={key} style={baseStyle}>{part}</Text>;
  });
}

// ── Code block component ─────────────────────────────────────────────────────

function CodeBlock({ code, lang }: { code: string; lang: string }) {
  const [copied, setCopied] = useState(false);
  const copy = () => {
    Clipboard.setString(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };
  return (
    <View style={styles.codeBlock}>
      <View style={styles.codeHeader}>
        <View style={styles.codeLangRow}>
          <Code color={Colors.primary} size={12} />
          <Text style={styles.codeLang}>{lang || 'code'}</Text>
        </View>
        <TouchableOpacity onPress={copy} style={styles.copyBtn}>
          {copied
            ? <Check color={Colors.success} size={14} />
            : <Copy color={Colors.textTertiary} size={14} />}
          <Text style={[styles.copyText, copied && { color: Colors.success }]}>
            {copied ? 'Copied!' : 'Copy'}
          </Text>
        </TouchableOpacity>
      </View>
      <ScrollView horizontal showsHorizontalScrollIndicator={false}>
        <Text style={styles.codeText}>{code}</Text>
      </ScrollView>
    </View>
  );
}

// ── Markdown renderer ─────────────────────────────────────────────────────────

function renderMarkdown(text: string, isUser: boolean) {
  const textStyle = isUser ? styles.userText : styles.aiText;
  const nodes: React.ReactNode[] = [];
  let i = 0;

  // Extract code blocks first (``` fenced)
  const codeBlockRe = /```(\w*)\n?([\s\S]*?)```/g;
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  const segments: Array<{ type: 'text' | 'code'; content: string; lang?: string }> = [];

  codeBlockRe.lastIndex = 0;
  while ((match = codeBlockRe.exec(text)) !== null) {
    if (match.index > lastIndex) {
      segments.push({ type: 'text', content: text.slice(lastIndex, match.index) });
    }
    segments.push({ type: 'code', content: match[2].trim(), lang: match[1] || '' });
    lastIndex = codeBlockRe.lastIndex;
  }
  if (lastIndex < text.length) {
    segments.push({ type: 'text', content: text.slice(lastIndex) });
  }

  let nodeKey = 0;
  segments.forEach(seg => {
    if (seg.type === 'code') {
      nodes.push(<CodeBlock key={nodeKey++} code={seg.content} lang={seg.lang ?? ''} />);
      return;
    }

    // Process text segment line by line
    const lines = seg.content.split('\n');
    let listItems: string[] = [];
    let listType: 'bullet' | 'ordered' | null = null;

    const flushList = () => {
      if (!listItems.length) return;
      nodes.push(
        <View key={nodeKey++} style={styles.list}>
          {listItems.map((item, idx) => (
            <View key={idx} style={styles.listItem}>
              <Text style={[textStyle, styles.listBullet]}>
                {listType === 'ordered' ? `${idx + 1}.` : '•'}
              </Text>
              <Text style={[textStyle, styles.listItemText]}>
                {renderInline(item, textStyle, `li-${nodeKey}-${idx}`)}
              </Text>
            </View>
          ))}
        </View>
      );
      listItems = [];
      listType = null;
    };

    lines.forEach(line => {
      // Blank line
      if (!line.trim()) {
        flushList();
        return;
      }

      // Headers
      const h3 = line.match(/^###\s+(.+)/);
      const h2 = line.match(/^##\s+(.+)/);
      const h1 = line.match(/^#\s+(.+)/);
      if (h1 || h2 || h3) {
        flushList();
        const hText = (h1 || h2 || h3)![1];
        const hStyle = h1 ? styles.h1 : h2 ? styles.h2 : styles.h3;
        nodes.push(
          <Text key={nodeKey++} style={[textStyle, hStyle]}>
            {renderInline(hText, { ...textStyle, ...hStyle }, `h-${nodeKey}`)}
          </Text>
        );
        return;
      }

      // Blockquote
      const bq = line.match(/^>\s+(.+)/);
      if (bq) {
        flushList();
        nodes.push(
          <View key={nodeKey++} style={styles.blockquote}>
            <Text style={[styles.aiText, styles.blockquoteText]}>
              {renderInline(bq[1], styles.blockquoteText, `bq-${nodeKey}`)}
            </Text>
          </View>
        );
        return;
      }

      // Bullet list
      const bullet = line.match(/^[-*•]\s+(.+)/);
      if (bullet) {
        if (listType !== 'bullet') { flushList(); listType = 'bullet'; }
        listItems.push(bullet[1]);
        return;
      }

      // Ordered list
      const ordered = line.match(/^\d+\.\s+(.+)/);
      if (ordered) {
        if (listType !== 'ordered') { flushList(); listType = 'ordered'; }
        listItems.push(ordered[1]);
        return;
      }

      // Horizontal rule
      if (line.match(/^---+$/)) {
        flushList();
        nodes.push(<View key={nodeKey++} style={styles.hr} />);
        return;
      }

      // Regular line
      flushList();
      nodes.push(
        <Text key={nodeKey++} style={textStyle}>
          {renderInline(line, textStyle, `line-${nodeKey}`)}
        </Text>
      );
    });

    flushList();
  });

  return nodes;
}

// ── Main component ────────────────────────────────────────────────────────────

export default function MessageBubble({ message, onRegenerate }: MessageBubbleProps) {
  const [copied, setCopied] = useState(false);

  const copyText = () => {
    Clipboard.setString(message.text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const shareText = async () => {
    try {
      await Share.share({ message: message.text });
    } catch {}
  };

  if (message.isUser) {
    return (
      <View style={styles.userRow}>
        <View style={styles.userBubbleWrap}>
          <LinearGradient
            colors={[Colors.primary, Colors.purple]}
            start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
            style={styles.userBubble}
          >
            <Text style={styles.userText}>{message.text}</Text>
          </LinearGradient>
          <Text style={styles.time}>{message.time}</Text>
        </View>
        <View style={styles.userAvatar}>
          <User color={Colors.background} size={14} />
        </View>
      </View>
    );
  }

  return (
    <View style={styles.aiRow}>
      <View style={styles.aiAvatar}>
        <Sparkles color={Colors.primary} size={14} />
      </View>
      <View style={styles.aiBubbleWrap}>
        <View style={styles.aiBubble}>
          {renderMarkdown(message.text, false)}
        </View>
        <View style={styles.aiActions}>
          <Text style={styles.time}>{message.time}</Text>
          <View style={styles.actionButtons}>
            <ActionBtn icon={<Copy size={13} color={copied ? Colors.success : Colors.textTertiary} />} onPress={copyText} />
            {onRegenerate && (
              <ActionBtn icon={<RefreshCw size={13} color={Colors.textTertiary} />} onPress={onRegenerate} />
            )}
            <ActionBtn icon={<Share2 size={13} color={Colors.textTertiary} />} onPress={shareText} />
          </View>
        </View>
      </View>
    </View>
  );
}

function ActionBtn({ icon, onPress }: { icon: React.ReactNode; onPress: () => void }) {
  return (
    <TouchableOpacity style={styles.actionBtn} onPress={onPress} activeOpacity={0.7}>
      {icon}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  // User
  userRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'flex-end',
    paddingHorizontal: Spacing.md,
    marginBottom: Spacing.md,
    gap: Spacing.sm,
  },
  userBubbleWrap: { alignItems: 'flex-end', maxWidth: '78%' },
  userBubble: {
    borderRadius: BorderRadius.xl,
    borderBottomRightRadius: 6,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm + 4,
  },
  userAvatar: {
    width: 30, height: 30, borderRadius: 15,
    backgroundColor: Colors.primary,
    alignItems: 'center', justifyContent: 'center',
    flexShrink: 0,
  },
  userText: { color: '#fff', fontSize: FontSizes.md, lineHeight: 22 },

  // AI
  aiRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingHorizontal: Spacing.md,
    marginBottom: Spacing.md,
    gap: Spacing.sm,
  },
  aiAvatar: {
    width: 30, height: 30, borderRadius: 15,
    backgroundColor: 'rgba(0,212,255,0.12)',
    borderWidth: 1, borderColor: 'rgba(0,212,255,0.3)',
    alignItems: 'center', justifyContent: 'center',
    flexShrink: 0, marginTop: 2,
  },
  aiBubbleWrap: { flex: 1, minWidth: 0 },
  aiBubble: {
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)',
    borderRadius: BorderRadius.xl,
    borderTopLeftRadius: 6,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm + 4,
    gap: 4,
  },
  aiText: { color: Colors.text, fontSize: FontSizes.md, lineHeight: 22 },
  aiActions: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    marginTop: 6, paddingHorizontal: 4,
  },
  actionButtons: { flexDirection: 'row', gap: 4 },
  actionBtn: {
    width: 28, height: 28, borderRadius: 14,
    backgroundColor: 'rgba(255,255,255,0.04)',
    alignItems: 'center', justifyContent: 'center',
  },

  // Common
  time: { fontSize: FontSizes.xs, color: Colors.textTertiary, marginTop: 4 },

  // Markdown
  bold: { fontWeight: '700' },
  italic: { fontStyle: 'italic' },
  strike: { textDecorationLine: 'line-through' },
  inlineCode: {
    fontFamily: 'monospace',
    backgroundColor: 'rgba(0,212,255,0.1)',
    color: Colors.primary,
    borderRadius: 4,
    paddingHorizontal: 4,
    fontSize: FontSizes.sm,
  },
  h1: { fontSize: FontSizes.xl, fontWeight: '700', marginTop: 8, marginBottom: 4 },
  h2: { fontSize: FontSizes.lg, fontWeight: '700', marginTop: 6, marginBottom: 3 },
  h3: { fontSize: FontSizes.md, fontWeight: '700', marginTop: 4, marginBottom: 2 },
  list: { gap: 4, marginVertical: 4 },
  listItem: { flexDirection: 'row', gap: 8, alignItems: 'flex-start' },
  listBullet: { color: Colors.primary, fontWeight: '700', marginTop: 1, minWidth: 16 },
  listItemText: { flex: 1 },
  blockquote: {
    borderLeftWidth: 3, borderLeftColor: Colors.purple,
    paddingLeft: Spacing.sm, marginVertical: 4,
    backgroundColor: 'rgba(139,92,246,0.08)', borderRadius: 4,
    paddingVertical: 4,
  },
  blockquoteText: { color: Colors.textSecondary, fontStyle: 'italic' },
  hr: { height: 1, backgroundColor: Colors.border, marginVertical: Spacing.sm },

  // Code block
  codeBlock: {
    backgroundColor: '#0A0A14',
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    borderColor: 'rgba(0,212,255,0.15)',
    marginVertical: 6,
    overflow: 'hidden',
  },
  codeHeader: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 12, paddingVertical: 8,
    borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.06)',
    backgroundColor: 'rgba(0,212,255,0.05)',
  },
  codeLangRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  codeLang: { fontSize: FontSizes.xs, color: Colors.primary, fontWeight: '600', textTransform: 'uppercase' },
  copyBtn: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  copyText: { fontSize: FontSizes.xs, color: Colors.textTertiary },
  codeText: {
    fontFamily: 'monospace', fontSize: 13, color: '#E2E8F0',
    lineHeight: 20, padding: 12,
  },
});
