import React, { useState, useRef, useEffect } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TextInput,
  TouchableOpacity, KeyboardAvoidingView, Platform, Alert,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Send, Mic, MicOff, Sparkles, Trash2, Volume2, VolumeX } from 'lucide-react-native';
import { Colors, Spacing, FontSizes, BorderRadius } from '../../constants/theme';
import ChatBubble from '../../components/ChatBubble';
import { sendToAI, Message as AIMessage } from '../../lib/ai';
import { storage } from '../../lib/storage';
import { useVoice } from '../../hooks/useVoice';

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
      text: "Hi! I'm Vexora 👋\nI'm running on Free AI — no key needed. Just type and I'll reply! For faster/smarter responses, add a Gemini or Groq key in Settings.",
      isUser: false,
      time: new Date().toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' }),
    },
  ]);
  const [aiHistory, setAiHistory] = useState<AIMessage[]>([]);
  const [inputText, setInputText] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [selectedMode, setSelectedMode] = useState('Assistant');
  const [selectedModel, setSelectedModel] = useState('free');
  const [voiceEnabled, setVoiceEnabled] = useState(true);
  const scrollViewRef = useRef<ScrollView>(null);

  const voice = useVoice({
    onResult: (text) => {
      setInputText(text);
      // auto-send after a short delay so user sees what was heard
      setTimeout(() => sendMessageWithText(text), 400);
    },
  });

  useEffect(() => {
    storage.getJSON<string>('vexora:selected_model').then(m => {
      if (m) setSelectedModel(m);
    });
  }, []);

  const clearChat = () => {
    setMessages([]);
    setAiHistory([]);
  };

  const sendMessageWithText = async (text: string) => {
    if (!text.trim() || isTyping) return;
    const trimmed = text.trim();

    const userMsg: DisplayMessage = {
      id: Date.now().toString(),
      text: trimmed,
      isUser: true,
      time: new Date().toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' }),
    };
    setMessages(prev => [...prev, userMsg]);
    setInputText('');
    setIsTyping(true);

    const modePrefix = MODE_SYSTEM[selectedMode] ? `[${selectedMode} mode] ` : '';
    const userAIMsg: AIMessage = { role: 'user', content: modePrefix + trimmed };
    const newHistory = [...aiHistory, userAIMsg];

    try {
      const reply = await sendToAI(selectedModel, newHistory);
      const assistantMsg: AIMessage = { role: 'assistant', content: reply };
      setAiHistory([...newHistory, assistantMsg]);
      const replyMsg: DisplayMessage = {
        id: (Date.now() + 1).toString(),
        text: reply,
        isUser: false,
        time: new Date().toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' }),
      };
      setMessages(prev => [...prev, replyMsg]);
      if (voiceEnabled) voice.speak(reply);
    } catch (err: any) {
      const errText = err.message?.includes('No API key')
        ? "No API key found. Go to Settings → add your key for the selected model."
        : `Error: ${err.message}`;
      setMessages(prev => [
        ...prev,
        { id: (Date.now() + 1).toString(), text: errText, isUser: false,
          time: new Date().toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' }) },
      ]);
    } finally {
      setIsTyping(false);
    }
  };

  const sendMessage = () => sendMessageWithText(inputText);

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
          <View style={{ flexDirection: 'row', gap: 4 }}>
            <TouchableOpacity style={styles.clearButton} onPress={() => setVoiceEnabled(v => !v)}>
              {voiceEnabled
                ? <Volume2 color={Colors.primary} size={18} />
                : <VolumeX color={Colors.textTertiary} size={18} />}
            </TouchableOpacity>
            <TouchableOpacity style={styles.clearButton} onPress={clearChat}>
              <Trash2 color={Colors.textTertiary} size={18} />
            </TouchableOpacity>
          </View>
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

        {voice.state === 'listening' && (
          <View style={styles.listeningBar}>
            <View style={styles.listeningDots}>
              {[0,1,2,3,4].map(i => (
                <View key={i} style={[styles.listeningDot, { opacity: 0.4 + i * 0.12 }]} />
              ))}
            </View>
            <Text style={styles.listeningText}>
              {voice.transcript || 'Listening...'}
            </Text>
          </View>
        )}
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.inputContainer}>
          <View style={styles.inputRow}>
            <TouchableOpacity
              onPress={voice.toggle}
              style={[styles.micButton, voice.isListening && styles.micButtonActive]}
            >
              {voice.isListening
                ? <MicOff color={Colors.background} size={18} />
                : <Mic color={Colors.primary} size={18} />}
            </TouchableOpacity>
            <View style={styles.inputWrapper}>
              <TextInput
                style={styles.input}
                placeholder={voice.isListening ? 'Listening...' : MODE_HINTS[selectedMode]}
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
  micButton: {
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: Colors.surface, borderWidth: 1, borderColor: Colors.border,
    alignItems: 'center', justifyContent: 'center',
  },
  micButtonActive: {
    backgroundColor: Colors.primary, borderColor: Colors.primary,
    shadowColor: Colors.primary, shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.6, shadowRadius: 10, elevation: 6,
  },
  listeningBar: {
    flexDirection: 'row', alignItems: 'center', gap: Spacing.sm,
    marginHorizontal: Spacing.lg, marginBottom: Spacing.sm,
    backgroundColor: 'rgba(0, 229, 255, 0.08)',
    borderRadius: BorderRadius.lg, borderWidth: 1, borderColor: Colors.primary,
    paddingHorizontal: Spacing.md, paddingVertical: Spacing.sm,
  },
  listeningDots: { flexDirection: 'row', gap: 3, alignItems: 'center' },
  listeningDot: {
    width: 4, height: 12, borderRadius: 2, backgroundColor: Colors.primary,
  },
  listeningText: { flex: 1, fontSize: FontSizes.sm, color: Colors.primary, fontStyle: 'italic' },
});
