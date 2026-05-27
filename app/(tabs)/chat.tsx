import React, { useState, useRef, useEffect } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TextInput,
  TouchableOpacity, KeyboardAvoidingView, Platform, Alert,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Send, Mic, Sparkles, Trash2, Key } from 'lucide-react-native';
import { Colors, Spacing, FontSizes, BorderRadius } from '../../constants/theme';
import ChatBubble from '../../components/ChatBubble';
import { sendToAI, Message as AIMessage } from '../../lib/ai';
import { storage } from '../../lib/storage';

interface DisplayMessage {
  id: string;
  text: string;
  isUser: boolean;
  time: string;
}

const aiModes = ['Assistant', 'Study', 'Coding', 'Creative', 'Business', 'Travel'];

const MODE_HINTS: Record<string, string> = {
  Assistant: 'Ask Vexora anything...',
  Study: 'What do you want to learn?',
  Coding: 'Paste code or describe a problem...',
  Creative: 'Let\'s create something together...',
  Business: 'Ask about strategy, emails, plans...',
  Travel: 'Where do you want to go?',
};

const MODE_SYSTEM: Record<string, string> = {
  Study: 'You are a patient and thorough tutor. Explain concepts clearly with examples.',
  Coding: 'You are an expert software engineer. Give concise, working code with brief explanations.',
  Creative: 'You are a creative writing partner. Be imaginative, poetic, and inspiring.',
  Business: 'You are a business consultant. Give practical, actionable professional advice.',
  Travel: 'You are a knowledgeable travel guide. Share helpful tips, places, and local insights.',
};

