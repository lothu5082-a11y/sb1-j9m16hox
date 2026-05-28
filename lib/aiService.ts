// In-memory storage
const store = new Map<string, string>();
const storage = {
  getItem: async (key: string) => store.get(key) ?? null,
  setItem: async (key: string, value: string) => { store.set(key, value); },
  removeItem: async (key: string) => { store.delete(key); },
};

export type AIProvider = 'openai' | 'gemini' | 'claude' | 'groq' | 'local';

export interface Message {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: Date;
  provider?: AIProvider;
}

export interface AIConfig {
  provider: AIProvider;
  apiKey: string;
  model?: string;
}

const DEFAULT_SYSTEM_PROMPT =
  'You are Riuka AI, a futuristic, intelligent, and helpful AI assistant. Be concise, smart, and helpful.';

const CONFIG_KEY = 'riuka_ai_config';

class AIService {
  private config: AIConfig = { provider: 'local', apiKey: '' };

  async loadConfig(): Promise<void> {
    try {
      const raw = await storage.getItem(CONFIG_KEY);
      if (raw) {
        this.config = JSON.parse(raw);
      }
    } catch {
      // keep default
    }
  }

  async saveConfig(config: AIConfig): Promise<void> {
    this.config = config;
    await storage.setItem(CONFIG_KEY, JSON.stringify(config));
  }

  getConfig(): AIConfig {
    return { ...this.config };
  }

  getProviderName(): string {
    switch (this.config.provider) {
      case 'openai':
        return 'GPT-4o Mini';
      case 'gemini':
        return 'Gemini Flash';
      case 'claude':
        return 'Claude Haiku';
      case 'groq':
        return 'LLaMA 3.1 (Groq)';
      case 'local':
      default:
        return 'Riuka Local';
    }
  }

  async sendMessage(messages: Message[], systemPrompt?: string): Promise<string> {
    const { provider, apiKey } = this.config;

    if (!apiKey || provider === 'local') {
      return this.localResponse(messages);
    }

    try {
      switch (provider) {
        case 'openai':
          return await this.openAIRequest(messages, systemPrompt);
        case 'groq':
          return await this.groqRequest(messages, systemPrompt);
        case 'gemini':
          return await this.geminiRequest(messages, systemPrompt);
        case 'claude':
          return await this.claudeRequest(messages, systemPrompt);
        default:
          return this.localResponse(messages);
      }
    } catch {
      return this.localResponse(messages);
    }
  }

  private buildChatMessages(
    messages: Message[],
    systemPrompt?: string
  ): { role: string; content: string }[] {
    const sys = systemPrompt ?? DEFAULT_SYSTEM_PROMPT;
    const history = messages
      .filter((m) => m.role !== 'system')
      .map((m) => ({ role: m.role, content: m.content }));
    return [{ role: 'system', content: sys }, ...history];
  }

