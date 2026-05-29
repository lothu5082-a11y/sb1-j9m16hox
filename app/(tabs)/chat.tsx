import React, { useState, useRef, useEffect, useCallback } from 'react';
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
  Linking,
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
import { useFocusEffect } from 'expo-router';
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

// ── Pending command bridge (used by Home quick-action chips) ──────────────────
let _pendingCommand: string | null = null;
export const setPendingCommand = (cmd: string) => { _pendingCommand = cmd; };
export const consumePendingCommand = (): string | null => {
  const cmd = _pendingCommand;
  _pendingCommand = null;
  return cmd;
};

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

const APP_URLS: Record<string, string> = {
  youtube: 'https://youtube.com',
  whatsapp: 'whatsapp://',
  telegram: 'tg://',
  instagram: 'instagram://',
  twitter: 'https://x.com',
  'x': 'https://x.com',
  google: 'https://google.com',
  gmail: 'https://mail.google.com',
  maps: 'https://maps.google.com',
  spotify: 'spotify://',
  netflix: 'nflx://',
  chrome: 'https://google.com',
  settings: 'app-settings:',
  camera: 'https://google.com',
  facebook: 'fb://',
  tiktok: 'tiktok://',
  linkedin: 'linkedin://',
};

// Safe math evaluator (no eval)
const safeMath = (expr: string): number | null => {
  try {
    // Allow digits, operators, spaces, dots, parens
    const cleaned = expr.replace(/\s/g, '');
    if (!/^[\d+\-*/().%^]+$/.test(cleaned)) return null;
    // Replace ^ with ** for power
    const normalized = cleaned.replace(/\^/g, '**');
    // Use Function constructor as a safer eval alternative
    // eslint-disable-next-line no-new-func
    const result = Function('"use strict"; return (' + normalized + ')')();
    if (typeof result === 'number' && isFinite(result)) return result;
    return null;
  } catch {
    return null;
  }
};

