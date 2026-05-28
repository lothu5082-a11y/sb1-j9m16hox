import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TextInput, TouchableOpacity,
  Animated, KeyboardAvoidingView, Platform, Pressable, Dimensions,
  ActivityIndicator, Modal, Alert,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as ImagePicker from 'expo-image-picker';
import * as DocumentPicker from 'expo-document-picker';
import {
  Menu, Plus, Settings, Mic, MicOff, Send, Image as ImageIcon,
  Paperclip, Camera, Volume2, VolumeX, WifiOff, Wifi, Sparkles,
  ChevronDown, Wrench, Search,
} from 'lucide-react-native';
import { Colors, Spacing, FontSizes, BorderRadius } from '../../constants/theme';
import Sidebar, { Conversation } from '../../components/Sidebar';
import MessageBubble, { DisplayMessage } from '../../components/MessageBubble';
import WelcomeView from '../../components/WelcomeView';
import SettingsModal from '../../components/SettingsModal';
import ToolsPanel from '../../components/ToolsPanel';
import SearchModal from '../../components/SearchModal';
import { useVoice } from '../../hooks/useVoice';
import {
  sendToAI, Message as AIMessage, checkConnectivity,
  invalidateConnectivityCache, generateImage, SPECIALISTS,
} from '../../lib/ai';
import { storage } from '../../lib/storage';

const { width: SCREEN_W } = Dimensions.get('window');
const SIDEBAR_W = Math.min(300, SCREEN_W * 0.82);

const MODEL_LABELS: Record<string, string> = {
  free: 'Free AI', ollama: 'Ollama', gemini: 'Gemini',
  groq: 'Groq', openai: 'GPT-4o', claude: 'Claude',
};

function genId() { return `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`; }

// ── Typing indicator ───────────────────────────────────────────────────────

function TypingIndicator() {
  const dot1 = useRef(new Animated.Value(0.3)).current;
  const dot2 = useRef(new Animated.Value(0.3)).current;
  const dot3 = useRef(new Animated.Value(0.3)).current;

  useEffect(() => {
    const anim = (d: Animated.Value, delay: number) =>
      Animated.loop(
        Animated.sequence([
          Animated.delay(delay),
          Animated.timing(d, { toValue: 1, duration: 380, useNativeDriver: true }),
          Animated.timing(d, { toValue: 0.3, duration: 380, useNativeDriver: true }),
          Animated.delay(760 - delay),
        ])
      );
    const a1 = anim(dot1, 0); const a2 = anim(dot2, 190); const a3 = anim(dot3, 380);
    a1.start(); a2.start(); a3.start();
    return () => { a1.stop(); a2.stop(); a3.stop(); };
  }, []);

  return (
    <View style={ty.row}>
      <View style={ty.avatar}><Sparkles color={Colors.primary} size={13} /></View>
      <View style={ty.bubble}>
        {[dot1, dot2, dot3].map((d, i) => (
          <Animated.View key={i} style={[ty.dot, { opacity: d }]} />
        ))}
      </View>
    </View>
  );
}

const ty = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: Spacing.md, marginBottom: Spacing.md, gap: Spacing.sm },
  avatar: { width: 30, height: 30, borderRadius: 15, backgroundColor: 'rgba(0,212,255,0.12)', borderWidth: 1, borderColor: 'rgba(0,212,255,0.3)', alignItems: 'center', justifyContent: 'center' },
  bubble: { flexDirection: 'row', gap: 5, alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.05)', borderWidth: 1, borderColor: Colors.border, borderRadius: 18, borderTopLeftRadius: 4, paddingHorizontal: 14, paddingVertical: 14 },
  dot: { width: 7, height: 7, borderRadius: 3.5, backgroundColor: Colors.primary },
});

// ── Main screen ────────────────────────────────────────────────────────────

