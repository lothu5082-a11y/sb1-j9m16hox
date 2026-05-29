import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Platform } from 'react-native';
import { Copy, Check } from 'lucide-react-native';
import { Colors, Spacing, FontSizes, BorderRadius } from '../constants/theme';

interface ChatBubbleProps {
  message: string;
  isUser: boolean;
  time?: string;
  type?: 'text' | 'image' | 'voice';
}

export default function ChatBubble({ message, isUser, time, type = 'text' }: ChatBubbleProps) {
  const [copied, setCopied] = useState(false);

  const copyMessage = async () => {
    if (!message) return;
    try {
      if (Platform.OS === 'web' && navigator?.clipboard) {
        await navigator.clipboard.writeText(message);
      }
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {}
  };

  return (
    <View style={[styles.container, isUser ? styles.userContainer : styles.assistantContainer]}>
      {!isUser && (
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>R</Text>
        </View>
      )}
      <View style={styles.bubbleWrapper}>
        {!isUser && <Text style={styles.senderLabel}>Riuka AI</Text>}
        <View style={[styles.bubble, isUser ? styles.userBubble : styles.assistantBubble]}>
          <Text style={[styles.message, isUser ? styles.userMessage : styles.assistantMessage]}>{message}</Text>
          {time && <Text style={[styles.time, isUser ? styles.userTime : styles.assistantTime]}>{time}</Text>}
        </View>
        {!isUser && message.length > 0 && (
          <TouchableOpacity style={styles.copyButton} onPress={copyMessage} activeOpacity={0.7}>
            {copied
              ? <Check color={Colors.secondary} size={11} />
              : <Copy color={Colors.textTertiary} size={11} />}
            <Text style={[styles.copyText, copied && styles.copyTextDone]}>
              {copied ? 'Copied!' : 'Copy'}
            </Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    marginBottom: Spacing.md,
    paddingHorizontal: Spacing.lg,
  },
  userContainer: {
    justifyContent: 'flex-end',
  },
  assistantContainer: {
    justifyContent: 'flex-start',
    alignItems: 'flex-start',
  },
  avatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(168, 85, 247, 0.15)',
    borderWidth: 1.5,
    borderColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: Spacing.sm,
    marginTop: 14,
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.5,
    shadowRadius: 8,
    elevation: 4,
  },
  avatarText: {
    fontSize: FontSizes.sm,
    fontWeight: '700',
    color: Colors.primary,
  },
  bubbleWrapper: {
    maxWidth: '75%',
  },
  senderLabel: {
    fontSize: FontSizes.xs,
    color: Colors.textTertiary,
    fontWeight: '500',
    marginBottom: 3,
    marginLeft: 2,
  },
  bubble: {
    borderRadius: BorderRadius.lg,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.md,
  },
  userBubble: {
    backgroundColor: Colors.primary,
    borderBottomRightRadius: Spacing.xs,
  },
  assistantBubble: {
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
    borderBottomLeftRadius: Spacing.xs,
  },
  message: {
    fontSize: FontSizes.md,
    lineHeight: 22,
  },
  userMessage: {
    color: '#ffffff',
    fontWeight: '500',
  },
  assistantMessage: {
    color: Colors.text,
  },
  time: {
    fontSize: FontSizes.xs,
    marginTop: Spacing.xs,
  },
  userTime: {
    color: 'rgba(255, 255, 255, 0.5)',
    textAlign: 'right',
  },
  assistantTime: {
    color: Colors.textTertiary,
  },
  copyButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    marginTop: 4,
    marginLeft: 4,
    paddingVertical: 2,
    alignSelf: 'flex-start',
  },
  copyText: {
    fontSize: 10,
    color: Colors.textTertiary,
    fontWeight: '500',
  },
  copyTextDone: {
    color: Colors.secondary,
  },
});
