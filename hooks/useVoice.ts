import { useState, useEffect, useCallback } from 'react';
import * as Speech from 'expo-speech';
import {
  ExpoSpeechRecognitionModule,
  useSpeechRecognitionEvent,
} from 'expo-speech-recognition';

export type VoiceState = 'idle' | 'listening' | 'processing' | 'speaking';

interface UseVoiceOptions {
  onResult?: (text: string) => void;
  lang?: string;
}

export function useVoice({ onResult, lang = 'en-US' }: UseVoiceOptions = {}) {
  const [state, setState] = useState<VoiceState>('idle');
  const [transcript, setTranscript] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isSpeaking, setIsSpeaking] = useState(false);

  useSpeechRecognitionEvent('start', () => setState('listening'));
  useSpeechRecognitionEvent('end', () => {
    if (state === 'listening') setState('idle');
  });
  useSpeechRecognitionEvent('result', (event) => {
    const text = event.results[0]?.transcript ?? '';
    setTranscript(text);
    if (event.isFinal && text) {
      setState('processing');
      onResult?.(text);
    }
  });
  useSpeechRecognitionEvent('error', (event) => {
    setError(event.error);
    setState('idle');
  });

  const startListening = useCallback(async () => {
    try {
      setError(null);
      setTranscript('');
      const { granted } = await ExpoSpeechRecognitionModule.requestPermissionsAsync();
      if (!granted) {
        setError('Microphone permission denied');
        return;
      }
      ExpoSpeechRecognitionModule.start({ lang, interimResults: true });
    } catch (e: any) {
      setError(e.message);
    }
  }, [lang]);

  const stopListening = useCallback(() => {
    ExpoSpeechRecognitionModule.stop();
    setState('idle');
  }, []);

  const speak = useCallback((text: string, onDone?: () => void) => {
    Speech.stop();
    setState('speaking');
    setIsSpeaking(true);
    Speech.speak(text, {
      language: lang,
      pitch: 1.0,
      rate: 0.95,
      onDone: () => {
        setState('idle');
        setIsSpeaking(false);
        onDone?.();
      },
      onStopped: () => {
        setState('idle');
        setIsSpeaking(false);
      },
      onError: () => {
        setState('idle');
        setIsSpeaking(false);
      },
    });
  }, [lang]);

  const stopSpeaking = useCallback(() => {
    Speech.stop();
    setState('idle');
    setIsSpeaking(false);
  }, []);

  const toggle = useCallback(() => {
    if (state === 'listening') {
      stopListening();
    } else if (state === 'speaking') {
      stopSpeaking();
    } else {
      startListening();
    }
  }, [state, startListening, stopListening, stopSpeaking]);

  return {
    state,
    transcript,
    error,
    isSpeaking,
    isListening: state === 'listening',
    startListening,
    stopListening,
    speak,
    stopSpeaking,
    toggle,
  };
}
