import { Platform } from 'react-native';

// Native modules — present only in a real device build. Required lazily so the
// web bundle / Expo Go keep working.
let Speech: any = null;
let SpeechRecognition: any = null;
try {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  Speech = require('expo-speech');
} catch { Speech = null; }
try {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  SpeechRecognition = require('expo-speech-recognition');
} catch { SpeechRecognition = null; }

export type VoiceState = 'idle' | 'listening' | 'processing' | 'speaking';

class VoiceService {
  public state: VoiceState = 'idle';
  public onStateChange: ((state: VoiceState) => void) | null = null;
  public onTranscript: ((text: string) => void) | null = null;
  public onError: ((msg: string) => void) | null = null;

  private speechVolume = 0.9;
  private lang = 'en-US';
  private listeners: any[] = [];

  setLanguage(code: string): void { this.lang = code; }
  setVolume(v: number): void { this.speechVolume = Math.max(0, Math.min(1, v)); }

  private setState(s: VoiceState): void {
    this.state = s;
    this.onStateChange?.(s);
  }

  /** Real microphone speech-to-text is available (native build only). */
  isAvailable(): boolean {
    return Platform.OS !== 'web' && SpeechRecognition != null;
  }

  /** Text-to-speech (talk back) is available. */
  canSpeak(): boolean {
    if (Platform.OS === 'web') return typeof window !== 'undefined' && 'speechSynthesis' in window;
    return Speech != null;
  }

  // ── Listening (speech → text) ──────────────────────────────────────────────
  async startListening(): Promise<void> {
    if (this.state === 'listening') return;

    // Web fallback uses the browser Web Speech API.
    if (Platform.OS === 'web') {
      this.startWebListening();
      return;
    }

    if (!SpeechRecognition) {
      this.onError?.('Voice input needs the installed Android app.');
      return;
    }

    try {
      const perm = await SpeechRecognition.ExpoSpeechRecognitionModule.requestPermissionsAsync();
      if (!perm.granted) {
        this.onError?.('Microphone permission denied.');
        return;
      }

      this.removeListeners();
      this.listeners.push(
        SpeechRecognition.addSpeechRecognitionListener('result', (e: any) => {
          const text = e?.results?.[0]?.transcript ?? '';
          if (e?.isFinal && text.trim()) {
            this.setState('idle');
            this.onTranscript?.(text.trim());
          }
        })
      );
      this.listeners.push(
        SpeechRecognition.addSpeechRecognitionListener('error', (e: any) => {
          this.setState('idle');
          this.onError?.(e?.message ?? 'Voice recognition error');
        })
      );
      this.listeners.push(
        SpeechRecognition.addSpeechRecognitionListener('end', () => {
          if (this.state === 'listening') this.setState('idle');
        })
      );

      this.setState('listening');
      SpeechRecognition.ExpoSpeechRecognitionModule.start({
        lang: this.lang,
        interimResults: true,
        continuous: false,
      });
    } catch (e: any) {
      this.setState('idle');
      this.onError?.(e?.message ?? 'Could not start listening');
    }
  }

  stopListening(): void {
    if (Platform.OS === 'web') {
      try { (this as any)._webRec?.stop(); } catch { }
    } else if (SpeechRecognition) {
      try { SpeechRecognition.ExpoSpeechRecognitionModule.stop(); } catch { }
    }
    this.removeListeners();
    if (this.state === 'listening' || this.state === 'processing') this.setState('idle');
  }

  private startWebListening(): void {
    const W = window as any;
    const Rec = W.SpeechRecognition || W.webkitSpeechRecognition;
    if (!Rec) { this.onError?.('This browser does not support voice input.'); return; }
    const rec = new Rec();
    (this as any)._webRec = rec;
    rec.lang = this.lang;
    rec.interimResults = false;
    rec.maxAlternatives = 1;
    rec.onresult = (ev: any) => {
      const text = ev.results?.[0]?.[0]?.transcript ?? '';
      this.setState('idle');
      if (text.trim()) this.onTranscript?.(text.trim());
    };
    rec.onerror = (ev: any) => { this.setState('idle'); this.onError?.(ev?.error ?? 'Voice error'); };
    rec.onend = () => { if (this.state === 'listening') this.setState('idle'); };
    this.setState('listening');
    try { rec.start(); } catch { this.setState('idle'); }
  }

  // ── Speaking (text → speech) ───────────────────────────────────────────────
  speak(text: string): void {
    const clean = text
      .replace(/[*_~`#>]/g, '')
      .replace(/\n+/g, '. ')
      .replace(/\.{2,}/g, '.')
      .slice(0, 1000);
    if (!clean.trim()) return;

    if (Platform.OS === 'web') {
      const synth = (window as any)?.speechSynthesis;
      if (!synth) return;
      synth.cancel();
      const utter = new (window as any).SpeechSynthesisUtterance(clean);
      utter.rate = 1.0;
      utter.pitch = 1.05;
      utter.volume = this.speechVolume;
      utter.lang = this.lang;
      utter.onstart = () => this.setState('speaking');
      utter.onend = () => this.setState('idle');
      synth.speak(utter);
      return;
    }

    if (!Speech) return;
    this.setState('speaking');
    Speech.speak(clean, {
      language: this.lang,
      pitch: 1.05,
      rate: 1.0,
      volume: this.speechVolume,
      onDone: () => this.setState('idle'),
      onStopped: () => this.setState('idle'),
      onError: () => this.setState('idle'),
    });
  }

  stopSpeaking(): void {
    if (Platform.OS === 'web') {
      try { (window as any)?.speechSynthesis?.cancel(); } catch { }
    } else if (Speech) {
      try { Speech.stop(); } catch { }
    }
    if (this.state === 'speaking') this.setState('idle');
  }

  private removeListeners(): void {
    for (const l of this.listeners) {
      try { l?.remove?.(); } catch { }
    }
    this.listeners = [];
  }
}

export const voiceService = new VoiceService();
