import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Colors, Spacing, FontSizes, BorderRadius } from '../constants/theme';

interface ChatBubbleProps {
  message: string;
  isUser: boolean;
  time?: string;
  type?: 'text' | 'image' | 'voice';
}

export default function ChatBubble({ message, isUser, time, type = 'text' }: ChatBubbleProps) {
  return (
    <View style={[styles.container, isUser ? styles.userContainer : styles.assistantContainer]}>
      {!isUser && (
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>V</Text>
        </View>
      )}
      <View style={styles.bubbleWrapper}>
        {!isUser && <Text style={styles.senderLabel}>Vexora AI</Text>}
        <View style={[styles.bubble, isUser ? styles.userBubble : styles.assistantBubble]}>
          <Text style={[styles.message, isUser ? styles.userMessage : styles.assistantMessage]}>{message}</Text>
          {time && <Text style={[styles.time, isUser ? styles.userTime : styles.assistantTime]}>{time}</Text>}
        </View>
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
    backgroundColor: 'rgba(0, 229, 255, 0.15)',
    borderWidth: 1.5,
    borderColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: Spacing.sm,
    marginTop: 14, // Align with bubble content, below label
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
    color: Colors.background,
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
    color: 'rgba(10, 14, 26, 0.6)',
    textAlign: 'right',
  },
  assistantTime: {
    color: Colors.textTertiary,
  },
});
