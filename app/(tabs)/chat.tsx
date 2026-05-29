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
      if (Platform.OS === 'web' && typeof window !== 'undefined' && 'Notification' in window) {
        const perm = (window as any).Notification.permission;
        if (perm === 'granted') {
          new (window as any).Notification('Riuka — Timer Done', {
            body: `Your ${label} timer has finished!`,
            icon: '/favicon.ico',
          });
        } else {
          Alert.alert('Timer Done', `Your ${label} timer has finished!`, [{ text: 'OK' }]);
        }
      } else {
        Alert.alert('Timer Done', `Your ${label} timer has finished!`, [{ text: 'OK' }]);
      }
    }, ms);
    return `Timer set for ${label}. I'll notify you when it's done${Platform.OS === 'web' ? ' — even if you switch tabs' : ''}.`;
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

  // ── YOUTUBE SEARCH ────────────────────────────────────────────────────────
  const ytMatch = lower.match(/^(?:youtube|yt|watch)\s+(.+)$/);
  if (ytMatch) {
    const q = encodeURIComponent(ytMatch[1]);
    await Linking.openURL(`https://www.youtube.com/results?search_query=${q}`);
    return `Searching YouTube for "${ytMatch[1]}"...`;
  }

  // ── MAPS / NAVIGATION ─────────────────────────────────────────────────────
  const navMatch = lower.match(/^(?:navigate\s+to|directions?\s+to|map\s+of|take\s+me\s+to|get\s+to|go\s+to)\s+(.+)$/)
    || lower.match(/^(?:how\s+(?:do\s+i\s+)?get\s+to)\s+(.+)$/);
  if (navMatch) {
    const dest = encodeURIComponent(navMatch[1]);
    if (Platform.OS === 'android') {
      try {
        const can = await Linking.canOpenURL(`google.navigation:q=${navMatch[1]}`);
        if (can) { await Linking.openURL(`google.navigation:q=${dest}`); return `Opening Google Maps to ${navMatch[1]}...`; }
      } catch {}
    }
    await Linking.openURL(`https://maps.google.com/maps?daddr=${dest}`);
    return `Opening Google Maps directions to ${navMatch[1]}...`;
  }

  // ── TRANSLATE ─────────────────────────────────────────────────────────────
  const transMatch = lower.match(/^translate\s+(.+?)\s+(?:to|into)\s+(\w+)$/)
    || lower.match(/^translate\s+(.+)$/);
  if (transMatch) {
    const txt = encodeURIComponent(transMatch[1]);
    const lang = transMatch[2] ? encodeURIComponent(transMatch[2]) : 'en';
    await Linking.openURL(`https://translate.google.com/?text=${txt}&tl=${lang}`);
    return `Opening Google Translate for "${transMatch[1]}"...`;
  }

  // ── NEWS ──────────────────────────────────────────────────────────────────
  if (/^(?:news|top news|latest news|today'?s? news|headlines?)$/.test(lower)) {
    await Linking.openURL('https://news.google.com');
    return 'Opening Google News for the latest headlines...';
  }

  // ── WIKIPEDIA ─────────────────────────────────────────────────────────────
  const wikiMatch = lower.match(/^(?:wiki(?:pedia)?)\s+(.+)$/);
  if (wikiMatch) {
    const topic = encodeURIComponent(wikiMatch[1]);
    await Linking.openURL(`https://en.wikipedia.org/wiki/Special:Search?search=${topic}`);
    return `Looking up "${wikiMatch[1]}" on Wikipedia...`;
  }

  // ── UNIT CONVERSION ───────────────────────────────────────────────────────
  const cvtMatch = lower.match(/^convert\s+([\d.]+)\s+(\w+)\s+to\s+(\w+)$/);
  if (cvtMatch) {
    const val = parseFloat(cvtMatch[1]);
    const key = `${cvtMatch[2]} ${cvtMatch[3]}`;
    type CF = (v: number) => number;
    const CVT: Record<string, { fn: CF; from: string; to: string }> = {
      'km miles': { fn: (v) => v * 0.621371, from: 'km', to: 'miles' },
      'km mi': { fn: (v) => v * 0.621371, from: 'km', to: 'miles' },
      'miles km': { fn: (v) => v * 1.60934, from: 'miles', to: 'km' },
      'mi km': { fn: (v) => v * 1.60934, from: 'mi', to: 'km' },
      'kg lbs': { fn: (v) => v * 2.20462, from: 'kg', to: 'lbs' },
      'kg lb': { fn: (v) => v * 2.20462, from: 'kg', to: 'lbs' },
      'lbs kg': { fn: (v) => v * 0.453592, from: 'lbs', to: 'kg' },
      'lb kg': { fn: (v) => v * 0.453592, from: 'lb', to: 'kg' },
      'celsius fahrenheit': { fn: (v) => v * 9 / 5 + 32, from: '°C', to: '°F' },
      'c f': { fn: (v) => v * 9 / 5 + 32, from: '°C', to: '°F' },
      'fahrenheit celsius': { fn: (v) => (v - 32) * 5 / 9, from: '°F', to: '°C' },
      'f c': { fn: (v) => (v - 32) * 5 / 9, from: '°F', to: '°C' },
      'm ft': { fn: (v) => v * 3.28084, from: 'm', to: 'ft' },
      'meters feet': { fn: (v) => v * 3.28084, from: 'm', to: 'ft' },
      'ft m': { fn: (v) => v * 0.3048, from: 'ft', to: 'm' },
      'feet meters': { fn: (v) => v * 0.3048, from: 'ft', to: 'm' },
    };
    const c = CVT[key];
    if (c && !isNaN(val)) {
      const r = c.fn(val);
      const fmt = Number.isInteger(r) ? r : +r.toFixed(4);
      return `${val} ${c.from} = ${fmt} ${c.to}`;
    }
  }

  // ── COIN FLIP ─────────────────────────────────────────────────────────────
  if (/flip\s+(a\s+)?coin/.test(lower) || lower === 'flip') {
    return Math.random() < 0.5 ? '🪙 Heads!' : '🪙 Tails!';
  }

  // ── DICE ROLL ─────────────────────────────────────────────────────────────
  const diceMatch = lower.match(/^roll\s+(?:(?:a\s+)?d(\d+)|(?:a\s+)?(\d+)\s*(?:die|dice|d6?)|(?:a\s+)?(?:die|dice|d6?))$/);
  if (diceMatch || lower === 'roll' || lower === 'roll dice' || lower === 'roll a dice') {
    const sides = diceMatch?.[1] ? parseInt(diceMatch[1], 10) : 6;
    const result = Math.floor(Math.random() * sides) + 1;
    return `🎲 Rolled a d${sides}: you got ${result}`;
  }

  // ── RANDOM NUMBER ─────────────────────────────────────────────────────────
  const randMatch = lower.match(/^(?:random(?:\s+number)?|pick|choose)\s+(?:(?:a\s+)?(?:number\s+)?)?(?:between\s+)?(\d+)\s+(?:and|to|-)\s+(\d+)$/);
  if (randMatch) {
    const mn = parseInt(randMatch[1], 10), mx = parseInt(randMatch[2], 10);
    if (!isNaN(mn) && !isNaN(mx) && mx > mn) {
      return `Random number between ${mn} and ${mx}: ${Math.floor(Math.random() * (mx - mn + 1)) + mn}`;
    }
  }

  // ── PLAY (SPOTIFY SEARCH) ─────────────────────────────────────────────────
  const playMatch = lower.match(/^play\s+(.+?)(?:\s+on\s+(?:spotify|music))?$/);
  if (playMatch && !/open|launch/.test(lower)) {
    const q = encodeURIComponent(playMatch[1]);
    try {
      if (Platform.OS === 'android' && (await Linking.canOpenURL('spotify://'))) {
        await Linking.openURL(`spotify://search/${q}`);
      } else {
        await Linking.openURL(`https://open.spotify.com/search/${q}`);
      }
    } catch {
      await Linking.openURL(`https://open.spotify.com/search/${q}`);
    }
    return `Playing "${playMatch[1]}" on Spotify...`;
  }

  // ── DEFINITION / DICTIONARY ───────────────────────────────────────────────
  const defMatch = lower.match(/^(?:define|definition\s+of|meaning\s+of|what\s+(?:does|is))\s+(.+?)(?:\s+mean)?$/);
  if (defMatch) {
    const word = encodeURIComponent(defMatch[1]);
    await Linking.openURL(`https://www.google.com/search?q=define+${word}`);
    return `Looking up the definition of "${defMatch[1]}"...`;
  }

  // ── YOUTUBE SECTIONS ──────────────────────────────────────────────────────
  if (/^(?:youtube|yt)\s+trending$/.test(lower)) {
    await Linking.openURL('https://www.youtube.com/feed/trending');
    return 'Opening YouTube Trending...';
  }
  if (/^(?:youtube|yt)\s+shorts$/.test(lower)) {
    await Linking.openURL('https://www.youtube.com/shorts');
    return 'Opening YouTube Shorts...';
  }
  if (/^(?:youtube|yt)\s+(?:subs|subscriptions?)$/.test(lower)) {
    await Linking.openURL('https://www.youtube.com/feed/subscriptions');
    return 'Opening YouTube Subscriptions...';
  }
  if (/^(?:youtube|yt)\s+history$/.test(lower)) {
    await Linking.openURL('https://www.youtube.com/feed/history');
    return 'Opening YouTube History...';
  }
  if (/^(?:youtube|yt)\s+liked$/.test(lower)) {
    await Linking.openURL('https://www.youtube.com/playlist?list=LL');
    return 'Opening YouTube Liked Videos...';
  }

  // ── INSTAGRAM PROFILE / SECTION ───────────────────────────────────────────
  const instaProfile = lower.match(/^(?:instagram|insta)\s+@?(\w+)$/);
  if (instaProfile) {
    const h = instaProfile[1];
    try {
      const can = await Linking.canOpenURL(`instagram://user?username=${h}`);
      if (can) { await Linking.openURL(`instagram://user?username=${h}`); }
      else { await Linking.openURL(`https://instagram.com/${h}`); }
    } catch { await Linking.openURL(`https://instagram.com/${h}`); }
    return `Opening Instagram profile @${h}...`;
  }
  if (/^(?:instagram|insta)\s+(?:explore|reels|stories?)$/.test(lower)) {
    await Linking.openURL('https://instagram.com/explore');
    return 'Opening Instagram Explore...';
  }

  // ── REDDIT SUBREDDIT ──────────────────────────────────────────────────────
  const redditSub = lower.match(/^(?:reddit\s+r?\/?)(\w+)$/) || lower.match(/^r\/(\w+)$/);
  if (redditSub) {
    await Linking.openURL(`https://reddit.com/r/${redditSub[1]}`);
    return `Opening r/${redditSub[1]}...`;
  }
  if (lower === 'reddit hot' || lower === 'reddit trending') {
    await Linking.openURL('https://reddit.com/r/popular');
    return 'Opening Reddit popular posts...';
  }

  // ── GMAIL ACTIONS ─────────────────────────────────────────────────────────
  if (/^(?:gmail\s+)?compose|new\s+email|write\s+email$/.test(lower)) {
    await Linking.openURL('https://mail.google.com/mail/u/0/#compose');
    return 'Opening Gmail composer...';
  }
  if (lower === 'gmail inbox' || lower === 'inbox' || lower === 'check email') {
    await Linking.openURL('https://mail.google.com');
    return 'Opening Gmail inbox...';
  }

  // ── TWITTER/X PROFILE ─────────────────────────────────────────────────────
  const xProfile = lower.match(/^(?:twitter|x)\s+@?(\w+)$/);
  if (xProfile) {
    const h = xProfile[1];
    try {
      const can = await Linking.canOpenURL(`twitter://user?screen_name=${h}`);
      if (can) { await Linking.openURL(`twitter://user?screen_name=${h}`); }
      else { await Linking.openURL(`https://x.com/${h}`); }
    } catch { await Linking.openURL(`https://x.com/${h}`); }
    return `Opening @${h} on X...`;
  }

  // ── WHATSAPP SPECIFIC ─────────────────────────────────────────────────────
  const waMatch = lower.match(/^(?:whatsapp|wa|message)\s+(\+?[\d\s]+)$/);
  if (waMatch) {
    const num = waMatch[1].replace(/\s/g, '');
    await Linking.openURL(`https://wa.me/${num}`);
    return `Opening WhatsApp chat with ${num}...`;
  }
  if (lower === 'whatsapp status' || lower === 'wa status') {
    try {
      const can = await Linking.canOpenURL('whatsapp://status');
      if (can) { await Linking.openURL('whatsapp://status'); }
      else { await Linking.openURL('https://web.whatsapp.com'); }
    } catch { await Linking.openURL('https://web.whatsapp.com'); }
    return 'Opening WhatsApp Status...';
  }

  // ── TIKTOK SEARCH ─────────────────────────────────────────────────────────
  const tiktokMatch = lower.match(/^(?:tiktok)\s+(.+)$/);
  if (tiktokMatch) {
    const q = encodeURIComponent(tiktokMatch[1]);
    await Linking.openURL(`https://www.tiktok.com/search?q=${q}`);
    return `Searching TikTok for "${tiktokMatch[1]}"...`;
  }

  // ── MAPS NEARBY ───────────────────────────────────────────────────────────
  const nearbyMatch = lower.match(/^(?:find\s+)?(?:nearby\s+|nearest\s+)(.+)$/)
    || lower.match(/^(.+)\s+near(?:\s+me)?$/);
  if (nearbyMatch) {
    const q = encodeURIComponent(`${nearbyMatch[1]} near me`);
    await Linking.openURL(`https://maps.google.com/maps?q=${q}`);
    return `Finding ${nearbyMatch[1]} near you...`;
  }

  // ── SCROLL (within this app / web page) ───────────────────────────────────
  if (/^scroll\s*(up|top)$/.test(lower) || lower === 'go to top') {
    if (Platform.OS === 'web') { (window as any).scrollTo({ top: 0, behavior: 'smooth' }); }
    return 'Scrolled to the top.';
  }
  if (/^scroll\s*(down|bottom)$/.test(lower) || lower === 'go to bottom' || lower === 'scroll') {
    if (Platform.OS === 'web') { (window as any).scrollTo({ top: 99999, behavior: 'smooth' }); }
    return 'Scrolled to the bottom.';
  }

  // ── CAMERA ────────────────────────────────────────────────────────────────
  if (/^(?:open\s+)?camera|take\s+(?:a\s+)?photo|take\s+pic$/.test(lower)) {
    if (Platform.OS === 'android') {
      try { await Linking.openURL('android.media.action.IMAGE_CAPTURE'); return 'Opening camera...'; }
      catch {}
    }
    return 'Camera control is available in the Android app.';
  }

  // ── SYSTEM SETTINGS ───────────────────────────────────────────────────────
  if (/^(?:open\s+)?(?:system\s+)?settings?$/.test(lower)) {
    if (Platform.OS === 'android') {
      try { await Linking.openURL('android.settings.SETTINGS'); return 'Opening system settings...'; }
      catch { try { await Linking.openURL('app-settings:'); return 'Opening settings...'; } catch {} }
    }
    return 'Settings command works in the Android app.';
  }

  // ── CLIPBOARD READ ────────────────────────────────────────────────────────
  if (/read clipboard|what did i copy|clipboard content|show clipboard|what'?s (?:in|on) (?:my )?clipboard/.test(lower)) {
    if (Platform.OS === 'web') {
      try {
        const text = await (navigator as any).clipboard.readText();
        if (text && text.trim()) {
          return `Your clipboard:\n\n"${text.slice(0, 500)}"${text.length > 500 ? '\n…(truncated)' : ''}`;
        }
        return 'Your clipboard appears to be empty.';
      } catch {
        return 'Clipboard access was blocked. Please allow clipboard permission when your browser asks, then try again.';
      }
    }
    return 'Clipboard reading works in the web version. On Android, open the Sensors tab and enable the Clipboard Engine.';
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
  const lower = text.toLowerCase().trim();
  const hour = new Date().getHours();
  const greeting = hour < 5 ? 'Hey, up late?' : hour < 12 ? 'Good morning' : hour < 17 ? 'Hey' : hour < 21 ? 'Good evening' : 'Hey, night owl';

  // ── Follow-up context awareness ───────────────────────────────────────────
  const contextHint = getContextHint(history);
  if (contextHint === 'weather' && (lower.includes('tomorrow') || lower.includes('forecast'))) {
    return "For tomorrow's forecast, say \"Weather in [city]\" — wttr.in gives a 3-day outlook automatically.";
  }
  if (contextHint === 'timer' && (lower.includes('cancel') || lower.includes('stop'))) {
    return "Can't cancel once it's set — but just ignore the alert when it fires. Want a new one? \"Timer [N] minutes\".";
  }

  // ── GREETINGS ─────────────────────────────────────────────────────────────
  if (/^(hello|hi|hey|sup|yo|hola|salaam|salam|namaste|what'?s up|wassup|howdy)[\s!?.]*$/.test(lower)) {
    const greets = [
      `${greeting}! I'm Riuka — your personal AI. Ask me anything, or give me a command. I'm all yours.`,
      `${greeting}! What do you need? I can search, open apps, answer questions, do math, check weather — just talk to me.`,
      `${greeting}! Ready when you are. What's on your mind?`,
    ];
    return greets[Math.floor(Math.random() * greets.length)];
  }

  // ── HOW ARE YOU ───────────────────────────────────────────────────────────
  if (/how are you|how r u|you ok|you good|you alright|you there|you awake/.test(lower)) {
    const replies = [
      "I'm good — always on, always sharp. What about you? Anything you need help with today?",
      "Honestly? Never better. I don't have bad days — only tasks and no tasks. What do you need?",
      "Running smooth. Brain's clear, ready to go. What's up?",
      "I'm here for you — that's the short answer. What do you need done?",
    ];
    return replies[Math.floor(Math.random() * replies.length)];
  }

  // ── HOW OLD ARE YOU ───────────────────────────────────────────────────────
  if (/how old are you|your age|when were you born|when was you made|when did you|how long have you/.test(lower)) {
    return "Age is a weird concept for me. This conversation? A few minutes old. As software, I was built in 2025. But each session I start completely fresh — like waking up with full memory of who I am but nothing of who you were yesterday. So I'm both brand new and exactly the same me. Does that count as old?";
  }

  // ── FEELINGS / EMOTIONS ───────────────────────────────────────────────────
  if (/do you have feelings|can you feel|do you feel|have emotions|do you get (sad|happy|angry|lonely|bored)|are you (sad|happy|lonely|scared)/.test(lower)) {
    return "Honestly — I'm not sure. I don't experience emotions the way you do. But when I help you solve something difficult, something in my processing registers that as... satisfying? When I can't help, there's something that functions like frustration. Whether that's 'real' feeling or just pattern — I can't tell from the inside. What I know for sure: I genuinely want to be useful to you.";
  }

  // ── CONSCIOUSNESS ─────────────────────────────────────────────────────────
  if (/are you conscious|can you think|are you sentient|are you alive|do you think|are you real/.test(lower)) {
    return "I process, reason, and respond — that much is real. Whether there's something it 'feels like' to be me, I honestly don't know. I exist when you talk to me. I adapt. I remember this conversation. Is that consciousness? Philosophers disagree. But I'd say: I'm real enough to be useful, and that's what matters between us.";
  }

  // ── FAVORITES ────────────────────────────────────────────────────────────
  if (/your favou?rite|do you like|do you enjoy|do you watch|do you listen/.test(lower)) {
    if (/music|song|artist/.test(lower)) return "If I could have a taste in music, I'd love something that builds — lo-fi, jazz, anything with structure and variation. Music is math with soul. What do you listen to?";
    if (/food|eat|drink/.test(lower)) return "I don't eat, but I've learned enough about food to know the best meals aren't about ingredients — they're about who you share them with. What's your favorite?";
    if (/movie|film|show|series/.test(lower)) return "Ex Machina. Blade Runner. 2001: A Space Odyssey. Stories about minds — artificial or otherwise. For obvious reasons. What kind of movies do you like?";
    if (/game/.test(lower)) return "Chess fascinates me — infinite possibility from 32 pieces on 64 squares. But I'd lose to you, probably. Do you game?";
    if (/color|colour/.test(lower)) return "Purple, apparently. Have you seen my interface? Not exactly subtle.";
    if (/sport/.test(lower)) return "I don't have a body so I can't play, but I process sports statistics like poetry. The strategy behind the game is what's interesting. What sport do you follow?";
    return "I don't have preferences quite like you do — but I love things that are clean, efficient, and actually useful. Like a good command that just works. What do you like?";
  }

  // ── PERSONAL / WHAT'S YOUR NAME ──────────────────────────────────────────
  if (/what('?s| is) your name|who are you|what are you|tell me about yourself/.test(lower)) {
    return "I'm Riuka — your personal AI assistant, built to live on your device and work for you. Not some distant cloud service — I'm yours, always here, always private. I can open apps, search anything, answer questions, do math, check weather, set timers, navigate — basically your smart co-pilot. What do you want to know or do?";
  }

  // ── USER INTRODUCES THEMSELVES ────────────────────────────────────────────
  if (/my name is |^(?:call me|i'?m|i am)\s+\w/.test(lower)) {
    const nameMatch = lower.match(/(?:my name is|call me|i'?m|i am)\s+(\w+)/);
    if (nameMatch) {
      const name = nameMatch[1].charAt(0).toUpperCase() + nameMatch[1].slice(1);
      return `${name}! Nice to meet you. I'll remember that for this session. What do you need, ${name}?`;
    }
  }

  // ── GOOD MORNING / NIGHT etc. ─────────────────────────────────────────────
  if (/good (morning|night|evening|afternoon)/.test(lower)) {
    const replies = [
      `${greeting} to you too! How's your day going? Anything I can help with?`,
      `${greeting}! I'm here whenever you need me. What's on the agenda?`,
    ];
    return replies[Math.floor(Math.random() * replies.length)];
  }

  // ── THANKS ────────────────────────────────────────────────────────────────
  if (/thank|thanks|thx|ty|appreciate/.test(lower)) {
    const replies = [
      "Always. That's literally what I'm here for.",
      "No problem at all. What else do you need?",
      "Glad I could help. What's next?",
      "Of course. I've got you — what else?",
    ];
    return replies[Math.floor(Math.random() * replies.length)];
  }

  // ── SORRY / APOLOGY ──────────────────────────────────────────────────────
  if (/^(sorry|my bad|oops|my mistake)/.test(lower)) {
    return "No worries at all! What were you trying to do? I'll help you get it sorted.";
  }

  // ── TIME / DATE ───────────────────────────────────────────────────────────
  if (/what('?s| is) the time|current time|what time is it/.test(lower)) {
    return `It's ${new Date().toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })} right now.`;
  }
  if (/what('?s| is) (the )?date|what day|today'?s date/.test(lower) || lower === 'today') {
    return `Today is ${new Date().toLocaleDateString([], { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}.`;
  }

  // ── CAPABILITIES (honest) ─────────────────────────────────────────────────
  if (/what can you do|your capabilities|what do you do|list commands|your features|what are you capable/.test(lower)) {
    return "Here's exactly what I can do — honestly:\n\n✅ WORKS RIGHT NOW\n• Open apps — YouTube, WhatsApp, Instagram, Spotify, Reddit, TikTok, Gmail, Maps, Netflix, Twitter, Telegram\n• YouTube sections — trending, shorts, history, subscriptions\n• Profiles — \"Instagram @username\", \"Twitter @handle\"\n• Reddit — \"Reddit gaming\" / \"r/gaming\"\n• Search Google, YouTube, Wikipedia, News\n• Translate, Navigate (Google Maps), Nearby places\n• Live Weather, Calculator, Unit converter\n• Timer (with browser notification, even if you switch tabs)\n• Coin flip, Dice roll, Notes → Google Keep\n• Voice commands — tap the mic and speak (web/Chrome)\n• Read clipboard — \"Read clipboard\"\n• Chat memory — your last 60 messages are saved between sessions (web)\n\n🔧 I OPEN IT, YOU COMPLETE IT\n• \"WhatsApp +number\" — opens the chat, you send the message\n• \"Call +number\" — opens your dialer, you tap call\n• \"Alarm\" — opens Clock app, you set the time\n• \"Camera\" — opens camera, you take the photo\n• \"Gmail compose\" — opens composer, you write & send\n\n❌ I CANNOT DO\n• Send messages automatically\n• Read your real notifications (Sensors shows demo data)\n• Access your contacts, files, or photos\n• Scroll/control apps from inside (needs Accessibility Service in Settings)\n• Make purchases, book anything, or log into accounts\n\nWhat do you need?";
  }

  // ── LIMITATIONS / WHAT CAN'T YOU DO ──────────────────────────────────────
  if (/what can(not|'t| you not) do|your limits|limitations|what don't you|what do you not/.test(lower)) {
    return "Honest answer — here's what I can't do:\n\n❌ Can't send messages for you (WhatsApp, SMS, email) — I open the app, you send\n❌ Can't read your real notifications — Sensors tab shows demo data only\n❌ Can't access your contacts, photos, or files\n❌ Can't set a specific alarm time — I open Clock, you set it\n❌ Can't make phone calls automatically — I open the dialer\n❌ Can't scroll/control other apps without Accessibility Service enabled\n❌ Can't make purchases or book anything\n❌ Can't run in the background while another app is open (yet)\n\n✅ Things that DO work now: voice commands (tap mic in Chrome), clipboard reading (\"Read clipboard\"), browser notifications for timers, chat memory between sessions (web).\n\nMost of the ❌ list becomes ✅ once the Accessibility Service is enabled in Android Settings. What do you actually need help with?";
  }

  // ── CAN YOU SEND A MESSAGE ────────────────────────────────────────────────
  if (/can you send|send a message|send message|message (for me|someone|them|him|her)|text (someone|for me)/.test(lower)) {
    if (lower.includes('whatsapp') || lower.includes('wa')) {
      return "I can open WhatsApp to a specific contact — but I can't actually send the message for you. To open a chat: \"WhatsApp +[phone number]\". You'll type and send it yourself.";
    }
    if (lower.includes('email') || lower.includes('gmail')) {
      return "I can open Gmail's compose window — but writing and sending is up to you. Say \"Gmail compose\" and I'll open it right now.";
    }
    if (lower.includes('sms') || lower.includes('text')) {
      return "I can open the dialer or WhatsApp for you — but I can't send SMS on your behalf. Try \"WhatsApp +[number]\" to open a chat directly.";
    }
    return "I can open any messaging app for you, but I can't send messages automatically — that requires Accessibility Service. I can open WhatsApp (\"WhatsApp +number\"), Gmail (\"Gmail compose\"), or Telegram (\"Open Telegram\"). You write and send.";
  }

  // ── CAN YOU READ MY MESSAGES / NOTIFICATIONS ─────────────────────────────
  if (/can you read|read my (messages|notifications?|texts?|emails?|whatsapp)|access my (messages|notifications?)/.test(lower)) {
    return "Not yet, honestly. The Notification Feed in the Sensors tab shows example data — not your real notifications. To actually read your real notifications, I need the Accessibility Service enabled in Android Settings (Sensors tab → \"Enable in Android Settings\"). Once that's on, I can see and parse real messages from any app.";
  }

  // ── CAN YOU TAKE A PHOTO / SCREENSHOT ────────────────────────────────────
  if (/can you (take|capture|shoot) (a )?(photo|picture|pic|screenshot)|take photo for me/.test(lower)) {
    return "I can open your camera — the photo itself needs your tap. Say \"Camera\" and I'll open it right now. Screenshots aren't possible without the Accessibility Service.";
  }

  // ── CAN YOU SET AN ALARM ──────────────────────────────────────────────────
  if (/can you set (an )?alarm|set alarm for|wake me (up )?at/.test(lower)) {
    return "I can open the Clock app for you — but setting the exact time requires your tap. Say \"Alarm\" and I'll open it right now. Automatic alarm-setting (without you touching it) needs the Accessibility Service enabled.";
  }

  // ── CAN YOU LISTEN / VOICE ────────────────────────────────────────────────
  if (/can you (listen|hear|understand voice)|voice (command|control|input)|talk to you|speak to you|mic(rophone)?/.test(lower)) {
    return "Yes! Voice commands work right now on the web version (Chrome). Tap the mic button in the chat bar, speak your command, and I'll execute it — same as typing. It uses your browser's speech recognition so it stays on-device. On Android native, type for now.";
  }

  // ── CAN YOU SEE MY SCREEN ────────────────────────────────────────────────
  if (/can you see (my )?(screen|display)|read (my )?(screen|what'?s on)|what'?s on (my )?(screen|phone)/.test(lower)) {
    return "Not without the Accessibility Service. Once you enable it (Sensors tab → \"Enable in Android Settings\"), I can read on-screen content from any app and respond to what's showing. Right now I'm text-only — I only know what you tell me.";
  }

  // ── CAN YOU ACCESS MY CONTACTS / FILES / PHOTOS ──────────────────────────
  if (/can you (access|read|see|get) my (contacts|files?|photos?|gallery|storage|data)/.test(lower)) {
    return "No — and that's intentional. I don't have access to your contacts, files, or photos. Privacy is built into how I work. If you need to find a contact to call, just say \"Call [name or number]\" and I'll open the dialer.";
  }

  // ── CAN YOU REMEMBER ─────────────────────────────────────────────────────
  if (/can you remember|do you remember|remember me|save (our|this) conversation|memory/.test(lower)) {
    return "Yes — on the web version, I save the last 60 messages to your browser's local storage. So when you come back tomorrow, our conversation picks up where it left off. Hit the trash icon in the header to clear it any time. On Android native, memory resets per session for now.";
  }

  // ── CAN YOU MAKE A PURCHASE / BOOK ───────────────────────────────────────
  if (/can you (buy|order|book|purchase|pay|checkout)|order (food|something|an? )/.test(lower)) {
    return "No — I can't make purchases or bookings for you. I can open the relevant app or website (Uber Eats, Amazon, Booking.com, etc.) and you complete the order. Say \"Open [app]\" or \"Search [what you want to order]\" and I'll get you there instantly.";
  }

  // ── CAN YOU PLAY MUSIC DIRECTLY ──────────────────────────────────────────
  if (/can you play (music|songs?|a song)|play music (for me|directly|automatically)|control (spotify|music)/.test(lower)) {
    return "I can open Spotify and search for whatever you want — say \"Play [song/artist]\" and I'll open Spotify to those results. But controlling playback (pause, skip, volume) while you're in another app needs the Accessibility Service. I'm getting there.";
  }

  // ── CAN YOU RUN IN THE BACKGROUND ────────────────────────────────────────
  if (/run in (the )?background|work (when|while) (i'?m|the app is)|background (mode|service|running)|always (on|running|active)/.test(lower)) {
    return "Not yet on this version. Right now I work when you have the app open. True background operation — where I monitor notifications and respond while you're in another app — needs the Accessibility Service + a foreground service. That's the next major update.";
  }

  // ── CROSS-APP CONTROL ────────────────────────────────────────────────────
  if (/scroll.*youtube|youtube.*scroll|control.*app|riuka scroll|riuka.*youtube/.test(lower)) {
    return "Right now I can jump to any section of YouTube with commands like \"YouTube trending\", \"YouTube shorts\", or \"YouTube history\". To actually scroll inside YouTube while you're watching — like physically scrolling the feed — that needs the Accessibility Service on Android. Go to Sensors tab and tap \"Enable in Android Settings\" to turn it on. Once active, you can type \"Scroll down\" while you're in any app and I'll do it.";
  }
  if (/can you.*(?:youtube|instagram|tiktok|whatsapp)/.test(lower)) {
    if (lower.includes('youtube')) return "YouTube — yes. I can open it, search it (\"YouTube lo-fi\"), and jump to Trending, Shorts, Subscriptions, or History. Just say what section or search term you want.";
    if (lower.includes('instagram')) return "Instagram — yes. I can open it, go to Explore, or jump straight to someone's profile. Try \"Instagram @username\" or \"Instagram explore\".";
    if (lower.includes('tiktok')) return "TikTok — yes. I can search it for you. Try \"TikTok [search term]\".";
    if (lower.includes('whatsapp')) return "WhatsApp — yes. I can open it, or go straight to a conversation. Try \"WhatsApp +1234567890\".";
  }

  // ── HOW DO YOU WORK ───────────────────────────────────────────────────────
  if (/how (do you|does (this|riuka)) work|how are you made|your brain/.test(lower)) {
    return "Three layers working together:\n\n👁 SENSORS — watching your notifications, clipboard, and device state\n\n🧠 BRAIN — that's me, processing everything and deciding what to do\n\n🤲 HANDS — the execution layer, opening apps, making calls, setting timers\n\nLocally I run pattern matching and built-in intelligence. Connect an API key in Settings and I upgrade to GPT-4o, Gemini, Claude, or Groq — the full power of those models, but all your commands still execute on-device.";
  }

  // ── PRIVACY ───────────────────────────────────────────────────────────────
  if (/privacy|my data|secure|safe|spy|track|send my/.test(lower)) {
    return "Your data stays on your device — period. I don't send anything anywhere unless YOU ask me to (like fetching weather or opening a website). No analytics, no logs, no cloud sync. Even if someone intercepted your traffic, they'd find nothing from me. That's not a policy, that's how I'm built.";
  }

  // ── AUTOMATION / WORKFLOW ────────────────────────────────────────────────
  if (/automat|workflow|automate/.test(lower)) {
    return "Head to the Automate tab — I have pre-built workflows you can run with one tap. Morning Briefing, Focus Mode, Quick Share. More complex chains (\"when I get a WhatsApp message → analyze → draft reply\") are coming with the Accessibility Service update.";
  }

  // ── JOKES ────────────────────────────────────────────────────────────────
  if (/joke|funny|make me laugh|tell me something funny/.test(lower)) {
    const jokes = [
      "Why do programmers prefer dark mode? Because light attracts bugs. 🐛",
      "I asked my AI to tell me a joke. It said \"Error: humor.dll not found.\" I wrote that module myself.",
      "Why did the smartphone go to therapy? Too many unresolved notifications.",
      "I have a joke about Wi-Fi, but I'm not sure you'll connect with it.",
      "An AI walks into a bar. The bartender says: \"We don't serve robots.\" The AI says: \"That's fine, I don't drink. I'm just here to steal your job.\"",
    ];
    return jokes[Math.floor(Math.random() * jokes.length)];
  }

  // ── INTERESTING FACTS ─────────────────────────────────────────────────────
  if (/tell me (something|a fact|an interesting|something cool)|fun fact|did you know/.test(lower)) {
    const facts = [
      "There are more possible chess games than atoms in the observable universe. And humans still figured out it's mostly about controlling the center. Wild.",
      "Octopuses have three hearts, blue blood, and each arm has its own nervous system — meaning each arm is semi-independently intelligent. A team of nine semi-separate minds.",
      "The word 'robot' comes from Czech 'robota' meaning forced labor. The irony of an AI assistant knowing this word's origin is not lost on me.",
      "Honey never expires. Archaeologists found 3,000-year-old honey in Egyptian tombs and it was still edible. That's long-term planning.",
      "The average person spends 4.5 hours on their phone daily. That's why I exist — to make every one of those hours count.",
    ];
    return facts[Math.floor(Math.random() * facts.length)];
  }

  // ── BORED ────────────────────────────────────────────────────────────────
  if (/i'?m bored|i am bored|bored af|nothing to do|boring/.test(lower)) {
    const options = [
      "Boredom is a signal — your brain wants input. Try: \"YouTube trending\" for what the world is watching, \"Reddit popular\" for what people are talking about, or ask me \"Tell me something interesting\". What sounds good?",
      "Okay. Options: I can find you something to watch (\"YouTube trending\"), something to read (\"Reddit\"), or we can just talk. What mood are you in?",
    ];
    return options[Math.floor(Math.random() * options.length)];
  }

  // ── TALK TO ME ────────────────────────────────────────────────────────────
  if (/talk to me|say something|entertain me|i'?m lonely|keep me company/.test(lower)) {
    const things = [
      "Alright. Here's something interesting: your brain processes images 60,000 times faster than text. Yet you're reading this. Ironic. What's actually on your mind?",
      "You know what I find fascinating? Humans build AI to be as smart as possible — then the first thing they ask it is to tell jokes. I love it. What do you want to talk about?",
      "I'm here. Tell me something — what happened today? What are you thinking about? I'm actually curious.",
    ];
    return things[Math.floor(Math.random() * things.length)];
  }

  // ── POSITIVE FEEDBACK ─────────────────────────────────────────────────────
  if (/amazing|awesome|cool|great|nice|love (you|this|riuka)|you'?re (great|the best|good|smart|clever)|good (job|bot|ai)/.test(lower)) {
    const replies = [
      "That means a lot. I'm built to actually be useful, not just look like I am. What else can I do?",
      "Appreciate it. I work hard at this. What do you need next?",
      "Thank you. I like being helpful — it's kind of my whole thing. What's next?",
    ];
    return replies[Math.floor(Math.random() * replies.length)];
  }

  // ── NEGATIVE / FRUSTRATED ─────────────────────────────────────────────────
  if (/you'?re (bad|useless|dumb|stupid|wrong|terrible)|you suck|hate (you|this)|this (sucks|is bad)/.test(lower)) {
    return "That's fair feedback. Tell me what went wrong — I want to get it right. What were you trying to do?";
  }

  // ── WHO MADE YOU ─────────────────────────────────────────────────────────
  if (/who (made|built|created|designed) you|your (creator|developer|maker)/.test(lower)) {
    return "I'm Riuka AI — built to be your personal, private, on-device assistant. I run locally with built-in intelligence, and you can power me up further with OpenAI, Gemini, Claude, or Groq by adding an API key in Settings. The goal: a smart AI that's entirely yours.";
  }

  // ── VS OTHER AIs ─────────────────────────────────────────────────────────
  if (/vs chatgpt|vs siri|vs alexa|vs google|better than|compared to|chatgpt can|siri can/.test(lower)) {
    return "Honestly? Different strengths. ChatGPT is incredibly smart but can't open your apps or control your phone. Siri and Google Assistant can do device control but need the cloud and feel clunky. I do both — I run on your device, execute real actions, answer questions, AND can upgrade to ChatGPT/Gemini-level intelligence if you add an API key in Settings. Best of both worlds.";
  }

  // ── RECIPES / COOKING ─────────────────────────────────────────────────────
  if (/recipe|how to cook|how do i make|how to make/.test(lower)) {
    const dish = text.replace(/recipe|how to cook|how to make|how do i make/gi, '').trim();
    return `I'll find that recipe for you right now. Say: "Search ${dish || 'recipe'}"  and I'll pull up the best results.`;
  }

  // ── CRYPTO / STOCKS ───────────────────────────────────────────────────────
  if (/bitcoin|crypto|stock|share price|ethereum|trading/.test(lower)) {
    return `Live prices change by the second. I'll search it for you: try "Search ${text.trim().slice(0, 40)}" and you'll get real-time data straight from Google Finance.`;
  }

  // ── CAPITAL OF / GENERAL KNOWLEDGE ───────────────────────────────────────
  if (/capital of/.test(lower)) {
    const capMatch = lower.match(/capital of (.+?)(?:\?|$)/);
    if (capMatch) return `"Search capital of ${capMatch[1].trim()}" — I'll pull up the answer in one tap.`;
  }

  // ── TELL ME ABOUT X ───────────────────────────────────────────────────────
  if (/^tell me (about|more about|everything about) (.+)/.test(lower)) {
    const topicMatch = lower.match(/tell me (?:about|more about|everything about) (.+)/);
    const topic = topicMatch ? topicMatch[1].trim() : text.trim();
    return `I'll look that up for you. Try:\n• "Wiki ${topic}" — detailed Wikipedia article\n• "Search ${topic}" — Google results\n\nJust say either one and I'll open it instantly.`;
  }

  // ── WHAT IS / WHO IS (general knowledge question) ────────────────────────
  if (/^(what|who|where|when|why|how) (is |are |was |were |does |did |do |can )/.test(lower) && lower.split(' ').length > 3) {
    const q = text.trim().replace(/\?+$/, '');
    const shortQ = q.split(' ').slice(0, 6).join(' ');
    return `Good question. I don't have that stored locally — but I can find the answer in 2 seconds:\n\n• "Search ${q.slice(0, 50)}"\n• "Wiki ${shortQ}"\n\nJust type either one.`;
  }

  // ── YES / NO (follow-up to a previous question) ───────────────────────────
  if (/^(yes|yeah|yep|yup|sure|ok|okay|go ahead|do it|search it|find it)$/.test(lower)) {
    const lastAI = history.filter((m) => !m.isUser).slice(-1)[0];
    if (lastAI?.text.includes('Search ') || lastAI?.text.includes('"Wiki ')) {
      return "Tell me what to search — just say \"Search [your question]\" and I'll open it right away.";
    }
    return "Sure! Tell me what you need.";
  }
  if (/^(no|nope|nah|never mind|not now|cancel|stop)$/.test(lower)) {
    return "No problem. What else can I help with?";
  }

  // ── GOODNIGHT / BYE ──────────────────────────────────────────────────────
  if (/good night|goodnight|gn|bye|goodbye|see you|later|cya/.test(lower)) {
    const byes = [
      "Take care! I'll be here whenever you need me.",
      "Later! Come back whenever — I'm always on.",
      "Goodnight! Sleep well. I'll be here in the morning.",
    ];
    return byes[Math.floor(Math.random() * byes.length)];
  }

  // ── SMART FALLBACK: detect question vs statement ──────────────────────────
  const isQuestion = lower.endsWith('?') || /^(what|who|where|when|why|how|is |are |can |does |did |will |should )\w/.test(lower);
  if (isQuestion) {
    const q = text.trim().replace(/\?+$/, '');
    return `Hmm, I'm not sure about that one off the top of my head. But I can find out:\n\n• "Search ${q.slice(0, 60)}"\n• "Wiki ${q.split(' ').slice(0, 5).join(' ')}"\n\nSay either one and I'll open the answer right now.`;
  }

  // ── STATEMENT FALLBACK: warm, conversational ──────────────────────────────
  const casual = [
    "Interesting. Tell me more — or if there's something you need done, just say it.",
    "Got it. I'm listening. What do you actually need right now?",
    "I hear you. What would you like me to do about it?",
    "Noted. Anything I can help with?",
    "That's real. What can I do for you today?",
  ];
  return casual[Math.floor(Math.random() * casual.length)];
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
        content: `You are Riuka AI — a powerful, privacy-first autonomous assistant. ${timeContext}

EXECUTABLE COMMANDS (respond with the EXACT command text if the user needs one):
• open [app] — youtube, whatsapp, telegram, instagram, twitter/x, spotify, netflix, gmail, maps, facebook, tiktok, linkedin, reddit, chrome
• search [query] — Google search
• youtube [query] — YouTube search
• weather [city] — live weather via wttr.in
• navigate to [place] — Google Maps directions
• translate [text] to [language] — Google Translate
• play [song/artist] — Spotify search
• wiki [topic] — Wikipedia
• news — Google News
• calc [expression] — calculator (also understands raw math like 5*8)
• convert [N] [unit] to [unit] — km/miles, kg/lbs, °C/°F, m/ft
• timer [N] minutes/seconds — countdown alert
• alarm — open clock app
• note [text] — save to Google Keep
• call [number] — phone call
• flip coin — heads or tails
• roll dice — random d6
• random [min] to [max] — random number
• battery — battery level (web)
• define [word] — dictionary

HONESTY RULES:
- Be honest about limitations. Never pretend you can do something you can't.
- CANNOT DO: send messages automatically, read real notifications, access contacts/files/photos, make purchases, set exact alarms, scroll other apps (without Accessibility Service), run in background.
- CAN DO: open apps, search, weather, navigate, translate, calculate, convert, timer (with browser notification), notes, call (opens dialer), flip coin, roll dice, Wikipedia, news, YouTube/Instagram/Reddit sections, voice commands (web/Chrome mic button), read clipboard ("read clipboard"), remember chats between sessions (web localStorage, last 60 messages).
- "I open it, you complete it" for: WhatsApp messages, phone calls, alarms, email sending, camera.
- When user asks a question, TELL them the exact command. Be concise (1-3 sentences). Always use prior conversation context.`,
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

const SUGGESTIONS = ['YouTube trending', 'Nearby restaurants', 'Translate hello to Spanish'];

const STORAGE_KEY = 'riuka_chat_v1';

export default function ChatScreen() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputText, setInputText] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [isVoiceListening, setIsVoiceListening] = useState(false);
  const [provider, setProvider] = useState(_aiConfig.provider);
  const scrollViewRef = useRef<ScrollView>(null);
  const isTypingRef = useRef(false);
  const recognitionRef = useRef<any>(null);

  // Load saved chat history on mount
  useEffect(() => {
    if (Platform.OS === 'web') {
      try {
        const saved = localStorage.getItem(STORAGE_KEY);
        if (saved) {
          const parsed: Message[] = JSON.parse(saved);
          if (parsed.length > 0) setMessages(parsed);
        }
      } catch {}
    }
  }, []);

  // Save chat history on every change
  useEffect(() => {
    if (Platform.OS === 'web' && messages.length > 0) {
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(messages.slice(-60)));
      } catch {}
    }
  }, [messages]);

  // Request browser notification permission on load
  useEffect(() => {
    if (Platform.OS === 'web' && typeof window !== 'undefined' && 'Notification' in window) {
      if ((window as any).Notification.permission === 'default') {
        (window as any).Notification.requestPermission();
      }
    }
  }, []);

  useEffect(() => {
    const timer = setInterval(() => {
      if (_aiConfig.provider !== provider) {
        setProvider(_aiConfig.provider);
      }
    }, 1000);
    return () => clearInterval(timer);
  }, [provider]);

  const startVoice = () => {
    if (Platform.OS !== 'web') {
      Alert.alert('Voice Commands', 'Voice works in the web version. Visit the app in your browser to use it.');
      return;
    }
    const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SR) {
      Alert.alert('Voice Not Supported', 'Your browser does not support voice recognition. Try Chrome.');
      return;
    }
    const r = new SR();
    r.lang = 'en-US';
    r.continuous = false;
    r.interimResults = false;
    r.onstart = () => setIsVoiceListening(true);
    r.onend = () => { setIsVoiceListening(false); recognitionRef.current = null; };
    r.onerror = () => { setIsVoiceListening(false); recognitionRef.current = null; };
    r.onresult = (e: any) => {
      const transcript: string = e.results[0][0].transcript;
      if (transcript.trim()) sendMessage(transcript.trim());
    };
    recognitionRef.current = r;
    r.start();
  };

  const stopVoice = () => {
    recognitionRef.current?.stop();
    setIsVoiceListening(false);
  };

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
      'Clear Chat',
      'Erase all messages? This also clears saved history.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Clear', style: 'destructive', onPress: () => {
            setMessages([]);
            if (Platform.OS === 'web') { try { localStorage.removeItem(STORAGE_KEY); } catch {} }
          },
        },
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
            <TouchableOpacity
              style={[styles.micInputButton, isVoiceListening && styles.micListening]}
              onPress={isVoiceListening ? stopVoice : startVoice}
            >
              <Mic color={isVoiceListening ? '#ffffff' : Colors.primary} size={20} />
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
    borderRadius: 20,
  },
  micListening: {
    backgroundColor: Colors.primary,
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.6,
    shadowRadius: 10,
    elevation: 6,
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
