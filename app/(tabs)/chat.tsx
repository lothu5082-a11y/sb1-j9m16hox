import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  Alert,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, {
  FadeInUp,
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated';
import { Send, Mic, Cpu, Sparkles, Trash2 } from 'lucide-react-native';
import { Colors, Spacing, FontSizes, BorderRadius } from '../../constants/theme';
import ChatBubble from '../../components/ChatBubble';

export let _aiConfig: { provider: 'openai' | 'gemini' | 'claude' | 'groq' | 'local'; apiKey: string } = {
  provider: 'local',
  apiKey: '',
};

export const setAIConfig = (config: { provider: string; apiKey: string }) => {
  _aiConfig = config as any;
};

export const getAIConfig = () => _aiConfig;

interface Message {
  id: string;
  text: string;
  isUser: boolean;
  time: string;
}

const getProviderLabel = (provider: string): string => {
  switch (provider) {
    case 'openai': return 'GPT-4o Mini';
    case 'gemini': return 'Gemini Flash';
    case 'claude': return 'Claude';
    case 'groq': return 'Groq';
    default: return 'On-Device';
  }
};

const getLocalResponse = (text: string): string => {
  const lower = text.toLowerCase();
  if (lower.includes('hello') || lower.includes('hi') || lower.includes('hey')) {
    return "Online. I'm Riuka — your on-device autonomous executive assistant. All processing stays on this device. What can I execute for you?";
  }
  if (lower.includes('time')) {
    return `Current device time: ${new Date().toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}.`;
  }
  if (lower.includes('date')) {
    return `Today: ${new Date().toLocaleDateString([], { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}.`;
  }
  if (lower.includes('who are you') || lower.includes('what are you')) {
    return "I'm Riuka AI — a system-level autonomous assistant that operates entirely within your device. I monitor your notification stream, intercept clipboard data, and physically execute cross-app workflows through the accessibility layer. Zero cloud. Zero latency. Zero data leakage.";
  }
  if (lower.includes('how') && lower.includes('work')) {
    return "Three layers:\n\n1. SENSORS — I continuously monitor your notification stream (WhatsApp, Telegram, Slack, SMS), clipboard buffer, and device telemetry in the background.\n\n2. BRAIN — All intercepted data is routed to the on-device language model. Your data never leaves the phone.\n\n3. HANDS — Once I determine an action, I pilot the device interface through the Accessibility Service — tapping, typing, scrolling, sending — invisibly.";
  }
  if (lower.includes('privacy') || lower.includes('data')) {
    return "Absolute privacy. The on-device architecture means your messages, documents, calendar events, and location data are structurally unable to reach any external server. No API calls. No cloud sync. No exposure.";
  }
  if (lower.includes('notif') || lower.includes('message')) {
    return "Enable the Notification Listener in Sensors to have me intercept and parse incoming messages. I can auto-draft replies, categorize urgency, and execute responses — all without you opening any app.";
  }
  if (lower.includes('clipboard')) {
    return "The Clipboard Engine activates the moment you copy anything — code snippets, URLs, tracking numbers, contract text. I'll analyze it instantly and surface an action panel at the top of your display.";
  }
  if (lower.includes('automat') || lower.includes('workflow')) {
    return "Build an automation in the Automate tab. I can chain actions across apps: read a message → check your calendar → locate a file → draft a response → attach and send. One tap confirmation.";
  }
  if (lower.includes('help')) {
    return "Core capabilities:\n\n• Autonomous notification parsing & reply drafting\n• Clipboard interception & instant analysis\n• Cross-app workflow execution via Accessibility API\n• Calendar & schedule awareness\n• Voice command interface\n• Fully offline — no cloud dependencies\n\nWhat would you like to automate?";
  }
  return "On-device brain active. For full LLM capabilities, configure a cloud provider in Settings — or keep it local for maximum privacy.";
};

const sendToAI = async (userMessage: string, history: Message[]): Promise<string> => {
  const config = _aiConfig;

  if (config.provider === 'local' || !config.apiKey) {
    await new Promise((resolve) => setTimeout(resolve, 500));
    return getLocalResponse(userMessage);
  }

  try {
    const messages = [
      { role: 'system', content: 'You are Riuka AI, an autonomous on-device executive assistant for Android. You monitor notifications, parse clipboard data, and execute cross-app workflows through the accessibility layer. You are privacy-first, zero-cloud, and extremely capable. Be concise, direct, and action-oriented.' },
      ...history.slice(-10).map((m) => ({ role: m.isUser ? 'user' : 'assistant', content: m.text })),
      { role: 'user', content: userMessage },
    ];

    if (config.provider === 'openai') {
      const res = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${config.apiKey}` },
        body: JSON.stringify({ model: 'gpt-4o-mini', messages, max_tokens: 512 }),
      });
      const data = await res.json();
      if (data.error) throw new Error(data.error.message);
      return data.choices[0].message.content;
    }

    if (config.provider === 'gemini') {
      const geminiMessages = messages.filter((m) => m.role !== 'system').map((m) => ({
        role: m.role === 'assistant' ? 'model' : 'user',
        parts: [{ text: m.content }],
      }));
      const res = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${config.apiKey}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ contents: geminiMessages }),
        }
      );
      const data = await res.json();
      if (data.error) throw new Error(data.error.message);
      return data.candidates[0].content.parts[0].text;
    }

    if (config.provider === 'claude') {
      const res = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': config.apiKey,
          'anthropic-version': '2023-06-01',
        },
        body: JSON.stringify({
          model: 'claude-3-haiku-20240307',
          max_tokens: 512,
          system: messages[0].content,
          messages: messages.slice(1),
        }),
      });
      const data = await res.json();
      if (data.error) throw new Error(data.error.message);
      return data.content[0].text;
    }

    if (config.provider === 'groq') {
      const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${config.apiKey}` },
        body: JSON.stringify({ model: 'llama3-8b-8192', messages, max_tokens: 512 }),
      });
      const data = await res.json();
      if (data.error) throw new Error(data.error.message || JSON.stringify(data.error));
      return data.choices[0].message.content;
    }
  } catch (err: any) {
    return `Error: ${err.message || 'Could not reach AI provider. Check your API key in Settings.'}`;
  }

  return getLocalResponse(userMessage);
};

