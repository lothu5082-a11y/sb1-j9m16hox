import { Platform, Linking } from 'react-native';

// ── Types ────────────────────────────────────────────────────────────────────

export type IntentAction =
  | 'FLASHLIGHT_ON' | 'FLASHLIGHT_OFF'
  | 'VOLUME_UP' | 'VOLUME_DOWN' | 'VOLUME_MUTE' | 'VOLUME_UNMUTE' | 'VOLUME_MAX'
  | 'CALL_ANSWER' | 'CALL_HANGUP'
  | 'OPEN_YOUTUBE' | 'YOUTUBE_SEARCH'
  | 'WHATSAPP_TEXT' | 'WHATSAPP_OPEN'
  | 'SET_ALARM' | 'SET_TIMER'
  | 'OPEN_SETTINGS' | 'OPEN_APP'
  | 'NAVIGATE_TO'
  | 'GENERAL_CHAT';

export interface Intent {
  action: IntentAction;
  params: Record<string, string | number | boolean>;
  confidence: 'high' | 'medium';
}

// ── Native module bridge (graceful — works even without prebuild) ─────────────

let HardwareModule: any = null;
try {
  const { NativeModules } = require('react-native');
  HardwareModule = NativeModules.VexsoraHardware ?? null;
} catch {
  HardwareModule = null;
}

// ── Intent classifier ─────────────────────────────────────────────────────────

export function classifyIntent(text: string): Intent {
  const t = text.toLowerCase().trim();

  // Flashlight
  if (/(torch|flashlight|flash|light)\s*(on|off)|(turn|switch)\s*(on|off)\s*(torch|flashlight|flash|light)|(on|off)\s*(the\s*)?(torch|flashlight)/.test(t)) {
    const on = /\bon\b/.test(t) && !/\boff\b/.test(t);
    return { action: on ? 'FLASHLIGHT_ON' : 'FLASHLIGHT_OFF', params: {}, confidence: 'high' };
  }

  // Volume
  if (/(volume\s*(up|down|max|mute|unmute)|(up|down)\s*volume|louder|quieter|mute|unmute|increase.*volume|decrease.*volume|turn\s*(up|down).*volume|max\s*volume|silent\s*mode)/.test(t)) {
    if (/\bmax\b/.test(t)) return { action: 'VOLUME_MAX', params: {}, confidence: 'high' };
    if (/mute/.test(t) && !/unmute/.test(t)) return { action: 'VOLUME_MUTE', params: {}, confidence: 'high' };
    if (/unmute/.test(t)) return { action: 'VOLUME_UNMUTE', params: {}, confidence: 'high' };
    if (/(up|louder|increase|loud|high)/.test(t)) return { action: 'VOLUME_UP', params: {}, confidence: 'high' };
    return { action: 'VOLUME_DOWN', params: {}, confidence: 'high' };
  }

  // Call answer / hangup
  if (/answer\s*(the\s*)?call|pick\s*(up|the\s*phone)/.test(t)) {
    return { action: 'CALL_ANSWER', params: {}, confidence: 'high' };
  }
  if (/hang\s*up|end\s*call|reject\s*call|decline\s*call/.test(t)) {
    return { action: 'CALL_HANGUP', params: {}, confidence: 'high' };
  }

  // YouTube search
  const ytSearch = t.match(/^(?:search\s+)?(?:youtube|yt)\s+(?:for\s+)?(.+)$/);
  if (ytSearch) {
    return { action: 'YOUTUBE_SEARCH', params: { query: ytSearch[1] }, confidence: 'high' };
  }
  if (/^open\s+youtube$/.test(t)) {
    return { action: 'OPEN_YOUTUBE', params: {}, confidence: 'high' };
  }

  // WhatsApp text
  const waText = t.match(/(?:text|message|send(?:\s+message)?(?:\s+to)?|whatsapp)\s+(.+?)\s+(?:on\s+whatsapp\s+)?(?:saying|say|with|:)\s+(.+)/);
  if (waText) {
    return { action: 'WHATSAPP_TEXT', params: { contact: waText[1], message: waText[2] }, confidence: 'high' };
  }
  if (/open\s+whatsapp|launch\s+whatsapp/.test(t)) {
    return { action: 'WHATSAPP_OPEN', params: {}, confidence: 'high' };
  }

  // Alarm
  const alarmMatch = t.match(/(?:set\s+(?:an?\s+)?alarm|wake\s+me(?:\s+up)?)\s+(?:at\s+|for\s+)?(\d{1,2}(?::\d{2})?\s*(?:am|pm)?)/);
  if (alarmMatch || /set\s+alarm|wake\s+me/.test(t)) {
    return { action: 'SET_ALARM', params: { time: alarmMatch?.[1] ?? '' }, confidence: 'high' };
  }

  // Timer
  const timerMatch = t.match(/(?:set\s+(?:a\s+)?)?timer\s+(?:for\s+)?(\d+)\s*(min(?:utes?)?|sec(?:onds?)?|s|m)/);
  if (timerMatch) {
    const unit = timerMatch[2].startsWith('m') ? 'minutes' : 'seconds';
    return { action: 'SET_TIMER', params: { amount: parseInt(timerMatch[1], 10), unit }, confidence: 'high' };
  }

  // Open settings
  if (/open\s+(?:system\s+)?settings/.test(t)) {
    return { action: 'OPEN_SETTINGS', params: {}, confidence: 'high' };
  }

  // Navigate
  const navMatch = t.match(/^(?:navigate\s+to|directions?\s+to|take\s+me\s+to|go\s+to|get\s+to)\s+(.+)$/);
  if (navMatch) {
    return { action: 'NAVIGATE_TO', params: { destination: navMatch[1] }, confidence: 'high' };
  }

  // Open app
  const openMatch = t.match(/^(?:open|launch|start)\s+(\w+)$/);
  if (openMatch) {
    return { action: 'OPEN_APP', params: { app: openMatch[1] }, confidence: 'medium' };
  }

  return { action: 'GENERAL_CHAT', params: {}, confidence: 'high' };
}

