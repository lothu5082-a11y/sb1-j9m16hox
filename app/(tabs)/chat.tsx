import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TextInput,
  TouchableOpacity, KeyboardAvoidingView, Platform,
  Linking, Dimensions, Alert,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, {
  FadeInUp, FadeInLeft, FadeInRight,
  useSharedValue, useAnimatedStyle,
  withRepeat, withSequence, withTiming,
  Easing,
} from 'react-native-reanimated';
import { useFocusEffect } from 'expo-router';
import { Send, Mic, Trash2, ChevronLeft } from 'lucide-react-native';
import Svg, { Path, Defs, LinearGradient as SvgLG, Stop } from 'react-native-svg';
import { router } from 'expo-router';
import { Colors, Spacing, FontSizes, BorderRadius } from '../../constants/theme';
import { llamaService } from '../../lib/llamaService';
import { memoryService } from '../../lib/memoryService';
import { knowledgeBase } from '../../lib/knowledgeBase';
import { buildSystemPrompt } from '../../lib/systemPrompt';
import { executeCommand, classifyIntent } from '../../lib/commandRouter';
import { voiceService } from '../../lib/voiceService';
import { webScraper } from '../../lib/webScraper';
import { aiService } from '../../lib/aiService';

const { width: W } = Dimensions.get('window');

// ── Module-level exports ──────────────────────────────────────────────────────
export { aiService as getAIConfig };
export const setAIConfig = (cfg: any) => aiService.setModelPath(cfg?.modelPath ?? '');

let _voiceReply = false;
export const setVoiceReplyEnabled = (v: boolean) => { _voiceReply = v; };
export const getVoiceReplyEnabled = () => _voiceReply;

let _wakeWordActive = false;
export const setWakeWordActive = (v: boolean) => { _wakeWordActive = v; };

let _userLang = 'en';
export const setUserLang = (lang: string) => { _userLang = lang; };
export const getUserLang = () => _userLang;

export const stopSpeaking = () => voiceService.stopSpeaking();

// ── Pending command bridge ────────────────────────────────────────────────────
let _pendingCmd: string | null = null;
export const setPendingCommand = (cmd: string) => { _pendingCmd = cmd; };
export const consumePendingCommand = (): string | null => {
  const c = _pendingCmd; _pendingCmd = null; return c;
};

// ── Message type ──────────────────────────────────────────────────────────────
interface Message { id: string; text: string; isUser: boolean; time: string; }

// ── Vexsora star icon ─────────────────────────────────────────────────────────
function VexsoraStar({ size = 20 }: { size?: number }) {
  const s = size, cx = s / 2, cy = s / 2, outer = s * 0.46, inner = s * 0.14;
  const pts: string[] = [];
  for (let i = 0; i < 8; i++) {
    const a = (i * Math.PI) / 4 - Math.PI / 2, r = i % 2 === 0 ? outer : inner;
    pts.push(`${cx + r * Math.cos(a)},${cy + r * Math.sin(a)}`);
  }
  return (
    <Svg width={s} height={s}>
      <Defs>
        <SvgLG id="sg" x1="0" y1="0" x2="1" y2="1">
          <Stop offset="0%" stopColor="#A855F7" stopOpacity="1" />
          <Stop offset="100%" stopColor="#3B82F6" stopOpacity="1" />
        </SvgLG>
      </Defs>
      <Path d={`M${pts.join('L')}Z`} fill="url(#sg)" />
    </Svg>
  );
}

// ── Typing dots ───────────────────────────────────────────────────────────────
function TypingDots() {
  const v0 = useSharedValue(0), v1 = useSharedValue(0), v2 = useSharedValue(0);
  const anim = (v: any, delay: number) => {
    setTimeout(() => {
      v.value = withRepeat(
        withSequence(
          withTiming(1, { duration: 380, easing: Easing.inOut(Easing.ease) }),
          withTiming(0, { duration: 380, easing: Easing.inOut(Easing.ease) })
        ), -1, false
      );
    }, delay);
  };
  useEffect(() => { anim(v0, 0); anim(v1, 180); anim(v2, 360); }, []);
  const s0 = useAnimatedStyle(() => ({ opacity: 0.3 + v0.value * 0.7, transform: [{ translateY: -v0.value * 4 }] }));
  const s1 = useAnimatedStyle(() => ({ opacity: 0.3 + v1.value * 0.7, transform: [{ translateY: -v1.value * 4 }] }));
  const s2 = useAnimatedStyle(() => ({ opacity: 0.3 + v2.value * 0.7, transform: [{ translateY: -v2.value * 4 }] }));
  return (
    <View style={{ flexDirection: 'row', gap: 5, paddingVertical: 6 }}>
      {[s0, s1, s2].map((s, i) => <Animated.View key={i} style={[{ width: 7, height: 7, borderRadius: 4, backgroundColor: Colors.primary }, s]} />)}
    </View>
  );
}