export default function ChatScreen() {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeConvId, setActiveConvId] = useState(() => genId());
  const [messages, setMessages] = useState<DisplayMessage[]>([]);
  const [aiHistory, setAiHistory] = useState<AIMessage[]>([]);
  const [inputText, setInputText] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [selectedModel, setSelectedModel] = useState('free');
  const [voiceEnabled, setVoiceEnabled] = useState(true);
  const [isOnline, setIsOnline] = useState(true);
  const [lastMode, setLastMode] = useState<'online' | 'offline'>('online');
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [settingsVisible, setSettingsVisible] = useState(false);
  const [settingsTab, setSettingsTab] = useState<'general' | 'api' | 'voice' | 'memory'>('general');
  const [modelPickerVisible, setModelPickerVisible] = useState(false);
  const [specialist, setSpecialist] = useState('general');
  const [specialistPickerVisible, setSpecialistPickerVisible] = useState(false);
  const [toolsVisible, setToolsVisible] = useState(false);
  const [searchVisible, setSearchVisible] = useState(false);

  const scrollRef = useRef<ScrollView>(null);
  const sidebarAnim = useRef(new Animated.Value(-SIDEBAR_W)).current;
  const overlayAnim = useRef(new Animated.Value(0)).current;

  const voice = useVoice({
    onResult: (text) => {
      setInputText(text);
      setTimeout(() => sendMessageWithText(text), 350);
    },
  });

  // ── Boot ──────────────────────────────────────────────────────────────────

  useEffect(() => {
    (async () => {
      const convs = await storage.getJSON<Conversation[]>('vexora:conversations', []);
      setConversations(convs);
      const model = await storage.getJSON<string>('vexora:selected_model', 'free');
      setSelectedModel(model ?? 'free');
      setIsOnline(await checkConnectivity());
    })();
    const iv = setInterval(async () => {
      invalidateConnectivityCache();
      setIsOnline(await checkConnectivity());
    }, 15000);
    return () => clearInterval(iv);
  }, []);

  const saveConversations = useCallback(async (convs: Conversation[]) => {
    await storage.setJSON('vexora:conversations', convs);
  }, []);

  // ── Sidebar ───────────────────────────────────────────────────────────────

  const openSidebar = () => {
    setSidebarOpen(true);
    Animated.parallel([
      Animated.spring(sidebarAnim, { toValue: 0, useNativeDriver: true, damping: 20, stiffness: 200 }),
      Animated.timing(overlayAnim, { toValue: 1, duration: 240, useNativeDriver: true }),
    ]).start();
  };

  const closeSidebar = () => {
    Animated.parallel([
      Animated.timing(sidebarAnim, { toValue: -SIDEBAR_W, duration: 210, useNativeDriver: true }),
      Animated.timing(overlayAnim, { toValue: 0, duration: 190, useNativeDriver: true }),
    ]).start(() => setSidebarOpen(false));
  };

  // ── Conversations ─────────────────────────────────────────────────────────

  const startNewChat = useCallback(() => {
    const id = genId();
    setActiveConvId(id);
    setMessages([]);
    setAiHistory([]);
  }, []);

  const selectConversation = useCallback(async (id: string) => {
    setActiveConvId(id);
    const msgs = await storage.getJSON<DisplayMessage[]>(`vexora:msgs:${id}`, []);
    const hist = await storage.getJSON<AIMessage[]>(`vexora:hist:${id}`, []);
    setMessages(msgs);
    setAiHistory(hist);
  }, []);

  const deleteConversation = useCallback((id: string) => {
    setConversations(prev => {
      const updated = prev.filter(c => c.id !== id);
      saveConversations(updated);
      if (id === activeConvId) { setMessages([]); setAiHistory([]); setActiveConvId(genId()); }
      return updated;
    });
  }, [activeConvId, saveConversations]);

  const starConversation = useCallback((id: string) => {
    setConversations(prev => {
      const updated = prev.map(c => c.id === id ? { ...c, starred: !c.starred } : c);
      saveConversations(updated);
      return updated;
    });
  }, [saveConversations]);

  // ── Send ──────────────────────────────────────────────────────────────────

  const sendMessageWithText = useCallback(async (text: string) => {
    if (!text.trim() || isTyping) return;
    const trimmed = text.trim();

    // Image generation command
    const imageMatch = trimmed.match(/^\/image\s+(.+)/i);
    if (imageMatch) {
      const prompt = imageMatch[1];
      const userMsg: DisplayMessage = {
        id: genId(), text: trimmed, isUser: true,
        time: new Date().toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' }),
      };
      setMessages(prev => [...prev, userMsg]);
      setInputText('');
      setIsTyping(true);
      try {
        const imgUrl = await generateImage(prompt);
        const replyMsg: DisplayMessage = {
          id: genId(), text: `Generated image for: *${prompt}*`, isUser: false,
          imageUrl: imgUrl,
          time: new Date().toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' }),
        };
        setMessages(prev => {
          const updated = [...prev, replyMsg];
          storage.setJSON(`vexora:msgs:${activeConvId}`, updated);
          return updated;
        });
      } catch (err: any) {
        setMessages(prev => [...prev, {
          id: genId(), text: `Image generation failed: ${err.message}`, isUser: false,
          time: new Date().toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' }),
        }]);
      } finally {
        setIsTyping(false);
      }
      return;
    }

    const userMsg: DisplayMessage = {
      id: genId(), text: trimmed, isUser: true,
      time: new Date().toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' }),
    };
    const newMessages = [...messages, userMsg];
    setMessages(newMessages);
    setInputText('');
    setIsTyping(true);

    const userAIMsg: AIMessage = { role: 'user', content: trimmed };
    const newHistory = [...aiHistory, userAIMsg];

    try {
      const { reply, mode } = await sendToAI(selectedModel, newHistory, specialist);
      setLastMode(mode);
      setIsOnline(mode === 'online');

      const assistantAIMsg: AIMessage = { role: 'assistant', content: reply };
      const finalHistory = [...newHistory, assistantAIMsg];
      setAiHistory(finalHistory);

      const replyMsg: DisplayMessage = {
        id: genId(), text: reply, isUser: false,
        time: new Date().toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' }),
      };
      const finalMessages = [...newMessages, replyMsg];
      setMessages(finalMessages);

      await storage.setJSON(`vexora:msgs:${activeConvId}`, finalMessages);
      await storage.setJSON(`vexora:hist:${activeConvId}`, finalHistory);

      const title = trimmed.length > 40 ? trimmed.slice(0, 40) + '…' : trimmed;
      setConversations(prev => {
        const exists = prev.find(c => c.id === activeConvId);
        let updated: Conversation[];
        if (exists) {
          updated = prev.map(c => c.id === activeConvId
            ? { ...c, title, preview: reply.slice(0, 50), updatedAt: Date.now(), model: selectedModel }
            : c
          );
        } else {
          updated = [{ id: activeConvId, title, preview: reply.slice(0, 50), createdAt: Date.now(), updatedAt: Date.now(), starred: false, model: selectedModel }, ...prev];
        }
        saveConversations(updated);
        return updated;
      });

      if (voiceEnabled) voice.speak(reply);
    } catch (err: any) {
      const errText = err.message?.includes('No API key')
        ? "No API key found. Go to Settings → AI Keys to add one, or use Free AI."
        : `Error: ${err.message}`;
      setMessages(prev => [...prev, {
        id: genId(), text: errText, isUser: false,
        time: new Date().toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' }),
      }]);
    } finally {
      setIsTyping(false);
    }
  }, [messages, aiHistory, isTyping, selectedModel, specialist, activeConvId, voiceEnabled, voice, saveConversations]);

  const sendMessage = () => sendMessageWithText(inputText);

  const regenerateLast = useCallback(() => {
    const lastUser = [...aiHistory].reverse().find(m => m.role === 'user');
    if (!lastUser) return;
    const trimmedHist = aiHistory.slice(0, -1);
    setMessages(prev => prev.slice(0, -1));
    setAiHistory(trimmedHist);
    setTimeout(() => sendMessageWithText(lastUser.content), 80);
  }, [aiHistory, sendMessageWithText]);

  // ── Media pickers ─────────────────────────────────────────────────────────

  const pickImage = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') { Alert.alert('Permission needed', 'Allow photo library access.'); return; }
    const r = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], quality: 0.8 });
    if (!r.canceled) sendMessageWithText(`[Photo attached: ${r.assets[0].fileName ?? 'image.jpg'}]\nPlease describe or analyze this image.`);
  };

  const pickCamera = async () => {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== 'granted') { Alert.alert('Permission needed', 'Allow camera access.'); return; }
    const r = await ImagePicker.launchCameraAsync({ quality: 0.8 });
    if (!r.canceled) sendMessageWithText(`[Camera photo taken]\nPlease describe or analyze this image.`);
  };

  const pickDocument = async () => {
    try {
      const r = await DocumentPicker.getDocumentAsync({ type: '*/*', copyToCacheDirectory: false });
      if (!r.canceled && r.assets?.[0]) sendMessageWithText(`[File: ${r.assets[0].name}]\nPlease summarize or answer questions about this document.`);
    } catch {}
  };

  const MODELS = [
    { id: 'free', label: 'Free AI', color: Colors.success },
    { id: 'ollama', label: 'Ollama', color: Colors.primary },
    { id: 'gemini', label: 'Gemini', color: '#4285F4' },
    { id: 'groq', label: 'Groq', color: '#F59E0B' },
    { id: 'openai', label: 'GPT-4o', color: '#10B981' },
    { id: 'claude', label: 'Claude', color: '#CC785C' },
  ];

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <View style={s.root}>
      {/* Sidebar overlay */}
      {sidebarOpen && (
        <Animated.View style={[s.overlay, { opacity: overlayAnim }]} pointerEvents="auto">
          <Pressable style={StyleSheet.absoluteFill} onPress={closeSidebar} />
        </Animated.View>
      )}

      {/* Sidebar */}
      <Animated.View style={[s.sidebar, { width: SIDEBAR_W, transform: [{ translateX: sidebarAnim }] }]}>
        <Sidebar
          conversations={conversations}
          activeId={activeConvId}
          onSelectConversation={selectConversation}
          onNewChat={startNewChat}
          onDeleteConversation={deleteConversation}
          onStarConversation={starConversation}
          onOpenSettings={() => { closeSidebar(); setSettingsTab('general'); setSettingsVisible(true); }}
          onOpenMemory={() => { closeSidebar(); setSettingsTab('memory'); setSettingsVisible(true); }}
          onOpenVoiceSettings={() => { closeSidebar(); setSettingsTab('voice'); setSettingsVisible(true); }}
          onClose={closeSidebar}
        />
      </Animated.View>

      {/* Main */}
      <View style={s.main}>
        {/* Top bar */}
        <SafeAreaView edges={['top']} style={s.safeTop}>
          <View style={s.topBar}>
            <TouchableOpacity style={s.topBtn} onPress={openSidebar}>
              <Menu color={Colors.text} size={22} />
            </TouchableOpacity>

            <TouchableOpacity style={s.brandArea} onPress={() => setModelPickerVisible(true)}>
              <View style={s.brandRow}>
                <View style={s.brandIcon}>
                  <Sparkles color={Colors.primary} size={13} />
                </View>
                <Text style={s.brandName}>Vexora</Text>
              </View>
              <View style={s.statusRow}>
                <View style={[s.statusDot, { backgroundColor: isOnline ? Colors.success : Colors.warning }]} />
                <Text style={s.statusText}>{isOnline ? 'Online' : 'Offline'} · {MODEL_LABELS[selectedModel]} · {SPECIALISTS[specialist]?.emoji ?? '✨'}</Text>
                <ChevronDown color={Colors.textTertiary} size={11} />
              </View>
            </TouchableOpacity>

            <View style={s.topRight}>
              <TouchableOpacity style={s.topBtn} onPress={() => setSearchVisible(true)}>
                <Search color={Colors.textSecondary} size={20} />
              </TouchableOpacity>
              <TouchableOpacity style={s.topBtn} onPress={() => setVoiceEnabled(v => !v)}>
                {voiceEnabled ? <Volume2 color={Colors.primary} size={20} /> : <VolumeX color={Colors.textTertiary} size={20} />}
              </TouchableOpacity>
              <TouchableOpacity style={s.topBtn} onPress={startNewChat}>
                <Plus color={Colors.text} size={22} />
              </TouchableOpacity>
              <TouchableOpacity style={s.topBtn} onPress={() => { setSettingsTab('general'); setSettingsVisible(true); }}>
                <Settings color={Colors.text} size={20} />
              </TouchableOpacity>
            </View>
          </View>
        </SafeAreaView>

        {/* Content */}
        {messages.length === 0 && !isTyping ? (
          <WelcomeView isOnline={isOnline} onQuickAction={(p) => setInputText(p)} />
        ) : (
          <ScrollView
            ref={scrollRef}
            style={s.msgs}
            contentContainerStyle={s.msgsContent}
            onContentSizeChange={() => scrollRef.current?.scrollToEnd({ animated: true })}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
          >
            {messages.map((msg, idx) => (
              <MessageBubble
                key={msg.id}
                message={msg}
                onRegenerate={!msg.isUser && idx === messages.length - 1 ? regenerateLast : undefined}
              />
            ))}
            {isTyping && <TypingIndicator />}
          </ScrollView>
        )}

        {/* Offline banner */}
        {lastMode === 'offline' && messages.length > 0 && (
          <View style={s.offlineBanner}>
            <WifiOff color={Colors.warning} size={12} />
            <Text style={s.offlineText}>Offline mode — connect for full AI power</Text>
          </View>
        )}

        {/* Listening bar */}
        {voice.state === 'listening' && (
          <View style={s.listenBar}>
            <View style={s.listenDots}>
              {[0, 1, 2, 3, 4].map(i => (
                <View key={i} style={[s.listenDot, { opacity: 0.3 + i * 0.15 }]} />
              ))}
            </View>
            <Text style={s.listenText} numberOfLines={1}>
              {voice.transcript || 'Listening...'}
            </Text>
            <TouchableOpacity onPress={voice.stopListening}>
              <MicOff color={Colors.error} size={16} />
            </TouchableOpacity>
          </View>
        )}

        {/* Input */}
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={s.inputArea}>
          <View style={s.inputRow}>
            <View style={s.inputWrap}>
              <TextInput
                style={s.input}
                placeholder={voice.state === 'listening' ? 'Listening...' : 'Message Vexora...'}
                placeholderTextColor={Colors.textTertiary}
                value={inputText}
                onChangeText={setInputText}
                multiline
                maxLength={4000}
              />
            </View>
            <TouchableOpacity onPress={sendMessage} disabled={!inputText.trim() || isTyping}>
              <LinearGradient
                colors={inputText.trim() && !isTyping ? [Colors.primary, Colors.purple] : ['rgba(255,255,255,0.06)', 'rgba(255,255,255,0.06)']}
                style={s.sendBtn}
                start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
              >
                {isTyping
                  ? <ActivityIndicator color="#fff" size="small" />
                  : <Send color={inputText.trim() && !isTyping ? '#fff' : Colors.textTertiary} size={18} />}
              </LinearGradient>
            </TouchableOpacity>
          </View>

          <View style={s.actionRow}>
            <TouchableOpacity style={[s.actionBtn, voice.isListening && s.actionBtnMic]} onPress={voice.toggle}>
              {voice.isListening ? <MicOff color="#fff" size={18} /> : <Mic color={Colors.textSecondary} size={18} />}
            </TouchableOpacity>
            <TouchableOpacity style={s.actionBtn} onPress={pickCamera}>
              <Camera color={Colors.textSecondary} size={18} />
            </TouchableOpacity>
            <TouchableOpacity style={s.actionBtn} onPress={pickImage}>
              <ImageIcon color={Colors.textSecondary} size={18} />
            </TouchableOpacity>
            <TouchableOpacity style={s.actionBtn} onPress={pickDocument}>
              <Paperclip color={Colors.textSecondary} size={18} />
            </TouchableOpacity>
            <TouchableOpacity style={s.actionBtn} onPress={() => setToolsVisible(true)}>
              <Wrench color={Colors.textSecondary} size={18} />
            </TouchableOpacity>
            <TouchableOpacity
              style={[s.actionBtn, specialist !== 'general' && s.actionBtnActive]}
              onPress={() => setSpecialistPickerVisible(true)}
            >
              <Text style={[s.specialistEmoji, specialist !== 'general' && { opacity: 1 }]}>
                {SPECIALISTS[specialist]?.emoji ?? '✨'}
              </Text>
            </TouchableOpacity>
            <View style={{ flex: 1 }} />
            <View style={s.connBadge}>
              {isOnline ? <Wifi color={Colors.success} size={12} /> : <WifiOff color={Colors.warning} size={12} />}
              <Text style={[s.connText, { color: isOnline ? Colors.success : Colors.warning }]}>
                {isOnline ? 'Online' : 'Offline'}
              </Text>
            </View>
          </View>
        </KeyboardAvoidingView>
      </View>

      {/* Model picker */}
      <Modal visible={modelPickerVisible} transparent animationType="slide" onRequestClose={() => setModelPickerVisible(false)}>
        <Pressable style={s.pickerOverlay} onPress={() => setModelPickerVisible(false)}>
          <View style={s.pickerSheet}>
            <View style={s.handle} />
            <Text style={s.pickerTitle}>Select AI Model</Text>
            {MODELS.map(m => (
              <TouchableOpacity
                key={m.id}
                style={[s.pickerRow, selectedModel === m.id && s.pickerRowActive]}
                onPress={async () => {
                  setSelectedModel(m.id);
                  await storage.setJSON('vexora:selected_model', m.id);
                  setModelPickerVisible(false);
                }}
              >
                <View style={[s.pickerDot, { backgroundColor: m.color }]} />
                <Text style={[s.pickerLabel, selectedModel === m.id && { color: Colors.primary }]}>{m.label}</Text>
                {selectedModel === m.id && <Text style={{ color: Colors.primary, fontWeight: '700' }}>✓</Text>}
              </TouchableOpacity>
            ))}
          </View>
        </Pressable>
      </Modal>

      {/* Settings */}
      <SettingsModal
        visible={settingsVisible}
        onClose={() => setSettingsVisible(false)}
        selectedModel={selectedModel}
        onModelChange={async (m) => { setSelectedModel(m); await storage.setJSON('vexora:selected_model', m); }}
        voiceEnabled={voiceEnabled}
        onVoiceToggle={setVoiceEnabled}
        activeTab={settingsTab}
      />

      {/* Tools panel */}
      <ToolsPanel
        visible={toolsVisible}
        onClose={() => setToolsVisible(false)}
        onSendToChat={sendMessageWithText}
        selectedModel={selectedModel}
      />

      {/* Universal search */}
      <SearchModal
        visible={searchVisible}
        onClose={() => setSearchVisible(false)}
        onSelectConversation={(id) => { selectConversation(id); closeSidebar(); }}
      />

      {/* Specialist picker */}
      <Modal visible={specialistPickerVisible} transparent animationType="slide" onRequestClose={() => setSpecialistPickerVisible(false)}>
        <Pressable style={s.pickerOverlay} onPress={() => setSpecialistPickerVisible(false)}>
          <View style={s.pickerSheet}>
            <View style={s.handle} />
            <Text style={s.pickerTitle}>AI Specialist Mode</Text>
            {Object.entries(SPECIALISTS).map(([key, spec]) => (
              <TouchableOpacity
                key={key}
                style={[s.pickerRow, specialist === key && s.pickerRowActive]}
                onPress={() => { setSpecialist(key); setSpecialistPickerVisible(false); }}
              >
                <Text style={s.specEmoji}>{spec.emoji}</Text>
                <Text style={[s.pickerLabel, specialist === key && { color: Colors.primary }]}>{spec.label}</Text>
                {specialist === key && <Text style={{ color: Colors.primary, fontWeight: '700' }}>✓</Text>}
              </TouchableOpacity>
            ))}
          </View>
        </Pressable>
      </Modal>
    </View>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: Colors.background },
  overlay: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.65)', zIndex: 10 },
  sidebar: { position: 'absolute', top: 0, bottom: 0, left: 0, zIndex: 20 },
  main: { flex: 1 },

  safeTop: { backgroundColor: 'rgba(5,5,8,0.97)' },
  topBar: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: Spacing.xs, paddingBottom: Spacing.sm, borderBottomWidth: 1, borderBottomColor: Colors.border, gap: Spacing.xs },
  topBtn: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(255,255,255,0.04)' },
  brandArea: { flex: 1, alignItems: 'center' },
  brandRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  brandIcon: { width: 22, height: 22, borderRadius: 11, backgroundColor: 'rgba(0,212,255,0.12)', alignItems: 'center', justifyContent: 'center' },
  brandName: { fontSize: FontSizes.lg, fontWeight: '700', color: Colors.text, fontFamily: 'Orbitron-Bold' },
  statusRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 2 },
  statusDot: { width: 5, height: 5, borderRadius: 2.5 },
  statusText: { fontSize: FontSizes.xs, color: Colors.textTertiary },
  topRight: { flexDirection: 'row', gap: 2 },

  msgs: { flex: 1 },
  msgsContent: { paddingVertical: Spacing.md, paddingBottom: Spacing.xl },

  offlineBanner: { flexDirection: 'row', alignItems: 'center', gap: 6, marginHorizontal: Spacing.md, marginBottom: 6, paddingHorizontal: Spacing.md, paddingVertical: 7, backgroundColor: 'rgba(245,158,11,0.07)', borderRadius: BorderRadius.md, borderWidth: 1, borderColor: 'rgba(245,158,11,0.18)' },
  offlineText: { fontSize: FontSizes.xs, color: Colors.warning },

  listenBar: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, marginHorizontal: Spacing.md, marginBottom: 8, paddingHorizontal: Spacing.md, paddingVertical: 10, backgroundColor: 'rgba(0,212,255,0.07)', borderRadius: BorderRadius.lg, borderWidth: 1, borderColor: 'rgba(0,212,255,0.22)' },
  listenDots: { flexDirection: 'row', gap: 3 },
  listenDot: { width: 3, height: 13, borderRadius: 2, backgroundColor: Colors.primary },
  listenText: { flex: 1, fontSize: FontSizes.sm, color: Colors.primary, fontStyle: 'italic' },

  inputArea: { paddingHorizontal: Spacing.md, paddingTop: Spacing.sm, paddingBottom: Spacing.lg, borderTopWidth: 1, borderTopColor: Colors.border, backgroundColor: 'rgba(5,5,8,0.97)', gap: Spacing.sm },
  inputRow: { flexDirection: 'row', alignItems: 'flex-end', gap: Spacing.sm },
  inputWrap: { flex: 1, backgroundColor: 'rgba(255,255,255,0.05)', borderWidth: 1, borderColor: Colors.border, borderRadius: BorderRadius.xl, paddingHorizontal: Spacing.md, maxHeight: 120 },
  input: { color: Colors.text, fontSize: FontSizes.md, paddingVertical: Spacing.sm + 2, lineHeight: 22 },
  sendBtn: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },

  actionRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.xs },
  actionBtn: { width: 38, height: 38, borderRadius: 19, backgroundColor: 'rgba(255,255,255,0.04)', borderWidth: 1, borderColor: Colors.border, alignItems: 'center', justifyContent: 'center' },
  actionBtnMic: { backgroundColor: Colors.error, borderColor: Colors.error },
  actionBtnActive: { backgroundColor: 'rgba(0,212,255,0.12)', borderColor: 'rgba(0,212,255,0.3)' },
  specialistEmoji: { fontSize: 16, opacity: 0.5 },
  connBadge: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  connText: { fontSize: FontSizes.xs, fontWeight: '600' },
  specEmoji: { fontSize: 18, width: 26, textAlign: 'center' },

  pickerOverlay: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.6)' },
  pickerSheet: { backgroundColor: '#0C0C14', borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: Spacing.lg, paddingBottom: Spacing.xl + 8, borderWidth: 1, borderColor: Colors.border },
  handle: { width: 36, height: 4, borderRadius: 2, backgroundColor: Colors.border, alignSelf: 'center', marginBottom: Spacing.md },
  pickerTitle: { fontSize: FontSizes.lg, fontWeight: '700', color: Colors.text, marginBottom: Spacing.md },
  pickerRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md, paddingVertical: 12, paddingHorizontal: Spacing.md, borderRadius: BorderRadius.md, marginBottom: 2 },
  pickerRowActive: { backgroundColor: 'rgba(0,212,255,0.07)' },
  pickerDot: { width: 10, height: 10, borderRadius: 5 },
  pickerLabel: { flex: 1, fontSize: FontSizes.md, fontWeight: '600', color: Colors.text },
});