// ── App URLs ──────────────────────────────────────────────────────────────────

const APP_URLS: Record<string, string> = {
  youtube: 'vnd.youtube://', whatsapp: 'whatsapp://', telegram: 'tg://',
  instagram: 'instagram://', spotify: 'spotify://', gmail: 'googlegmail://',
  maps: 'comgooglemaps://', netflix: 'nflx://', settings: 'com.android.settings',
};

// ── Command executor ──────────────────────────────────────────────────────────

let _speechVolume = 0.9;
let _torchStream: any = null;

export async function executeCommand(text: string): Promise<string | null> {
  const lower = text.toLowerCase().trim();
  const intent = classifyIntent(text);

  if (intent.action === 'GENERAL_CHAT') return null;

  // ── Flashlight ──────────────────────────────────────────────────────────────
  if (intent.action === 'FLASHLIGHT_ON' || intent.action === 'FLASHLIGHT_OFF') {
    const on = intent.action === 'FLASHLIGHT_ON';
    if (Platform.OS === 'android' && HardwareModule?.toggleFlashlight) {
      try {
        await HardwareModule.toggleFlashlight(on);
        return on ? '🔦 Flashlight ON.' : '🔦 Flashlight OFF.';
      } catch (e: any) {
        return `⚠️ Flashlight error: ${e.message}`;
      }
    }
    if (Platform.OS === 'web') {
      return await _webFlashlight(on);
    }
    return '⚠️ Flashlight requires the native Android build.';
  }

  // ── Volume ──────────────────────────────────────────────────────────────────
  if (intent.action.startsWith('VOLUME_')) {
    if (Platform.OS === 'android' && HardwareModule?.adjustVolume) {
      try {
        if (intent.action === 'VOLUME_UP') await HardwareModule.adjustVolume(1);
        else if (intent.action === 'VOLUME_DOWN') await HardwareModule.adjustVolume(-1);
        else if (intent.action === 'VOLUME_MUTE') await HardwareModule.setVolume(5, 0);
        else if (intent.action === 'VOLUME_MAX') await HardwareModule.setVolume(5, 100);
        const labels: Record<string, string> = {
          VOLUME_UP: '🔊 Volume increased.', VOLUME_DOWN: '🔉 Volume decreased.',
          VOLUME_MUTE: '🔇 Volume muted.', VOLUME_UNMUTE: '🔊 Volume restored.',
          VOLUME_MAX: '🔊 Volume at maximum.',
        };
        return labels[intent.action] ?? '🔊 Volume adjusted.';
      } catch (e: any) { return `⚠️ Volume error: ${e.message}`; }
    }
    // Web speech volume stub
    if (intent.action === 'VOLUME_UP') _speechVolume = Math.min(1.0, _speechVolume + 0.2);
    else if (intent.action === 'VOLUME_DOWN') _speechVolume = Math.max(0.1, _speechVolume - 0.2);
    else if (intent.action === 'VOLUME_MUTE') _speechVolume = 0;
    else if (intent.action === 'VOLUME_UNMUTE' || intent.action === 'VOLUME_MAX') _speechVolume = 1.0;
    return `🔊 Voice volume: ${Math.round(_speechVolume * 100)}%`;
  }

  // ── Call answer/hangup ──────────────────────────────────────────────────────
  if (intent.action === 'CALL_ANSWER') {
    if (Platform.OS === 'android' && HardwareModule?.answerCall) {
      try { await HardwareModule.answerCall(); return '📞 Answering call...'; }
      catch (e: any) { return `⚠️ Could not answer call: ${e.message}`; }
    }
    return '📞 Call answer requires the native Android build and ANSWER_PHONE_CALLS permission.';
  }
  if (intent.action === 'CALL_HANGUP') {
    if (Platform.OS === 'android' && HardwareModule?.hangupCall) {
      try { await HardwareModule.hangupCall(); return '📵 Call ended.'; }
      catch (e: any) { return `⚠️ Could not end call: ${e.message}`; }
    }
    return '📵 Hang-up requires the native Android build.';
  }

  // ── YouTube ─────────────────────────────────────────────────────────────────
  if (intent.action === 'YOUTUBE_SEARCH') {
    const q = encodeURIComponent(String(intent.params.query ?? lower));
    const ytDeep = `vnd.youtube://results?search_query=${q}`;
    const ytWeb = `https://www.youtube.com/results?search_query=${q}`;
    if (Platform.OS === 'android') {
      const can = await Linking.canOpenURL(ytDeep).catch(() => false);
      await Linking.openURL(can ? ytDeep : ytWeb);
    } else {
      await Linking.openURL(ytWeb);
    }
    return `▶️ Searching YouTube for "${intent.params.query}"...`;
  }
  if (intent.action === 'OPEN_YOUTUBE') {
    await Linking.openURL(Platform.OS === 'android' ? 'vnd.youtube://' : 'https://youtube.com');
    return '▶️ Opening YouTube...';
  }

  // ── WhatsApp ─────────────────────────────────────────────────────────────────
  if (intent.action === 'WHATSAPP_TEXT') {
    const { contact, message } = intent.params;
    const waUrl = `https://wa.me/?text=${encodeURIComponent(String(message))}`;
    await Linking.openURL(waUrl);
    return `💬 Opening WhatsApp to message ${contact}: "${message}"`;
  }
  if (intent.action === 'WHATSAPP_OPEN') {
    const can = await Linking.canOpenURL('whatsapp://').catch(() => false);
    await Linking.openURL(can ? 'whatsapp://' : 'https://web.whatsapp.com');
    return '💬 Opening WhatsApp...';
  }

  // ── Alarm ────────────────────────────────────────────────────────────────────
  if (intent.action === 'SET_ALARM') {
    if (Platform.OS === 'android') {
      const time = String(intent.params.time ?? '');
      let alarmUrl = 'android.intent.action.SET_ALARM';
      if (time) {
        const m = time.match(/(\d{1,2})(?::(\d{2}))?\s*(am|pm)?/i);
        if (m) {
          let h = parseInt(m[1], 10);
          const min = parseInt(m[2] ?? '0', 10);
          const period = (m[3] ?? '').toLowerCase();
          if (period === 'pm' && h < 12) h += 12;
          if (period === 'am' && h === 12) h = 0;
          alarmUrl = `android.intent.action.SET_ALARM#Hour=${h}&Minutes=${min}&message=Vexsora+Alarm&vibrate=true`;
        }
      }
      await Linking.openURL(alarmUrl).catch(() => Linking.openURL('clock://'));
      return `⏰ Setting alarm${intent.params.time ? ` for ${intent.params.time}` : ''}...`;
    }
    return '⏰ Alarm setting requires the Android build.';
  }

  // ── Timer ────────────────────────────────────────────────────────────────────
  if (intent.action === 'SET_TIMER') {
    const amount = Number(intent.params.amount);
    const unit = String(intent.params.unit);
    const ms = unit === 'minutes' ? amount * 60000 : amount * 1000;
    const label = `${amount} ${unit}`;
    setTimeout(() => {
      if (typeof window !== 'undefined' && 'Notification' in (window as any)) {
        const W = window as any;
        if (W.Notification.permission === 'granted') {
          new W.Notification('Vexsora — Timer Done ⏱️', { body: `Your ${label} timer is up!` });
          return;
        }
      }
    }, ms);
    return `⏱️ Timer set for ${label}. I'll notify you when it's done.`;
  }

  // ── Open settings ────────────────────────────────────────────────────────────
  if (intent.action === 'OPEN_SETTINGS') {
    if (Platform.OS === 'android') {
      await Linking.openURL('android.settings.SETTINGS').catch(() => Linking.openURL('app-settings:'));
    }
    return '⚙️ Opening system settings...';
  }

  // ── Navigate ─────────────────────────────────────────────────────────────────
  if (intent.action === 'NAVIGATE_TO') {
    const dest = encodeURIComponent(String(intent.params.destination));
    if (Platform.OS === 'android') {
      const can = await Linking.canOpenURL(`google.navigation:q=${dest}`).catch(() => false);
      if (can) { await Linking.openURL(`google.navigation:q=${dest}`); }
      else { await Linking.openURL(`https://maps.google.com/maps?daddr=${dest}`); }
    } else {
      await Linking.openURL(`https://maps.google.com/maps?daddr=${dest}`);
    }
    return `🗺️ Navigating to ${intent.params.destination}...`;
  }

  // ── Open app ─────────────────────────────────────────────────────────────────
  if (intent.action === 'OPEN_APP') {
    const appName = String(intent.params.app).toLowerCase();
    const url = APP_URLS[appName];
    if (url) {
      const can = await Linking.canOpenURL(url).catch(() => false);
      await Linking.openURL(can ? url : `https://${appName}.com`);
      return `📱 Opening ${intent.params.app}...`;
    }
    await Linking.openURL(`https://${appName}.com`).catch(() => null);
    return `📱 Trying to open ${intent.params.app}...`;
  }

  return null;
}

// ── Web flashlight helper ────────────────────────────────────────────────────

async function _webFlashlight(on: boolean): Promise<string> {
  try {
    if (on) {
      if (_torchStream) { (_torchStream as any).getTracks().forEach((t: any) => t.stop()); _torchStream = null; }
      const stream = await (navigator.mediaDevices as any).getUserMedia({ video: { facingMode: { exact: 'environment' } } });
      const [track] = stream.getVideoTracks();
      const caps: any = (track as any).getCapabilities?.() ?? {};
      if (!caps.torch) { stream.getTracks().forEach((t: any) => t.stop()); return '⚠️ Torch not supported on this device.'; }
      await (track as any).applyConstraints({ advanced: [{ torch: true }] });
      _torchStream = stream;
      return '🔦 Flashlight ON! Say "torch off" to turn it off.';
    } else {
      if (_torchStream) { (_torchStream as any).getTracks().forEach((t: any) => t.stop()); _torchStream = null; }
      return '🔦 Flashlight OFF.';
    }
  } catch {
    return '⚠️ Cannot access torch. Allow camera permission.';
  }
}

export function getSpeechVolume(): number { return _speechVolume; }