  private async openAIRequest(messages: Message[], systemPrompt?: string): Promise<string> {
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${this.config.apiKey}`,
      },
      body: JSON.stringify({
        model: this.config.model ?? 'gpt-4o-mini',
        messages: this.buildChatMessages(messages, systemPrompt),
        max_tokens: 1024,
      }),
    });
    if (!response.ok) throw new Error(`OpenAI error: ${response.status}`);
    const data = await response.json();
    return data.choices?.[0]?.message?.content?.trim() ?? '';
  }

  private async groqRequest(messages: Message[], systemPrompt?: string): Promise<string> {
    const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${this.config.apiKey}`,
      },
      body: JSON.stringify({
        model: this.config.model ?? 'llama-3.1-8b-instant',
        messages: this.buildChatMessages(messages, systemPrompt),
        max_tokens: 1024,
      }),
    });
    if (!response.ok) throw new Error(`Groq error: ${response.status}`);
    const data = await response.json();
    return data.choices?.[0]?.message?.content?.trim() ?? '';
  }

  private async geminiRequest(messages: Message[], systemPrompt?: string): Promise<string> {
    const sys = systemPrompt ?? DEFAULT_SYSTEM_PROMPT;
    const contents = messages
      .filter((m) => m.role !== 'system')
      .map((m) => ({
        role: m.role === 'assistant' ? 'model' : 'user',
        parts: [{ text: m.content }],
      }));

    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${this.config.apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          system_instruction: { parts: [{ text: sys }] },
          contents,
          generationConfig: { maxOutputTokens: 1024 },
        }),
      }
    );
    if (!response.ok) throw new Error(`Gemini error: ${response.status}`);
    const data = await response.json();
    return data.candidates?.[0]?.content?.parts?.[0]?.text?.trim() ?? '';
  }

  private async claudeRequest(messages: Message[], systemPrompt?: string): Promise<string> {
    const sys = systemPrompt ?? DEFAULT_SYSTEM_PROMPT;
    const history = messages
      .filter((m) => m.role !== 'system')
      .map((m) => ({ role: m.role, content: m.content }));

    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': this.config.apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: this.config.model ?? 'claude-3-haiku-20240307',
        max_tokens: 1024,
        system: sys,
        messages: history,
      }),
    });
    if (!response.ok) throw new Error(`Claude error: ${response.status}`);
    const data = await response.json();
    return data.content?.[0]?.text?.trim() ?? '';
  }

  private localResponse(messages: Message[]): string {
    const lastUserMessage = [...messages]
      .reverse()
      .find((m) => m.role === 'user');
    const text = (lastUserMessage?.content ?? '').toLowerCase().trim();

    // Greetings
    if (/^(hi|hello|hey|greetings|sup|yo|howdy)[\s!?.]*$/.test(text)) {
      return "Hello! I'm Riuka AI, your futuristic assistant. How can I help you today?";
    }

    // How are you
    if (/how are you|how do you do|how's it going/.test(text)) {
      return "I'm running at peak efficiency! Ready to assist you with anything you need.";
    }

    // Time
    if (/what.*(time|hour)/.test(text) || /current time/.test(text)) {
      const now = new Date();
      return `The current time is ${now.toLocaleTimeString()}.`;
    }

    // Date
    if (/what.*(date|day)|today/.test(text)) {
      const now = new Date();
      return `Today is ${now.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}.`;
    }

    // Who are you / what are you
    if (/who are you|what are you|tell me about yourself/.test(text)) {
      return "I'm Riuka AI — a next-generation AI assistant designed to be fast, intelligent, and always at your side. I can answer questions, help with tasks, and adapt to your needs. Connect a real AI provider in settings for the full experience!";
    }

    // Help
    if (/^help[\s!?.]*$/.test(text) || /what can you do|your capabilities/.test(text)) {
      return "I can help you with:\n• Answering questions\n• Setting reminders\n• Gaming performance tips\n• General knowledge\n• Conversation & brainstorming\n\nFor full AI power, add an API key in settings (OpenAI, Gemini, Claude, or Groq).";
    }

    // Thank you
    if (/thank(s| you)|thx|ty[\s!?.]*$/.test(text)) {
      return "You're welcome! Let me know if there's anything else I can help with.";
    }

    // Bye / goodbye
    if (/bye|goodbye|see you|later|cya/.test(text)) {
      return "Goodbye! Come back anytime — Riuka AI is always here for you.";
    }

    // Weather (no real API)
    if (/weather|forecast|temperature/.test(text)) {
      return "I don't have access to live weather data in offline mode. Try connecting a real AI provider or check a weather app for current conditions.";
    }

    // Joke
    if (/joke|funny|laugh/.test(text)) {
      const jokes = [
        "Why do programmers prefer dark mode? Because light attracts bugs! 🐛",
        "Why was the AI bad at relationships? It kept saying 'I need more data.'",
        "How does a robot eat pizza? One byte at a time.",
      ];
      return jokes[Math.floor(Math.random() * jokes.length)];
    }

    // Default fallback
    return "I'm running in local mode with limited capabilities. For intelligent responses, please add an API key for OpenAI, Gemini, Claude, or Groq in the settings. In the meantime, I can answer basic questions about time, date, and general topics!";
  }

  isOnline(): boolean {
    return Boolean(this.config.apiKey) && this.config.provider !== 'local';
  }
}

export const aiService = new AIService();