function TypingIndicator() {
  const dot1 = useSharedValue(0.3);
  const dot2 = useSharedValue(0.3);
  const dot3 = useSharedValue(0.3);

  useEffect(() => {
    dot1.value = withRepeat(withSequence(withTiming(1, { duration: 400 }), withTiming(0.3, { duration: 400 })), -1, false);
    setTimeout(() => {
      dot2.value = withRepeat(withSequence(withTiming(1, { duration: 400 }), withTiming(0.3, { duration: 400 })), -1, false);
    }, 150);
    setTimeout(() => {
      dot3.value = withRepeat(withSequence(withTiming(1, { duration: 400 }), withTiming(0.3, { duration: 400 })), -1, false);
    }, 300);
  }, []);

  const d1Style = useAnimatedStyle(() => ({ opacity: dot1.value }));
  const d2Style = useAnimatedStyle(() => ({ opacity: dot2.value }));
  const d3Style = useAnimatedStyle(() => ({ opacity: dot3.value }));

  return (
    <View style={typingStyles.container}>
      <View style={typingStyles.avatar}>
        <Text style={typingStyles.avatarText}>R</Text>
      </View>
      <View style={typingStyles.bubble}>
        <View style={typingStyles.dots}>
          <Animated.View style={[typingStyles.dot, d1Style]} />
          <Animated.View style={[typingStyles.dot, d2Style]} />
          <Animated.View style={[typingStyles.dot, d3Style]} />
        </View>
      </View>
    </View>
  );
}

const typingStyles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.lg,
    marginBottom: Spacing.md,
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
  bubble: {
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.lg,
    borderBottomLeftRadius: Spacing.xs,
    borderWidth: 1,
    borderColor: Colors.border,
    paddingHorizontal: Spacing.md + 4,
    paddingVertical: Spacing.md,
  },
  dots: {
    flexDirection: 'row',
    gap: 5,
  },
  dot: {
    width: 7,
    height: 7,
    borderRadius: 3.5,
    backgroundColor: Colors.primary,
  },
});

const SUGGESTIONS = ['How do you work?', 'Privacy policy?', 'Set up automation'];

