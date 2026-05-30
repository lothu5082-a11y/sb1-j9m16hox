// Vexsora AI Service — orchestrates the local LLM with system routing.
// All inference runs 100% on-device via llama.rn; no cloud calls.
export type AIProvider = 'local';

export interface Message {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: Date;
  provider?: AIProvider;
}

export interface AIConfig {
  provider: AIProvider;
  modelPath: string;
}

class AIService {
  private config: AIConfig = {
    provider: 'local',
    modelPath: 'file:///storage/emulated/0/Download/Llama-3.2-1B-Instruct-Q4_K_M.gguf',
  };

  getConfig(): AIConfig {
    return { ...this.config };
  }

  setModelPath(path: string): void {
    this.config.modelPath = path;
  }

  getProviderName(): string {
    return 'Vexsora On-Device';
  }

  isOnline(): boolean {
    return false;
  }

  // Fallback local reply when LLM is not loaded
  localFallback(lastUserText: string): string {
    const t = lastUserText.toLowerCase().trim();

    if (/^(hi|hello|hey|greetings|sup|yo)[\s!?.]*$/.test(t)) {
      return "Hello! I'm Vexsora, your offline AI companion. How can I help you today?";
    }
    if (/who are you|what are you/.test(t)) {
      return "I'm Vexsora — a 100% offline AI assistant powered by a local language model running directly on your device. No cloud. No API keys. Complete privacy.";
    }
    if (/what.*time|current time/.test(t)) {
      return `It's ${new Date().toLocaleTimeString()}.`;
    }
    if (/what.*date|today/.test(t)) {
      return `Today is ${new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}.`;
    }
    if (/joke|funny/.test(t)) {
      const jokes = [
        "Why do programmers prefer dark mode? Because light attracts bugs! 🐛",
        "Why was the AI bad at relationships? It kept saying 'I need more data.'",
        "How does a robot eat pizza? One byte at a time. 🍕",
      ];
      return jokes[Math.floor(Math.random() * jokes.length)];
    }
    if (/thank/.test(t)) {
      return "You're welcome! Anything else I can help with?";
    }
    if (/bye|goodbye/.test(t)) {
      return "Goodbye! I'll be right here whenever you need me. 👋";
    }
    return "I'm running in fallback mode — the local LLM model isn't loaded yet. Please set your GGUF model path in Settings and tap Load Model.";
  }
}

export const aiService = new AIService();
