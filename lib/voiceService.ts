export type VoiceState = 'idle' | 'listening' | 'processing' | 'speaking';

const PLACEHOLDER_TRANSCRIPTS = [
  'Hello, Vexora!',
  'What can you help me with?',
  'Tell me something interesting.',
  'How are you doing today?',
  'What time is it?',
];

class VoiceService {
  public state: VoiceState = 'idle';
  public onStateChange: ((state: VoiceState) => void) | null = null;
  public onTranscript: ((text: string) => void) | null = null;

  private listeningTimer: ReturnType<typeof setTimeout> | null = null;
  private processingTimer: ReturnType<typeof setTimeout> | null = null;
  private speakingTimer: ReturnType<typeof setTimeout> | null = null;

  private setState(newState: VoiceState): void {
    this.state = newState;
    this.onStateChange?.(newState);
  }

  private clearTimers(): void {
    if (this.listeningTimer !== null) {
      clearTimeout(this.listeningTimer);
      this.listeningTimer = null;
    }
    if (this.processingTimer !== null) {
      clearTimeout(this.processingTimer);
      this.processingTimer = null;
    }
    if (this.speakingTimer !== null) {
      clearTimeout(this.speakingTimer);
      this.speakingTimer = null;
    }
  }

  startListening(): void {
    if (this.state !== 'idle') return;

    this.clearTimers();
    this.setState('listening');

    // After 2s of "listening", move to processing
    this.listeningTimer = setTimeout(() => {
      this.setState('processing');

      // After 1s of "processing", emit transcript
      this.processingTimer = setTimeout(() => {
        const transcript =
          PLACEHOLDER_TRANSCRIPTS[Math.floor(Math.random() * PLACEHOLDER_TRANSCRIPTS.length)];
        this.setState('idle');
        this.onTranscript?.(transcript);
      }, 1000);
    }, 2000);
  }

  stopListening(): void {
    this.clearTimers();
    if (this.state === 'listening' || this.state === 'processing') {
      this.setState('idle');
    }
  }

  speak(text: string): void {
    this.clearTimers();
    this.setState('speaking');

    // Estimate duration: ~15ms per character, minimum 1s, maximum 8s
    const duration = Math.min(Math.max(text.length * 15, 1000), 8000);

    this.speakingTimer = setTimeout(() => {
      this.setState('idle');
    }, duration);
  }

  isAvailable(): boolean {
    // Real voice APIs (expo-speech, react-native-voice) are not installed
    return false;
  }

  getWakeWordStatus(): boolean {
    return false;
  }
}

export const voiceService = new VoiceService();