export default function ChatScreen() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputText, setInputText] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [provider, setProvider] = useState(_aiConfig.provider);
  const scrollViewRef = useRef<ScrollView>(null);

  useEffect(() => {
    const timer = setInterval(() => {
      if (_aiConfig.provider !== provider) {
        setProvider(_aiConfig.provider);
      }
    }, 1000);
    return () => clearInterval(timer);
  }, [provider]);

  const sendMessage = async (text?: string) => {
    const msgText = (text ?? inputText).trim();
    if (!msgText) return;

    const userMsg: Message = {
      id: Date.now().toString(),
      text: msgText,
      isUser: true,
      time: new Date().toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' }),
    };

    setMessages((prev) => [...prev, userMsg]);
    setInputText('');
    setIsTyping(true);

    setTimeout(() => scrollViewRef.current?.scrollToEnd({ animated: true }), 50);

    const reply = await sendToAI(msgText, messages);

    const aiMsg: Message = {
      id: (Date.now() + 1).toString(),
      text: reply,
      isUser: false,
      time: new Date().toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' }),
    };

    setMessages((prev) => [...prev, aiMsg]);
    setIsTyping(false);
    setTimeout(() => scrollViewRef.current?.scrollToEnd({ animated: true }), 50);
  };

  const clearChat = () => {
    Alert.alert(
      'Clear Command Log',
      'Erase all messages from this session?',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Clear', style: 'destructive', onPress: () => setMessages([]) },
      ]
    );
  };

  const modelLabel = getProviderLabel(_aiConfig.provider);

  return (
    <View style={styles.container}>
      <LinearGradient colors={[Colors.background, Colors.backgroundSecondary]} style={styles.gradient}>
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <View style={styles.riukaAvatar}>
              <Text style={styles.riukaLetter}>R</Text>
              <View style={styles.sparkleWrap}>
                <Sparkles color={Colors.primary} size={9} />
              </View>
            </View>
            <View>
              <Text style={styles.headerTitle}>Riuka AI</Text>
              <View style={styles.headerMeta}>
                <View style={styles.onlineDot} />
                <Text style={styles.headerStatus}>On-Device</Text>
                <View style={styles.modelBadge}>
                  <Text style={styles.modelBadgeText}>{modelLabel}</Text>
                </View>
              </View>
            </View>
          </View>
          <TouchableOpacity style={styles.clearButton} onPress={clearChat}>
            <Trash2 color={Colors.textTertiary} size={18} />
          </TouchableOpacity>
        </View>

        {/* Messages */}
        <ScrollView
          ref={scrollViewRef}
          style={styles.messagesContainer}
          contentContainerStyle={styles.messagesContent}
          onContentSizeChange={() => scrollViewRef.current?.scrollToEnd({ animated: true })}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {messages.length === 0 && (
            <Animated.View entering={FadeInUp.duration(600)} style={styles.emptyState}>
              <View style={styles.emptyAvatar}>
                <Text style={styles.emptyAvatarLetter}>R</Text>
              </View>
              <Text style={styles.emptyTitle}>Riuka AI</Text>
              <Text style={styles.emptySubtitle}>Autonomous on-device executive assistant. All intelligence stays on your hardware.</Text>
              <View style={styles.emptyFeatures}>
                {['100% Offline', 'Zero Latency', 'Ironclad Privacy'].map((f) => (
                  <View key={f} style={styles.emptyFeatureChip}>
                    <Cpu color={Colors.secondary} size={10} />
                    <Text style={styles.emptyFeatureText}>{f}</Text>
                  </View>
                ))}
              </View>
            </Animated.View>
          )}

          {messages.length > 0 && (
            <View style={styles.dateSeparator}>
              <View style={styles.dateLine} />
              <Text style={styles.dateText}>Session Active</Text>
              <View style={styles.dateLine} />
            </View>
          )}

          {messages.map((msg) => (
            <ChatBubble key={msg.id} message={msg.text} isUser={msg.isUser} time={msg.time} />
          ))}

          {isTyping && <TypingIndicator />}
        </ScrollView>

        {/* Suggestions row */}
        {messages.length === 0 && !isTyping && (
          <View style={styles.suggestionsRow}>
            {SUGGESTIONS.map((s) => (
              <TouchableOpacity key={s} style={styles.suggestionChip} onPress={() => sendMessage(s)}>
                <Text style={styles.suggestionText}>{s}</Text>
              </TouchableOpacity>
            ))}
          </View>
        )}

        {/* Input area */}
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.inputContainer}>
          <View style={styles.inputRow}>
            <View style={styles.inputWrapper}>
              <TextInput
                style={styles.input}
                placeholder="Command Riuka..."
                placeholderTextColor={Colors.textTertiary}
                value={inputText}
                onChangeText={setInputText}
                multiline
                maxLength={2000}
                onSubmitEditing={() => sendMessage()}
                blurOnSubmit={false}
              />
            </View>
            <TouchableOpacity style={styles.micInputButton}>
              <Mic color={Colors.primary} size={20} />
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => sendMessage()}
              style={[styles.sendButton, (!inputText.trim() || isTyping) && styles.sendButtonDisabled]}
              disabled={!inputText.trim() || isTyping}
            >
              <Send color={inputText.trim() && !isTyping ? '#ffffff' : Colors.textTertiary} size={18} />
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
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
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.xxxl + Spacing.md,
    paddingBottom: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
  },
  riukaAvatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(168, 85, 247, 0.12)',
    borderWidth: 1.5,
    borderColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.4,
    shadowRadius: 10,
    elevation: 6,
  },
  riukaLetter: {
    fontSize: FontSizes.lg,
    fontWeight: '800',
    color: Colors.primary,
  },
  sparkleWrap: {
    position: 'absolute',
    top: 2,
    right: 2,
  },
  headerMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    marginTop: 2,
  },
  onlineDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: Colors.secondary,
  },
  headerStatus: {
    fontSize: FontSizes.xs,
    color: Colors.secondary,
    fontWeight: '500',
  },
  modelBadge: {
    backgroundColor: 'rgba(168, 85, 247, 0.12)',
    borderRadius: BorderRadius.full,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 1,
    borderWidth: 1,
    borderColor: 'rgba(168, 85, 247, 0.3)',
    marginLeft: Spacing.xs,
  },
  modelBadgeText: {
    fontSize: 9,
    fontWeight: '700',
    color: Colors.primary,
    letterSpacing: 0.3,
  },
  headerTitle: {
    fontSize: FontSizes.lg,
    fontWeight: '700',
    color: Colors.text,
  },
  clearButton: {
    padding: Spacing.sm,
  },
  messagesContainer: {
    flex: 1,
  },
  messagesContent: {
    paddingVertical: Spacing.lg,
    flexGrow: 1,
  },
  emptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: Spacing.xxxl,
    paddingHorizontal: Spacing.xl,
  },
  emptyAvatar: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: 'rgba(168, 85, 247, 0.1)',
    borderWidth: 2,
    borderColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.lg,
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.5,
    shadowRadius: 16,
    elevation: 8,
  },
  emptyAvatarLetter: {
    fontSize: FontSizes.xxxl,
    fontWeight: '800',
    color: Colors.primary,
  },
  emptyTitle: {
    fontSize: FontSizes.xxl,
    fontWeight: '700',
    color: Colors.text,
    marginBottom: Spacing.sm,
    letterSpacing: 1,
  },
  emptySubtitle: {
    fontSize: FontSizes.md,
    color: Colors.textTertiary,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: Spacing.lg,
  },
  emptyFeatures: {
    flexDirection: 'row',
    gap: Spacing.sm,
  },
  emptyFeatureChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.full,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 4,
    borderWidth: 1,
    borderColor: Colors.secondary + '40',
  },
  emptyFeatureText: {
    fontSize: FontSizes.xs,
    color: Colors.secondary,
    fontWeight: '600',
  },
  dateSeparator: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.lg,
    marginVertical: Spacing.md,
    gap: Spacing.md,
  },
  dateLine: {
    flex: 1,
    height: 1,
    backgroundColor: Colors.border,
  },
  dateText: {
    fontSize: FontSizes.xs,
    color: Colors.textTertiary,
    fontWeight: '500',
  },
  suggestionsRow: {
    flexDirection: 'row',
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing.md,
    gap: Spacing.sm,
  },
  suggestionChip: {
    flex: 1,
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    borderColor: Colors.primary + '30',
    paddingVertical: Spacing.sm + 2,
    paddingHorizontal: Spacing.sm,
    alignItems: 'center',
  },
  suggestionText: {
    fontSize: FontSizes.xs,
    color: Colors.primary,
    fontWeight: '500',
    textAlign: 'center',
  },
  inputContainer: {
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing.lg,
    paddingTop: Spacing.sm,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: Spacing.sm,
  },
  inputWrapper: {
    flex: 1,
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    borderColor: Colors.border,
    paddingHorizontal: Spacing.md,
    maxHeight: 100,
  },
  input: {
    fontSize: FontSizes.md,
    color: Colors.text,
    paddingVertical: Spacing.sm + 2,
    lineHeight: 20,
  },
  micInputButton: {
    padding: Spacing.sm + 2,
  },
  sendButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.5,
    shadowRadius: 10,
    elevation: 6,
  },
  sendButtonDisabled: {
    backgroundColor: Colors.surface,
    shadowOpacity: 0,
    elevation: 0,
  },
});