// ── Safe math ────────────────────────────────────────────────────────────────
const safeMath = (expr: string): number | null => {
  try {
    const c = expr.replace(/\s/g, '').replace(/\^/g, '**');
    if (!/^[\d+\-*/().%]+$/.test(c)) return null;
    // eslint-disable-next-line no-new-func
    const r = Function('"use strict"; return (' + c + ')')();
    return typeof r === 'number' && isFinite(r) ? r : null;
  } catch { return null; }
};

// ── All command handlers ──────────────────────────────────────────────────────
async function tryExecuteCommand(text: string): Promise<string | null> {
  const lower = text.toLowerCase().trim();

  // Smart hardware/intent router first
  const intent = classifyIntent(text);
  if (intent.action !== 'GENERAL_CHAT') {
    const result = await executeCommand(text);
    if (result) return result;
  }

  // Weather
  const wm = lower.match(/^(?:weather|forecast|temp(?:erature)?)\s+(?:in\s+|for\s+)?(.+)$/)
    || lower.match(/^(?:what'?s?\s+(?:the\s+)?weather(?:\s+like)?(?:\s+in)?\s*)(.+)$/);
  if (wm || lower === 'weather') {
    const city = wm ? wm[1].trim() : 'auto';
    try {
      const res = await fetch(`https://wttr.in/${encodeURIComponent(city)}?format=j1`);
      if (!res.ok) throw new Error('');
      const d = await res.json();
      const c = d.current_condition[0], a = d.nearest_area[0];
      return `Weather in ${a.areaName[0].value}, ${a.country[0].value}:\n\n🌡 ${c.temp_C}°C / ${c.temp_F}°F — ${c.weatherDesc[0].value}\nFeels like: ${c.FeelsLikeC}°C · Humidity: ${c.humidity}% · Wind: ${c.windspeedKmph} km/h`;
    } catch { return `Could not fetch weather for "${city}". Check connection.`; }
  }

  // Calculator
  const cm = lower.match(/^(?:calc(?:ulate)?|compute|solve)\s+(.+)$/)
    || lower.match(/^(?:what(?:'s|\s+is)\s+)?(.+[+\-*/^%].+)$/);
  if (cm) { const r = safeMath(cm[1]); if (r !== null) return `${cm[1].trim()} = ${Number.isInteger(r) ? r : +r.toFixed(6)}`; }
  if (/^[\d\s+\-*/().^%]+$/.test(lower) && /[+\-*/^%]/.test(lower)) {
    const r = safeMath(lower); if (r !== null) return `${lower.trim()} = ${Number.isInteger(r) ? r : +r.toFixed(6)}`;
  }

  // Battery (web)
  if (/battery/.test(lower) && Platform.OS === 'web') {
    try { const bat = await (navigator as any).getBattery?.(); if (bat) return `Battery: ${Math.round(bat.level * 100)}% ${bat.charging ? '⚡ Charging' : '🔋 Discharging'}`; } catch {}
  }

  // Timer
  const tm = lower.match(/^(?:set\s+(?:a\s+)?)?timer\s+(?:for\s+)?(\d+)\s*(min(?:utes?)?|sec(?:onds?)?|s|m)$/);
  if (tm) {
    const amt = parseInt(tm[1], 10), isMin = tm[2].startsWith('m');
    const ms = isMin ? amt * 60000 : amt * 1000;
    const label = `${amt} ${isMin ? 'minute' : 'second'}${amt !== 1 ? 's' : ''}`;
    setTimeout(() => Alert.alert('Vexsora ⏱️', `Your ${label} timer is up!`), ms);
    return `⏱️ Timer set for ${label}.`;
  }

  // Alarm
  if (/alarm|wake\s*me/.test(lower)) {
    if (Platform.OS === 'android') await Linking.openURL('android.intent.action.SET_ALARM').catch(() => null);
    return '⏰ Opening clock to set alarm...';
  }

  // Search
  const sm = lower.match(/^(?:search|google|find)\s+(.+)$/);
  if (sm) { await Linking.openURL(`https://google.com/search?q=${encodeURIComponent(sm[1])}`); return `Searching for "${sm[1]}"...`; }

  // YouTube
  const ym = lower.match(/^(?:youtube|yt|watch)\s+(.+)$/);
  if (ym) {
    const q = encodeURIComponent(ym[1]);
    const yd = `vnd.youtube://results?search_query=${q}`, yw = `https://www.youtube.com/results?search_query=${q}`;
    if (Platform.OS === 'android') { const can = await Linking.canOpenURL(yd).catch(() => false); await Linking.openURL(can ? yd : yw); }
    else await Linking.openURL(yw);
    return `▶️ Searching YouTube for "${ym[1]}"...`;
  }

  // Navigate
  const nm = lower.match(/^(?:navigate\s+to|directions?\s+to|take\s+me\s+to|go\s+to)\s+(.+)$/);
  if (nm) { await Linking.openURL(`https://maps.google.com/maps?daddr=${encodeURIComponent(nm[1])}`); return `🗺️ Navigating to ${nm[1]}...`; }

  // Call
  const callm = lower.match(/^call\s+(.+)$/);
  if (callm) { await Linking.openURL(`tel:${callm[1].replace(/\s/g, '')}`); return `📞 Calling ${callm[1]}...`; }

  // Translate
  const trm = lower.match(/^translate\s+(.+?)\s+(?:to|into)\s+(\w+)$/) || lower.match(/^translate\s+(.+)$/);
  if (trm) { await Linking.openURL(`https://translate.google.com/?text=${encodeURIComponent(trm[1])}&tl=${trm[2] ?? 'en'}`); return `Translating "${trm[1]}"...`; }

  // Coin/Dice
  if (/flip\s+(a\s+)?coin|^flip$/.test(lower)) return Math.random() < 0.5 ? '🪙 Heads!' : '🪙 Tails!';
  if (/roll\s+(a\s+)?dice?|^roll$/.test(lower)) return `🎲 You rolled: ${Math.floor(Math.random() * 6) + 1}`;

  // Password
  const pm = lower.match(/^(?:generate\s+(?:a\s+)?)?password\s*(\d*)$/);
  if (pm) {
    const len = Math.min(Math.max(parseInt(pm[1] || '16', 10) || 16, 8), 64);
    const ch = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789!@#$%&*';
    let pw = ''; for (let i = 0; i < len; i++) pw += ch[Math.floor(Math.random() * ch.length)];
    return `🔐 Password (${len}):\n${pw}`;
  }

  // Unit conversion
  const uvm = lower.match(/^convert\s+([\d.]+)\s+(\w+)\s+to\s+(\w+)$/);
  if (uvm) {
    const v = parseFloat(uvm[1]), k = `${uvm[2]} ${uvm[3]}`;
    const C: Record<string, [(n: number) => number, string, string]> = {
      'km miles': [(n) => n * 0.621371, 'km', 'miles'], 'miles km': [(n) => n * 1.60934, 'miles', 'km'],
      'kg lbs': [(n) => n * 2.20462, 'kg', 'lbs'], 'lbs kg': [(n) => n * 0.453592, 'lbs', 'kg'],
      'celsius fahrenheit': [(n) => n * 9 / 5 + 32, '°C', '°F'], 'fahrenheit celsius': [(n) => (n - 32) * 5 / 9, '°F', '°C'],
    };
    const c = C[k]; if (c && !isNaN(v)) return `${v} ${c[1]} = ${+c[0](v).toFixed(4)} ${c[2]}`;
  }

  // Time in city
  const tZ: Record<string, string> = {
    'london': 'Europe/London', 'paris': 'Europe/Paris', 'berlin': 'Europe/Berlin', 'rome': 'Europe/Rome',
    'new york': 'America/New_York', 'los angeles': 'America/Los_Angeles', 'chicago': 'America/Chicago',
    'toronto': 'America/Toronto', 'tokyo': 'Asia/Tokyo', 'beijing': 'Asia/Shanghai', 'seoul': 'Asia/Seoul',
    'dubai': 'Asia/Dubai', 'mumbai': 'Asia/Kolkata', 'india': 'Asia/Kolkata', 'singapore': 'Asia/Singapore',
    'sydney': 'Australia/Sydney', 'moscow': 'Europe/Moscow', 'istanbul': 'Europe/Istanbul',
    'hong kong': 'Asia/Hong_Kong', 'bangkok': 'Asia/Bangkok', 'jakarta': 'Asia/Jakarta',
  };
  const timem = lower.match(/^(?:time\s+in|what(?:'?s|\s+is)\s+(?:the\s+)?time\s+in)\s+(.+)$/);
  if (timem) {
    const city = timem[1].replace(/\?+$/, '').trim();
    const zone = tZ[city.toLowerCase()];
    if (zone) return `🕐 It's ${new Date().toLocaleTimeString('en-US', { timeZone: zone, hour: 'numeric', minute: '2-digit', hour12: true, weekday: 'short' })} in ${city.charAt(0).toUpperCase() + city.slice(1)}.`;
  }

  // Currency
  const fxm = lower.match(/^(\d+(?:\.\d+)?)\s+([a-z]{3})\s+(?:to|in)\s+([a-z]{3})$/);
  if (fxm) {
    try {
      const res = await fetch(`https://open.er-api.com/v6/latest/${fxm[2].toUpperCase()}`);
      const d = await res.json(); const rate = d.rates?.[fxm[3].toUpperCase()];
      if (rate) return `💱 ${fxm[1]} ${fxm[2].toUpperCase()} = ${(parseFloat(fxm[1]) * rate).toFixed(2)} ${fxm[3].toUpperCase()}`;
    } catch {}
  }

  // Wikipedia / self-learning
  const wkm = lower.match(/^(?:wiki(?:pedia)?\s+)(.+)$/) || lower.match(/^what\s+is\s+(.+?)(?:\?+)?$/);
  if (wkm) {
    try {
      const snippet = await webScraper.scrapeAndLearn(wkm[1]);
      if (snippet) {
        await knowledgeBase.addFact(snippet, 'web_scraped', [wkm[1]]);
        return `📚 ${snippet}\n\n*(Learned & saved offline)*`;
      }
    } catch {}
  }

  // Inspiration
  if (/inspire|motivate|quote/.test(lower)) {
    const q = [
      '"The only way to do great work is to love what you do." — Steve Jobs',
      '"Innovation distinguishes a leader from a follower." — Steve Jobs',
      '"In the middle of difficulty lies opportunity." — Einstein',
      '"The future belongs to those who believe in their dreams." — Roosevelt',
      '"It does not matter how slowly you go as long as you do not stop." — Confucius',
    ];
    return q[Math.floor(Math.random() * q.length)];
  }

  // WhatsApp text
  const wam = lower.match(/(?:text|message)\s+(.+?)\s+(?:on\s+whatsapp\s+)?(?:saying|say|:)\s+(.+)/);
  if (wam) { await Linking.openURL(`https://wa.me/?text=${encodeURIComponent(wam[2])}`); return `💬 Opening WhatsApp to text ${wam[1]}: "${wam[2]}"`; }

  // Open app
  const oom = lower.match(/^(?:open|launch|start)\s+(.+)$/);
  if (oom) {
    const n = oom[1].trim().toLowerCase();
    const urls: Record<string, string> = {
      youtube: 'vnd.youtube://', whatsapp: 'whatsapp://', telegram: 'tg://',
      instagram: 'instagram://', spotify: 'spotify://', settings: 'android.settings.SETTINGS',
      gmail: 'googlegmail://', maps: 'comgooglemaps://',
    };
    const u = urls[n];
    if (u) { const can = await Linking.canOpenURL(u).catch(() => false); await Linking.openURL(can ? u : `https://${n}.com`); return `📱 Opening ${oom[1]}...`; }
    await Linking.openURL(`https://${n}.com`).catch(() => null);
    return `📱 Trying to open ${oom[1]}...`;
  }

  // Percentage
  const pctm = lower.match(/^(\d+(?:\.\d+)?)\s*(?:%|percent)\s+of\s+(\d+(?:\.\d+)?)$/);
  if (pctm) { const r = (parseFloat(pctm[1]) / 100) * parseFloat(pctm[2]); return `${pctm[1]}% of ${pctm[2]} = ${Number.isInteger(r) ? r : +r.toFixed(4)}`; }

  // Random number
  const rndm = lower.match(/^(?:random\s+(?:number\s+)?)?between\s+(\d+)\s+and\s+(\d+)$/);
  if (rndm) { const mn = parseInt(rndm[1], 10), mx = parseInt(rndm[2], 10); return `🎲 Random: ${Math.floor(Math.random() * (mx - mn + 1)) + mn}`; }

  // Time / date
  if (/what.*time|current time/.test(lower)) return `🕐 It's ${new Date().toLocaleTimeString()}.`;
  if (/what.*date|today/.test(lower)) return `📅 Today is ${new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}.`;

  return null;
}

// ── Main Chat Screen ──────────────────────────────────────────────────────────
export default function ChatScreen() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [streamText, setStreamText] = useState('');
  const [modelReady, setModelReady] = useState(false);
  const [modelPath, setModelPath] = useState(
    'file:///storage/emulated/0/Download/Llama-3.2-1B-Instruct-Q4_K_M.gguf'
  );
  const [showModelBanner, setShowModelBanner] = useState(false);
  const scrollRef = useRef<ScrollView>(null);
  const inputRef = useRef<TextInput>(null);

  useEffect(() => { setModelReady(llamaService.isLoaded()); }, []);

  useFocusEffect(useCallback(() => {
    const cmd = consumePendingCommand();
    if (cmd) setTimeout(() => sendMessage(cmd), 120);
  }, []));

  const scrollToBottom = () => setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 80);

  const addMsg = (text: string, isUser: boolean): Message => {
    const msg: Message = {
      id: `m${Date.now()}${Math.random().toString(36).slice(2, 5)}`,
      text, isUser,
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };
    setMessages(prev => [...prev, msg]);
    scrollToBottom();
    return msg;
  };

  const loadModel = async () => {
    try {
      setIsLoading(true);
      await llamaService.load(modelPath);
      setModelReady(true);
      setShowModelBanner(false);
      addMsg('✅ Model loaded! Running 100% offline.', false);
    } catch (e: any) {
      addMsg(`❌ Failed to load model: ${e.message}\n\nPath tried:\n${modelPath}`, false);
    } finally { setIsLoading(false); }
  };

  const sendMessage = async (text?: string) => {
    const q = (text ?? input).trim();
    if (!q || isLoading) return;
    setInput('');
    addMsg(q, true);

    const correction = knowledgeBase.detectCorrection(q);
    if (correction) await knowledgeBase.addFact(correction, 'user_correction', ['profile']);
    await memoryService.addMessage('user', q);
    setIsLoading(true);

    try {
      const cmdResult = await tryExecuteCommand(q);
      if (cmdResult) {
        setIsLoading(false);
        addMsg(cmdResult, false);
        memoryService.addMessage('assistant', cmdResult);
        if (_voiceReply) voiceService.speak(cmdResult);
        return;
      }
    } catch { /* continue to LLM */ }

    if (llamaService.isLoaded()) {
      const profile = memoryService.getProfile();
      const facts = knowledgeBase.getRelevantFacts(q, 5).map(f => f.content);
      const sysP = buildSystemPrompt(profile, facts, []);
      const hist = memoryService.getHistory(8).map(m => ({ role: m.role as 'user' | 'assistant', content: m.content }));
      let streamed = '';
      setStreamText('');
      try {
        const response = await llamaService.completion(sysP, hist, (token) => {
          streamed += token; setStreamText(streamed); scrollToBottom();
        });
        setStreamText('');
        setIsLoading(false);
        addMsg(response, false);
        memoryService.addMessage('assistant', response);
        if (_voiceReply) voiceService.speak(response);
      } catch (e: any) {
        setStreamText(''); setIsLoading(false);
        addMsg(`⚠️ ${e.message}`, false);
      }
    } else {
      const fallback = aiService.localFallback(q);
      setIsLoading(false);
      addMsg(fallback, false);
      memoryService.addMessage('assistant', fallback);
      if (!showModelBanner) setShowModelBanner(true);
    }
  };

  const clearChat = () => { setMessages([]); memoryService.clearHistory(); };

  return (
    <KeyboardAvoidingView
      style={st.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <LinearGradient colors={[Colors.background, Colors.backgroundTertiary]} style={StyleSheet.absoluteFill} pointerEvents="none" />

      {/* Header */}
      <View style={st.header}>
        <TouchableOpacity style={st.backBtn} onPress={() => router.back()} hitSlop={12}>
          <ChevronLeft color={Colors.textSecondary} size={20} />
        </TouchableOpacity>
        <View style={st.hCenter}>
          <Text style={st.hTitle}>Vexsora</Text>
          <View style={[st.statusDot, { backgroundColor: modelReady ? Colors.success : Colors.textTertiary }]} />
        </View>
        <TouchableOpacity style={st.clearBtn} onPress={clearChat} hitSlop={12}>
          <Trash2 color={Colors.textTertiary} size={18} />
        </TouchableOpacity>
      </View>

      {/* Model banner */}
      {showModelBanner && (
        <Animated.View entering={FadeInUp.duration(300)} style={st.modelBanner}>
          <Text style={st.bannerTitle}>Local LLM not loaded</Text>
          <TextInput
            style={st.pathInput}
            value={modelPath}
            onChangeText={setModelPath}
            placeholder="GGUF file path..."
            placeholderTextColor={Colors.textTertiary}
            autoCapitalize="none"
          />
          <TouchableOpacity style={st.loadBtn} onPress={loadModel} disabled={isLoading}>
            <Text style={st.loadBtnText}>{isLoading ? 'Loading...' : 'Load Model'}</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => setShowModelBanner(false)} style={{ alignSelf: 'flex-end' }}>
            <Text style={{ color: Colors.textMuted, fontSize: FontSizes.xs }}>Dismiss</Text>
          </TouchableOpacity>
        </Animated.View>
      )}

      {/* Messages */}
      <ScrollView ref={scrollRef} style={st.scroll} contentContainerStyle={st.scrollContent} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
        {messages.length === 0 && !isLoading && (
          <Animated.View entering={FadeInUp.duration(400).delay(100)} style={st.empty}>
            <Text style={st.emptyTitle}>Hello{memoryService.getProfile().name ? `, ${memoryService.getProfile().name}` : ''}!</Text>
            <Text style={st.emptyText}>I'm Vexsora — 100% offline AI. Try:{'\n'}"torch on" · "YouTube lofi" · "text mom" · "timer 5 min"</Text>
          </Animated.View>
        )}

        {messages.map((msg) => (
          <Animated.View key={msg.id} entering={msg.isUser ? FadeInRight.duration(240) : FadeInLeft.duration(240)} style={[st.msgRow, msg.isUser ? st.rowUser : st.rowAI]}>
            {!msg.isUser && <View style={st.aiIcon}><VexsoraStar size={20} /></View>}
            <View style={[st.bubble, msg.isUser ? st.userBubble : st.aiBubble]}>
              <Text style={[st.msgText, !msg.isUser && st.aiText]}>{msg.text}</Text>
              <Text style={st.timeText}>{msg.time}</Text>
            </View>
          </Animated.View>
        ))}

        {streamText ? (
          <View style={[st.msgRow, st.rowAI]}>
            <View style={st.aiIcon}><VexsoraStar size={20} /></View>
            <View style={[st.bubble, st.aiBubble]}><Text style={[st.msgText, st.aiText]}>{streamText}</Text></View>
          </View>
        ) : null}

        {isLoading && !streamText && (
          <View style={[st.msgRow, st.rowAI]}>
            <View style={st.aiIcon}><VexsoraStar size={20} /></View>
            <View style={[st.bubble, st.aiBubble]}><TypingDots /></View>
          </View>
        )}
      </ScrollView>

      {/* Input bar */}
      <Animated.View entering={FadeInUp.duration(300)} style={st.inputWrap}>
        <View style={st.inputBar}>
          <TextInput
            ref={inputRef}
            style={st.inputField}
            value={input}
            onChangeText={setInput}
            placeholder="Ask Vexsora..."
            placeholderTextColor="rgba(255,255,255,0.22)"
            multiline
            returnKeyType="send"
            onSubmitEditing={() => sendMessage()}
          />
          <TouchableOpacity style={st.micBtn} onPress={() => voiceService.startListening((t) => sendMessage(t))}>
            <Mic color={Colors.textSecondary} size={19} />
          </TouchableOpacity>
          <TouchableOpacity
            style={[st.sendBtn, input.trim() ? st.sendBtnActive : undefined]}
            onPress={() => sendMessage()}
            disabled={!input.trim() || isLoading}
          >
            {input.trim()
              ? <Send color="#fff" size={17} />
              : <View style={st.waveform}>{[0.4, 0.9, 1.0, 0.9, 0.4].map((h, i) => <View key={i} style={[st.waveBar, { height: 14 * h }]} />)}</View>
            }
          </TouchableOpacity>
        </View>
      </Animated.View>
    </KeyboardAvoidingView>
  );
}

const st = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  header: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.xxxl + Spacing.sm,
    paddingBottom: Spacing.md,
    borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: Colors.border,
  },
  backBtn: { padding: 6, marginRight: 4 },
  hCenter: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 },
  hTitle: { fontSize: FontSizes.lg, fontWeight: '700', color: Colors.text, letterSpacing: 0.5 },
  statusDot: { width: 7, height: 7, borderRadius: 4 },
  clearBtn: { padding: 6 },
  modelBanner: {
    margin: Spacing.md, padding: Spacing.md,
    backgroundColor: Colors.surface, borderRadius: BorderRadius.md,
    borderWidth: 1, borderColor: Colors.primary, gap: Spacing.sm,
  },
  bannerTitle: { fontSize: FontSizes.sm, fontWeight: '700', color: Colors.primary },
  pathInput: {
    backgroundColor: Colors.surfaceLight, borderRadius: BorderRadius.sm,
    padding: Spacing.sm, color: Colors.text, fontSize: FontSizes.xs,
  },
  loadBtn: { backgroundColor: Colors.primary, borderRadius: BorderRadius.sm, paddingVertical: Spacing.sm, alignItems: 'center' },
  loadBtnText: { fontSize: FontSizes.sm, fontWeight: '700', color: '#fff' },
  scroll: { flex: 1 },
  scrollContent: { padding: Spacing.md, paddingBottom: Spacing.xxl, gap: Spacing.md },
  empty: { alignItems: 'center', paddingTop: Spacing.xxl, paddingHorizontal: Spacing.xl },
  emptyTitle: { fontSize: FontSizes.xxl, fontWeight: '700', color: Colors.text, marginBottom: Spacing.sm },
  emptyText: { fontSize: FontSizes.md, color: Colors.textSecondary, textAlign: 'center', lineHeight: 22 },
  msgRow: { flexDirection: 'row', alignItems: 'flex-end', gap: Spacing.sm, maxWidth: '92%' },
  rowUser: { alignSelf: 'flex-end', flexDirection: 'row-reverse' },
  rowAI: { alignSelf: 'flex-start' },
  aiIcon: { width: 28, height: 28, alignItems: 'center', justifyContent: 'center', marginBottom: 2 },
  bubble: { flex: 1, padding: Spacing.md, borderRadius: BorderRadius.lg },
  userBubble: { backgroundColor: Colors.surface, borderWidth: 1, borderColor: Colors.border, borderBottomRightRadius: 4 },
  aiBubble: { backgroundColor: 'transparent', borderBottomLeftRadius: 4 },
  msgText: { fontSize: FontSizes.md, color: Colors.text, lineHeight: 22 },
  aiText: { color: Colors.text },
  timeText: { fontSize: 10, color: Colors.textMuted, marginTop: 4, alignSelf: 'flex-end' },
  inputWrap: {
    paddingHorizontal: Spacing.md,
    paddingBottom: Platform.OS === 'ios' ? 32 : Spacing.lg + 8,
    paddingTop: Spacing.sm,
    borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: Colors.border,
  },
  inputBar: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: Colors.surface,
    borderRadius: 36, borderWidth: 1, borderColor: Colors.border,
    paddingVertical: 8, paddingLeft: Spacing.md, paddingRight: 6, minHeight: 54,
  },
  inputField: { flex: 1, color: Colors.text, fontSize: FontSizes.md, maxHeight: 120, paddingVertical: 4 },
  micBtn: { paddingHorizontal: 10 },
  sendBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(168,85,247,0.25)', alignItems: 'center', justifyContent: 'center', marginRight: 2 },
  sendBtnActive: { backgroundColor: Colors.primary },
  waveform: { flexDirection: 'row', alignItems: 'center', gap: 2 },
  waveBar: { width: 2.5, backgroundColor: Colors.textSecondary, borderRadius: 2 },
});