export default function ChatScreen() {
  const [messages, setMessages] = useState<DisplayMessage[]>([
    {
      id: '0',
      text: "Hi! I'm Vexora 👋\nAdd your API key in Settings to enable real AI. I support Gemini (free), Groq (free), OpenAI, and Claude.",
      isUser: false,
      time: new Date().toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' }),
    },
  ]);
  const [aiHistory, setAiHistory] = useState<AIMessage[]>([]);
  const [inputText, setInputText] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [selectedMode, setSelectedMode] = useState('Assistant');
  const [selectedModel, setSelectedModel] = useState('gemini');
  const scrollViewRef = useRef<ScrollView>(null);

  useEffect(() => {
    storage.getJSON<string>('vexora:selected_model').then(m => {
      if (m) setSelectedModel(m);
    });
  }, []);

  const clearChat = () => {
    setMessages([]);
    setAiHistory([]);
  };

  const sendMessage = async () => {
    const text = inputText.trim();
    if (!text || isTyping) return;

    const userMsg: DisplayMessage = {
      id: Date.now().toString(),
      text,
      isUser: true,
      time: new Date().toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' }),
    };
    setMessages(prev => [...prev, userMsg]);
    setInputText('');
    setIsTyping(true);

    const modePrefix = MODE_SYSTEM[selectedMode] ? `[${selectedMode} mode] ` : '';
    const userAIMsg: AIMessage = { role: 'user', content: modePrefix + text };
    const newHistory = [...aiHistory, userAIMsg];

    try {
      const reply = await sendToAI(selectedModel, newHistory);
      const assistantMsg: AIMessage = { role: 'assistant', content: reply };
      setAiHistory([...newHistory, assistantMsg]);

      setMessages(prev => [
        ...prev,
        {
          id: (Date.now() + 1).toString(),
          text: reply,
          isUser: false,
          time: new Date().toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' }),
        },
      ]);
    } catch (err: any) {
      const errText = err.message?.includes('No API key')
        ? "No API key found. Go to Settings → add your key for the selected model."
        : `Error: ${err.message}`;
      setMessages(prev => [
        ...prev,
        {
          id: (Date.now() + 1).toString(),
          text: errText,
          isUser: false,
          time: new Date().toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' }),
        },
      ]);
    } finally {
      setIsTyping(false);
    }
  };

  return (
    <View style={styles.container}>
      <LinearGradient colors={[Colors.background, Colors.backgroundSecondary]} style={styles.gradient}>
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <View style={styles.novaAvatar}>
              <Sparkles color={Colors.primary} size={18} />
            </View>
            <View>
              <Text style={styles.headerTitle}>Vexora</Text>
              <Text style={styles.headerStatus}>Online · {selectedModel.charAt(0).toUpperCase() + selectedModel.slice(1)}</Text>
            </View>
          </View>
          <TouchableOpacity style={styles.clearButton} onPress={clearChat}>
            <Trash2 color={Colors.textTertiary} size={18} />
          </TouchableOpacity>
        </View>

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.modesRow}
          style={styles.modesScroll}
        >
          {aiModes.map((mode) => (
            <TouchableOpacity
              key={mode}
              onPress={() => setSelectedMode(mode)}
              style={[styles.modeChip, selectedMode === mode && styles.modeChipSelected]}
            >
              <Text style={[styles.modeChipText, selectedMode === mode && styles.modeChipTextSelected]}>
                {mode}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        <ScrollView
          ref={scrollViewRef}
          style={styles.messagesContainer}
          contentContainerStyle={styles.messagesContent}
          onContentSizeChange={() => scrollViewRef.current?.scrollToEnd({ animated: true })}
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.dateSeparator}>
            <View style={styles.dateLine} />
            <Text style={styles.dateText}>Today</Text>
            <View style={styles.dateLine} />
          </View>

          {messages.map((msg) => (
            <ChatBubble key={msg.id} message={msg.text} isUser={msg.isUser} time={msg.time} />
          ))}

          {isTyping && (
            <View style={styles.typingContainer}>
              <View style={styles.typingAvatar}>
                <Text style={styles.typingAvatarText}>V</Text>
              </View>
              <View style={styles.typingBubble}>
                <View style={styles.typingDots}>
                  <View style={[styles.typingDot, styles.dot1]} />
                  <View style={[styles.typingDot, styles.dot2]} />
                  <View style={[styles.typingDot, styles.dot3]} />
                </View>
              </View>
            </View>
          )}
        </ScrollView>

        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.inputContainer}>
          <View style={styles.inputRow}>
            <View style={styles.inputWrapper}>
              <TextInput
                style={styles.input}
                placeholder={MODE_HINTS[selectedMode]}
                placeholderTextColor={Colors.textTertiary}
                value={inputText}
                onChangeText={setInputText}
                multiline
                maxLength={2000}
                onSubmitEditing={sendMessage}
              />
            </View>
            <TouchableOpacity
              onPress={sendMessage}
              style={[styles.sendButton, (!inputText.trim() || isTyping) && styles.sendButtonDisabled]}
              disabled={!inputText.trim() || isTyping}
            >
              <Send color={inputText.trim() && !isTyping ? Colors.background : Colors.textTertiary} size={18} />
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      </LinearGradient>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  gradient: { flex: 1 },
  header: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: Spacing.lg, paddingTop: Spacing.xxxl + Spacing.md,
    paddingBottom: Spacing.md, borderBottomWidth: 1, borderBottomColor: Colors.border,
  },
  headerLeft: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md },
  novaAvatar: {
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: 'rgba(0, 229, 255, 0.12)',
    borderWidth: 1.5, borderColor: Colors.primary,
    alignItems: 'center', justifyContent: 'center',
  },
  headerTitle: { fontSize: FontSizes.lg, fontWeight: '700', color: Colors.text },
  headerStatus: { fontSize: FontSizes.xs, color: Colors.primary, fontWeight: '500' },
  clearButton: { padding: Spacing.sm },
  modesScroll: { flexGrow: 0, borderBottomWidth: 1, borderBottomColor: Colors.border },
  modesRow: { flexDirection: 'row', paddingHorizontal: Spacing.lg, paddingVertical: Spacing.sm, gap: Spacing.sm },
  modeChip: {
    paddingHorizontal: Spacing.md, paddingVertical: Spacing.xs + 2,
    borderRadius: BorderRadius.full, borderWidth: 1,
    borderColor: Colors.border, backgroundColor: Colors.surface,
  },
  modeChipSelected: {
    borderColor: Colors.primary, backgroundColor: 'rgba(0, 229, 255, 0.12)',
    shadowColor: Colors.primary, shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.4, shadowRadius: 8, elevation: 4,
  },
  modeChipText: { fontSize: FontSizes.sm, fontWeight: '600', color: Colors.textTertiary },
  modeChipTextSelected: { color: Colors.primary },
  messagesContainer: { flex: 1 },
  messagesContent: { paddingVertical: Spacing.lg },
  dateSeparator: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: Spacing.lg, marginVertical: Spacing.md, gap: Spacing.md,
  },
  dateLine: { flex: 1, height: 1, backgroundColor: Colors.border },
  dateText: { fontSize: FontSizes.xs, color: Colors.textTertiary, fontWeight: '500' },
  typingContainer: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: Spacing.lg, marginBottom: Spacing.md,
  },
  typingAvatar: {
    width: 32, height: 32, borderRadius: 16,
    backgroundColor: 'rgba(0, 229, 255, 0.15)',
    borderWidth: 1, borderColor: Colors.primary,
    alignItems: 'center', justifyContent: 'center', marginRight: Spacing.sm,
  },
  typingAvatarText: { fontSize: FontSizes.sm, fontWeight: '700', color: Colors.primary },
  typingBubble: {
    backgroundColor: Colors.surface, borderRadius: BorderRadius.lg,
    borderBottomLeftRadius: Spacing.xs, borderWidth: 1, borderColor: Colors.border,
    paddingHorizontal: Spacing.md + 4, paddingVertical: Spacing.md,
  },
  typingDots: { flexDirection: 'row', gap: 4 },
  typingDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: Colors.primary },
  dot1: { opacity: 0.4 },
  dot2: { opacity: 0.7 },
  dot3: { opacity: 1 },
  inputContainer: {
    paddingHorizontal: Spacing.lg, paddingBottom: Spacing.lg,
    paddingTop: Spacing.sm, borderTopWidth: 1, borderTopColor: Colors.border,
  },
  inputRow: { flexDirection: 'row', alignItems: 'flex-end', gap: Spacing.sm },
  inputWrapper: {
    flex: 1, backgroundColor: Colors.surface, borderRadius: BorderRadius.lg,
    borderWidth: 1, borderColor: Colors.border,
    paddingHorizontal: Spacing.md, maxHeight: 100,
  },
  input: { fontSize: FontSizes.md, color: Colors.text, paddingVertical: Spacing.sm + 2, lineHeight: 20 },
  sendButton: {
    width: 40, height: 40, borderRadius: 20, backgroundColor: Colors.primary,
    alignItems: 'center', justifyContent: 'center',
    shadowColor: Colors.primary, shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.5, shadowRadius: 10, elevation: 6,
  },
  sendButtonDisabled: { backgroundColor: Colors.surface, shadowOpacity: 0, elevation: 0 },
});
