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

function BlinkCursor() {
  const opacity = useSharedValue(1);
  useEffect(() => {
    opacity.value = withRepeat(
      withSequence(withTiming(0, { duration: 350 }), withTiming(1, { duration: 350 })),
      -1, false
    );
  }, []);
  const style = useAnimatedStyle(() => ({ opacity: opacity.value }));
  return <Animated.Text style={[styles.cursor, style]}>▋</Animated.Text>;
}

export default function ChatBubble({
  message, isUser, time, type = 'text', isStreaming = false,
  onSpeak, onStopSpeak, isSpeaking = false,
}: ChatBubbleProps) {
  const [copied, setCopied] = useState(false);

  const copyMessage = async () => {
    if (!message) return;
    try {
      if (Platform.OS === 'web' && (navigator as any)?.clipboard) {
        await (navigator as any).clipboard.writeText(message);
      }
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
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={[styles.bubble, styles.userBubble]}
          >
            <Text style={[styles.message, styles.userMessage]}>{message}</Text>
            {time && <Text style={[styles.time, styles.userTime]}>{time}</Text>}
          </LinearGradient>
        ) : (
          <View style={[styles.bubble, styles.assistantBubble, isSpeaking && styles.assistantBubbleSpeaking]}>
            <View style={styles.messageRow}>
              <Text style={[styles.message, styles.assistantMessage]}>{message}</Text>
              {isStreaming && <BlinkCursor />}
            </View>
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
  avatarSpeaking: {
    borderColor: Colors.secondary,
    backgroundColor: 'rgba(16, 185, 129, 0.15)',
    shadowColor: Colors.secondary,
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
    borderBottomRightRadius: Spacing.xs,
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  assistantBubble: {
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
    borderBottomLeftRadius: Spacing.xs,
  },
  assistantBubbleSpeaking: {
    borderColor: Colors.secondary + '60',
    backgroundColor: 'rgba(16, 185, 129, 0.04)',
  },
  messageRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'flex-end',
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
    flexShrink: 1,
  },
  cursor: {
    color: Colors.primary,
    fontSize: FontSizes.md,
    lineHeight: 22,
    marginLeft: 1,
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
  actionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    marginTop: 4,
    marginLeft: 4,
  },
  actionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    paddingVertical: 2,
  },
  actionBtnActive: {
    opacity: 0.9,
  },
  actionText: {
    fontSize: 10,
    color: Colors.textTertiary,
    fontWeight: '500',
  },
  actionTextDone: {
    color: Colors.secondary,
  },
  actionTextActive: {
    color: Colors.primary,
  },
});
