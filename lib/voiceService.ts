import { Platform } from 'react-native';

export type VoiceState = 'idle' | 'listening' | 'processing' | 'speaking';

// Try to import expo-speech for TTS (available after expo-speech is installed)
let Speech: any = null;
try {
  Speech = require('expo-speech');
} catch {
  // Not installed — use Web Speech API fallback on web
}

// Try to import expo-av for recording-based STT stub
let Audio: any = null;
try {
  const AV = require('expo-av');
  Audio = AV.Audio;
} catch {
  // Not installed
}

class VoiceService {
  public state: VoiceState = 'idle';
  public onStateChange: ((state: VoiceState) => void) | null = null;
  public onTranscript: ((text: string) => void) | null = null;

  private speakingTimer: ReturnType<typeof setTimeout> | null = null;
  private _wakeWordActive = false;

  private setState(s: VoiceState) {
    this.state = s;
    this.onStateChange?.(s);
  }

  // ── TTS ──────────────────────────────────────────────────────────────────────

  speak(text: string, onDone?: () => void): void {
    if (!text.trim()) return;
    const clean = text.replace(/[*_~`#>]/g, '').replace(/\n+/g, '. ').slice(0, 600);

    if (Platform.OS === 'web') {
      this._webSpeak(clean, onDone);
      return;
    }

    if (Speech) {
      this.setState('speaking');
      Speech.speak(clean, {
        language: 'en-US',
        pitch: 1.05,
        rate: 1.0,
        onDone: () => {
          this.setState('idle');
          onDone?.();
        },
        onError: () => {
          this.setState('idle');
          onDone?.();
        },
      });
    } else {
      // No TTS available — simulate duration
      this.setState('speaking');
      const ms = Math.min(Math.max(clean.length * 14, 800), 8000);
      this.speakingTimer = setTimeout(() => {
        this.setState('idle');
        onDone?.();
      }, ms);
    }
  }

  private _webSpeak(text: string, onDone?: () => void): void {
    if (typeof window === 'undefined') return;
    const synth = (window as any).speechSynthesis;
    if (!synth) return;
    synth.cancel();
    this.setState('speaking');
    const utter = new (window as any).SpeechSynthesisUtterance(text);
    utter.rate = 1.0;
    utter.pitch = 1.05;
    utter.onend = () => { this.setState('idle'); onDone?.(); };
    utter.onerror = () => { this.setState('idle'); onDone?.(); };
    const voices = synth.getVoices?.() ?? [];
    const v = voices.find((v: any) => /Google.*en|en-US.*Natural/i.test(v.name)) ||
              voices.find((v: any) => v.lang?.startsWith('en'));
    if (v) utter.voice = v;
    synth.speak(utter);
  }

  stopSpeaking(): void {
    if (this.speakingTimer) { clearTimeout(this.speakingTimer); this.speakingTimer = null; }
    if (Platform.OS === 'web' && typeof window !== 'undefined') {
      (window as any).speechSynthesis?.cancel();
    } else if (Speech) {
      Speech.stop();
    }
    if (this.state === 'speaking') this.setState('idle');
  }

  // ── STT (Web Speech API on web; stub on native until expo-speech-recognition) ─

  startListening(onResult: (text: string) => void, onError?: (e: string) => void): void {
    if (this.state !== 'idle') return;
    this.setState('listening');

    if (Platform.OS === 'web') {
      this._webListen(onResult, onError);
    } else {
      // On Android: the WakeWordService handles background STT.
      // For in-app voice, we stub with a 3s listening window.
      setTimeout(() => {
        this.setState('idle');
        onError?.('Native STT not connected — use text input or ensure WakeWordService is active.');
      }, 3000);
    }
  }

  private _webListen(onResult: (text: string) => void, onError?: (e: string) => void): void {
    const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SR) {
      this.setState('idle');
      onError?.('Speech recognition not supported in this browser.');
      return;
    }
    const rec = new SR();
    rec.lang = 'en-US';
    rec.interimResults = false;
    rec.maxAlternatives = 1;
    rec.onresult = (e: any) => {
      const transcript = e.results[0]?.[0]?.transcript ?? '';
      this.setState('idle');
      onResult(transcript);
    };
    rec.onerror = (e: any) => {
      this.setState('idle');
      onError?.(e.error ?? 'STT error');
    };
    rec.onend = () => {
      if (this.state === 'listening') this.setState('idle');
    };
    rec.start();
  }

  stopListening(): void {
    if (this.state === 'listening') this.setState('idle');
  }

  // ── Wake word ─────────────────────────────────────────────────────────────────

  setWakeWordActive(active: boolean): void {
    this._wakeWordActive = active;
  }

  getWakeWordStatus(): boolean {
    return this._wakeWordActive;
  }

  isAvailable(): boolean {
    if (Platform.OS === 'web') {
      return typeof window !== 'undefined' && 'speechSynthesis' in window;
    }
    return Speech !== null;
  }
}

export const voiceService = new VoiceService();