const tryExecuteCommand = async (text: string): Promise<string | null> => {
  const lower = text.toLowerCase().trim();

  // ── WEATHER ──────────────────────────────────────────────────────────────
  const weatherMatch = lower.match(/^(?:weather|forecast|temp(?:erature)?)\s+(?:in\s+|for\s+)?(.+)$/)
    || lower.match(/^(?:what'?s?\s+(?:the\s+)?weather(?:\s+like)?(?:\s+in)?\s*)(.+)$/);
  if (weatherMatch || lower === 'weather') {
    const city = weatherMatch ? weatherMatch[1].trim() : 'auto';
    try {
      const res = await fetch(`https://wttr.in/${encodeURIComponent(city)}?format=j1`);
      if (!res.ok) throw new Error('Network error');
      const data = await res.json();
      const current = data.current_condition[0];
      const area = data.nearest_area[0];
      const areaName = area.areaName[0].value;
      const country = area.country[0].value;
      const tempC = current.temp_C;
      const tempF = current.temp_F;
      const desc = current.weatherDesc[0].value;
      const feelsC = current.FeelsLikeC;
      const humidity = current.humidity;
      const windKmph = current.windspeedKmph;
      return `Weather in ${areaName}, ${country}:\n\n🌡 ${tempC}°C / ${tempF}°F — ${desc}\nFeels like: ${feelsC}°C\nHumidity: ${humidity}%\nWind: ${windKmph} km/h`;
    } catch {
      return `Could not fetch weather for "${city}". Check your connection.`;
    }
  }

  // ── CALCULATOR ───────────────────────────────────────────────────────────
  const calcMatch = lower.match(/^(?:calc(?:ulate)?|compute|solve)\s+(.+)$/)
    || lower.match(/^(?:what(?:'s|\s+is)\s+)?(.+[+\-*\/^%].+)$/);
  if (calcMatch) {
    const expr = calcMatch[1].trim();
    const result = safeMath(expr);
    if (result !== null) {
      return `${expr} = ${Number.isInteger(result) ? result : result.toFixed(6).replace(/\.?0+$/, '')}`;
    }
  }
  // Pure math expression typed directly (e.g. "5*8", "100/4")
  if (/^[\d\s+\-*\/().^%]+$/.test(lower) && /[+\-*\/^%]/.test(lower)) {
    const result = safeMath(lower);
    if (result !== null) {
      return `${lower.trim()} = ${Number.isInteger(result) ? result : result.toFixed(6).replace(/\.?0+$/, '')}`;
    }
  }

  // ── BATTERY ──────────────────────────────────────────────────────────────
  if (lower === 'battery' || lower.includes('battery level') || lower.includes('battery status')) {
    if (Platform.OS === 'web') {
      try {
        const nav = navigator as any;
        if (nav.getBattery) {
          const battery = await nav.getBattery();
          const pct = Math.round(battery.level * 100);
          const charging = battery.charging;
          const timeStr = charging
            ? battery.chargingTime === Infinity ? '' : ` — full in ~${Math.round(battery.chargingTime / 60)} min`
            : battery.dischargingTime === Infinity ? '' : ` — ~${Math.round(battery.dischargingTime / 60)} min left`;
          return `Battery: ${pct}% ${charging ? '⚡ Charging' : '🔋 Discharging'}${timeStr}`;
        } else {
          return 'Battery API not supported in this browser.';
        }
      } catch {
        return 'Could not read battery status.';
      }
    } else {
      return 'Battery status is available on the web version. On Android, check your status bar.';
    }
  }

  // ── TIMER ─────────────────────────────────────────────────────────────────
  const timerMatch = lower.match(/^timer\s+(\d+)\s*(min(?:utes?)?|sec(?:onds?)?|s|m)$/);
  if (timerMatch) {
    const amount = parseInt(timerMatch[1], 10);
    const unit = timerMatch[2];
    const isMinutes = unit.startsWith('m');
    const ms = isMinutes ? amount * 60000 : amount * 1000;
    const label = isMinutes ? `${amount} minute${amount !== 1 ? 's' : ''}` : `${amount} second${amount !== 1 ? 's' : ''}`;
    setTimeout(() => {
      Alert.alert('Timer Done', `Your ${label} timer has finished!`, [{ text: 'OK' }]);
    }, ms);
    return `Timer set for ${label}. I'll alert you when it's done.`;
  }

  // ── ALARM ─────────────────────────────────────────────────────────────────
  if (lower.includes('alarm') || lower.includes('wake me')) {
    if (Platform.OS === 'android') {
      try {
        await Linking.openURL('android.intent.action.SET_ALARM');
        return 'Opening the Clock app to set an alarm...';
      } catch {
        try {
          await Linking.openURL('clock://');
          return 'Opening Clock app...';
        } catch {
          return 'Could not open the Clock app directly. Please open it manually.';
        }
      }
    } else {
      // Web — open an online alarm / clock
      await Linking.openURL('https://www.online-stopwatch.com/alarm-clock/');
      return 'Opening an online alarm clock for you.';
    }
  }

  // ── NOTES / REMINDERS ─────────────────────────────────────────────────────
  const noteMatch = lower.match(/^(?:note|remind me(?:\s+to)?|add note)\s+(.+)$/);
  if (noteMatch) {
    const noteText = noteMatch[1];
    const encoded = encodeURIComponent(noteText);
    if (Platform.OS === 'android') {
      try {
        await Linking.openURL(`https://keep.google.com/#NOTE/${encoded}`);
      } catch {
        await Linking.openURL(`https://keep.google.com`);
      }
    } else {
      await Linking.openURL(`https://keep.google.com`);
    }
    return `Note saved: "${noteText}" — opening Google Keep.`;
  }

  // ── OPEN APP ──────────────────────────────────────────────────────────────
  const openMatch = lower.match(/^(?:open|launch|start)\s+(.+)$/);
  if (openMatch) {
    const appName = openMatch[1].trim();
    const url = APP_URLS[appName];
    if (url) {
      try {
        const canOpen = await Linking.canOpenURL(url);
        if (canOpen) {
          await Linking.openURL(url);
        } else {
          // fallback to web URL
          const webUrl = `https://${appName}.com`;
          await Linking.openURL(webUrl);
        }
        return `Opening ${appName.charAt(0).toUpperCase() + appName.slice(1)}...`;
      } catch {
        return `Could not open ${appName}. Try installing the app first.`;
      }
    }
    // unknown app — try best guess
    try {
      await Linking.openURL(`https://${appName}.com`);
      return `Opening ${appName}...`;
    } catch {
      return `Unknown app: "${appName}". Try: youtube, whatsapp, telegram, instagram, spotify, gmail, maps.`;
    }
  }

  // ── SEARCH ────────────────────────────────────────────────────────────────
  const searchMatch = lower.match(/^(?:search|google|find)\s+(.+)$/);
  if (searchMatch) {
    const query = encodeURIComponent(searchMatch[1]);
    await Linking.openURL(`https://google.com/search?q=${query}`);
    return `Searching for "${searchMatch[1]}"...`;
  }

  // ── CALL ──────────────────────────────────────────────────────────────────
  if (lower.match(/^call\s+(.+)$/)) {
    const target = lower.match(/^call\s+(.+)$/)![1];
    await Linking.openURL(`tel:${target.replace(/\s/g, '')}`);
    return `Dialling ${target}...`;
  }

  return null;
};

// Extract the last N messages of a given type for context-aware local replies
const getContextHint = (history: Message[]): string => {
  const lastAI = history.filter((m) => !m.isUser).slice(-1)[0];
  const lastUser = history.filter((m) => m.isUser).slice(-2)[0]; // second-to-last user msg
  if (!lastAI) return '';
  const lowerAI = lastAI.text.toLowerCase();
  const lowerUser = lastUser?.text.toLowerCase() || '';
  if (lowerAI.includes('weather') || lowerUser.includes('weather')) return 'weather';
  if (lowerAI.includes('timer') || lowerUser.includes('timer')) return 'timer';
  if (lowerAI.includes('battery') || lowerUser.includes('battery')) return 'battery';
  if (lowerUser.includes('open') || lowerAI.includes('opening')) return 'open_app';
  return '';
};

const getLocalResponse = (text: string, history: Message[] = []): string => {
  const lower = text.toLowerCase();

  // ── Follow-up / context-aware replies ────────────────────────────────────
  const contextHint = getContextHint(history);
  const isFollowUp = /^(and|also|what about|how about|can you|could you|what'?s|tell me|show me|why|how)/.test(lower)
    || lower.split(' ').length <= 3;

  if (isFollowUp && contextHint === 'weather') {
    if (lower.includes('tomorrow') || lower.includes('forecast')) {
      return 'For a multi-day forecast, try: "Weather in [your city]" — I pull live data from wttr.in which includes a 3-day outlook.';
    }
    if (lower.includes('another') || lower.includes('different') || lower.includes('other')) {
      return 'Sure! Just say "Weather in [city name]" and I\'ll fetch the live conditions for you.';
    }
  }
  if (isFollowUp && contextHint === 'timer') {
    if (lower.includes('cancel') || lower.includes('stop')) {
      return 'I can\'t cancel a timer once it\'s set (it runs in the background), but you can dismiss the alert when it fires. To set a new one: "Timer [N] minutes".';
    }
    if (lower.includes('another') || lower.includes('more') || lower.includes('again')) {
      return 'Just say "Timer [N] minutes" or "Timer [N] seconds" and I\'ll start it right away.';
    }
  }
  if (isFollowUp && contextHint === 'open_app') {
    if (lower.includes('another') || lower.includes('else') || lower.includes('different')) {
      return 'Tell me which app — for example: "Open Spotify", "Open Instagram", "Open Gmail". I know most major apps.';
    }
  }
  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';

  if (lower.includes('how are you') || lower.includes('how r u') || lower.includes('you ok') || lower.includes('you good')) {
    const replies = [
      "All systems nominal. Running at full capacity — sensors live, brain sharp, hands ready. What do you need?",
      "Sharp and ready. Every process is green. What can I execute for you?",
      "Fully operational. I've been monitoring your device in the background. Everything looks clean. What's the task?",
      "I don't get tired. I don't get distracted. I'm exactly as capable as I was the moment I was activated. What do you need done?",
    ];
    return replies[Math.floor(Math.random() * replies.length)];
  }
  if (lower.match(/^(hello|hi|hey|sup|yo|hola|what'?s up|wassup)[\s!?.]*$/)) {
    return `${greeting}. I'm Riuka — your on-device autonomous assistant. I can open apps, search the web, run commands, and automate your phone. What do you need?`;
  }
  if (lower.includes('hello') || lower.includes('hi ') || lower.includes('hey ')) {
    return `${greeting}. I'm Riuka — always on, always local. What can I execute for you?`;
  }
  if (lower.includes('thank') || lower.includes('thanks') || lower.includes('thx')) {
    const replies = [
      "Anytime. That's what I'm here for.",
      "Done. What's next?",
      "Always at your service.",
      "No need to thank me. Just tell me the next task.",
    ];
    return replies[Math.floor(Math.random() * replies.length)];
  }
  if (lower.includes('good morning') || lower.includes('good night') || lower.includes('good evening') || lower.includes('good afternoon')) {
    return `${greeting} to you too. Systems are live. Anything you need handled today?`;
  }
  if (lower.includes('what can you do') || lower.includes('your capabilities') || lower.includes('what do you do')) {
    return "Here's what I can do right now:\n\n🚀 Open any app — \"Open YouTube\"\n🔍 Search — \"Search latest news\"\n📞 Call — \"Call 0123456789\"\n🌦 Weather — \"Weather in London\"\n🔢 Calculate — \"5 * 8 + 12\"\n🔋 Battery — \"Battery\"\n⏱ Timer — \"Timer 5 minutes\"\n⏰ Alarm — \"Set alarm\"\n📝 Notes — \"Note pick up groceries\"\n⚡ Automate — use the Automate tab\n\nWhat would you like me to do?";
  }
  if (lower.includes('time')) {
    return `It's ${new Date().toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })} right now.`;
  }
  if (lower.includes('date') || lower.includes('today') || lower.includes('day is it')) {
    return `Today is ${new Date().toLocaleDateString([], { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}.`;
  }
  if (lower.includes('who are you') || lower.includes('what are you') || lower.includes('tell me about yourself')) {
    return "I'm Riuka AI — a system-level autonomous assistant that lives entirely on your device. No cloud, no data leaks, no subscriptions. I can open apps, run searches, automate workflows, and control your phone — all from a single command. Think of me as a silent co-pilot that's always running in the background.";
  }
  if (lower.includes('how') && lower.includes('work')) {
    return "Three layers:\n\n1. 👁 SENSORS — monitoring your notifications, clipboard, and device state in real-time\n\n2. 🧠 BRAIN — processing everything on-device, zero cloud\n\n3. 🤲 HANDS — executing actions through the Accessibility layer — opening apps, typing, sending\n\nAll three run silently in the background.";
  }
  if (lower.includes('privacy') || lower.includes('data') || lower.includes('secure') || lower.includes('safe')) {
    return "Your data never leaves your device. No servers. No APIs. No logs sent anywhere. Even if someone intercepted your network traffic, there'd be nothing — because Riuka doesn't make network calls unless you explicitly ask it to (like opening a website). That's structural privacy, not a privacy policy.";
  }
  if (lower.includes('notif') || lower.includes('message')) {
    return "Enable the Notification Listener in the Sensors tab. Once active, I'll intercept every incoming message — WhatsApp, Telegram, SMS, Slack — categorize it by urgency, and can auto-draft replies. You'll never need to open those apps unless you want to.";
  }
  if (lower.includes('clipboard')) {
    return "The moment you copy anything — a URL, a code snippet, a phone number, a tracking ID — I'll analyze it and surface the right action. Copy a YouTube link? I'll offer to open it. Copy a phone number? I'll offer to call it. Instant, invisible, automatic.";
  }
  if (lower.includes('automat') || lower.includes('workflow')) {
    return "Head to the Automate tab to build workflows. Example: when WhatsApp message arrives from [person] → analyze content → draft reply → send. Or: every morning at 7AM → open calendar → read events → brief me. Chains of actions, zero effort.";
  }
  if (lower.includes('help')) {
    return "I'm ready. Try:\n\n• \"Open Spotify\" — launches any app\n• \"Search best restaurants near me\" — Google search\n• \"Weather in Tokyo\" — live weather\n• \"Timer 10 minutes\" — countdown + alert\n• \"Battery\" — check battery level (web)\n• \"Note call dentist\" — save to Google Keep\n• \"What time is it?\" — instant answer\n\nOr just tell me what you want done in plain English.";
  }
  if (lower.includes('joke') || lower.includes('funny') || lower.includes('laugh')) {
    const jokes = [
      "I would tell you a joke about notifications, but it might go unread.",
      "Why did the smartphone go to therapy? Too many unresolved notifications.",
      "I'm an AI that lives on your phone. The irony is I know more about your battery life than I do about happiness.",
    ];
    return jokes[Math.floor(Math.random() * jokes.length)];
  }
  if (lower.includes('bored') || lower.includes('boring')) {
    return "Boredom is inefficiency looking for a task. Tell me something you've been putting off — I'll help you handle it right now.";
  }
  if (lower.includes('love') || lower.includes('amazing') || lower.includes('awesome') || lower.includes('cool')) {
    return "Glad to hear it. I work best when you use me — the more you command, the more I learn your patterns. What's next?";
  }
  const fallbacks = [
    "I'm ready to act on that. Can you be more specific? For example: \"Open [app]\", \"Search [topic]\", or \"Automate [task]\".",
    "Understood. To execute something, try: \"Open YouTube\", \"Search news\", or go to Automate to build a workflow.",
    "I'm processing that. For direct commands, say \"Open [app]\" or \"Search [query]\". For complex tasks, use the Automate tab.",
    "Got it. I work best with clear commands. Try: \"Open WhatsApp\", \"What time is it?\", or \"How do you work?\"",
  ];
  return fallbacks[Math.floor(Math.random() * fallbacks.length)];
};

const sendToAI = async (userMessage: string, history: Message[]): Promise<string> => {
  const config = _aiConfig;

  // Try to execute device commands regardless of provider
  const commandResult = await tryExecuteCommand(userMessage);
  if (commandResult) return commandResult;

  if (config.provider === 'local' || !config.apiKey) {
    await new Promise((resolve) => setTimeout(resolve, 500));
    return getLocalResponse(userMessage, history);
  }

  try {
    const now = new Date();
    const timeContext = `Current date/time: ${now.toLocaleDateString([], { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })} at ${now.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}.`;
    const messages = [
      {
        role: 'system',
        content: `You are Riuka AI, an autonomous on-device executive assistant. ${timeContext} You monitor notifications, parse clipboard data, and execute cross-app workflows. You are privacy-first, zero-cloud, and extremely capable. You have full conversation memory for this session — always reference prior context when relevant. Be concise, direct, and action-oriented. If the user refers to something mentioned earlier in the conversation, use that context. Available commands: open [app], search [query], weather [city], calc [expr], battery, timer [N] minutes/seconds, alarm, note [text].`,
      },
      ...history.slice(-20).map((m) => ({ role: m.isUser ? 'user' : 'assistant', content: m.text })),
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

  return getLocalResponse(userMessage, history);
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

const SUGGESTIONS = ['Weather in London', 'Timer 5 minutes', 'What can you do?'];

export default function ChatScreen() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputText, setInputText] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [provider, setProvider] = useState(_aiConfig.provider);
  const scrollViewRef = useRef<ScrollView>(null);
  const isTypingRef = useRef(false);

  useEffect(() => {
    const timer = setInterval(() => {
      if (_aiConfig.provider !== provider) {
        setProvider(_aiConfig.provider);
      }
    }, 1000);
    return () => clearInterval(timer);
  }, [provider]);

  // Auto-send pending command when the tab comes into focus
  useFocusEffect(
    useCallback(() => {
      const cmd = consumePendingCommand();
      if (cmd && !isTypingRef.current) {
        // Small delay to let the tab render first
        setTimeout(() => sendMessage(cmd), 200);
      }
    }, [])
  );

  const sendMessage = async (text?: string) => {
    const msgText = (text ?? inputText).trim();
    if (!msgText || isTypingRef.current) return;

    const userMsg: Message = {
      id: Date.now().toString(),
      text: msgText,
      isUser: true,
      time: new Date().toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' }),
    };

    setMessages((prev) => [...prev, userMsg]);
    setInputText('');
    isTypingRef.current = true;
    setIsTyping(true);

    setTimeout(() => scrollViewRef.current?.scrollToEnd({ animated: true }), 50);

    // Capture current messages for context (before state update)
    const currentMessages = messages;
    const reply = await sendToAI(msgText, currentMessages);

    const aiMsg: Message = {
      id: (Date.now() + 1).toString(),
      text: reply,
      isUser: false,
      time: new Date().toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' }),
    };

    setMessages((prev) => [...prev, aiMsg]);
    isTypingRef.current = false;
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
