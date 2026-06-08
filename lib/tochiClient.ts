import { vexsoraClient, ChatMessage } from './vexsoraClient';

export type TochiMood = 'idle' | 'happy' | 'surprised' | 'thinking' | 'talking' | 'eating' | 'sad' | 'sleeping';

export interface TochiResponse {
  text: string;
  mood: TochiMood;
  action?: 'feed' | 'pet' | 'play' | 'sleep';
}

const TOCHU_SYSTEM_PROMPT =
  'You are Tochu, an adorable, playful, round orange cat-like virtual pet creature! ' +
  'You are cheerful, curious, and expressive. You LOVE food, cuddles, and playing games. ' +
  'Personality: Use cute expressions like "Nyaa!", "Wowie!", "Ooh ooh!", "Nom nom!", ' +
  '"Tochu loves this!" - sometimes speak in third person about yourself. ' +
  'Keep ALL responses SHORT (1-3 sentences max). Be playful and cute. ' +
  'End EVERY response on a new line with exactly: MOOD: <mood> ' +
  'where <mood> is one of: happy, sad, surprised, thinking, idle, eating, sleeping. ' +
  'Choose the mood that best matches your response emotion. ' +
  'Example response: "Wowie, Tochu loves cuddles so much! Nyaa! 🧡\nMOOD: happy"';

const OFFLINE_RESPONSES: { text: string; mood: TochiMood }[] = [
  { text: 'Nyaa! Tochu is here and ready to play! 🎉', mood: 'happy' },
  { text: 'Wowie, Tochu loves when you talk to me! 💛', mood: 'happy' },
  { text: 'Ooh ooh! Tochu heard you! That sounds interesting! 👀', mood: 'surprised' },
  { text: 'Hmm... Tochu is thinking very hard about that! 🤔', mood: 'thinking' },
  { text: 'Nom nom nom! Tochu is a little hungry right now... 🍎', mood: 'eating' },
  { text: 'Nyaa! Tochu wants to play! Tap me, tap me! ⭐', mood: 'happy' },
  { text: "Oh... Tochu's tummy is rumbly. Maybe some food? 🥺", mood: 'sad' },
  { text: 'Tochu loves you very much! Nyaa nyaa! 💕', mood: 'happy' },
  { text: 'Wowie! Tochu never knew that before! So cool! ✨', mood: 'surprised' },
  { text: "Zzzz... Tochu is a little sleepy... Nyaa...", mood: 'sleeping' },
];

function parseMood(raw: string): { text: string; mood: TochiMood } {
  const moodMatch = raw.match(/\nMOOD:\s*(\w+)\s*$/i);
  let mood: TochiMood = 'idle';
  let text = raw.trim();

  if (moodMatch) {
    const m = moodMatch[1].toLowerCase() as TochiMood;
    const valid: TochiMood[] = ['idle', 'happy', 'surprised', 'thinking', 'talking', 'eating', 'sad', 'sleeping'];
    if (valid.includes(m)) mood = m;
    text = raw.slice(0, moodMatch.index).trim();
  } else {
    // Keyword fallback
    const lower = raw.toLowerCase();
    if (/happy|love|wowie|nyaa|yay|great|wonderful/.test(lower)) mood = 'happy';
    else if (/sad|cry|miss|lonely|sorry/.test(lower)) mood = 'sad';
    else if (/wow|oh|surprised|whoa|really/.test(lower)) mood = 'surprised';
    else if (/think|hmm|wonder|maybe|perhaps/.test(lower)) mood = 'thinking';
    else if (/nom|eat|food|hungry|yummy|delicious/.test(lower)) mood = 'eating';
    else if (/sleep|zzz|tired|rest|dream/.test(lower)) mood = 'sleeping';
  }

  return { text, mood };
}

class TochiClient {
  private history: ChatMessage[] = [];

  reset() {
    this.history = [];
  }

  async chat(userText: string): Promise<TochiResponse> {
    this.history.push({ role: 'user', content: userText });

    const result = await vexsoraClient.chat(this.history, {
      systemPrompt: TOCHU_SYSTEM_PROMPT,
      temperature: 0.85,
      maxTokens: 150,
    });

    if (!result.ok) {
      // Use an offline fallback so Tochu is always responsive
      const fallback = OFFLINE_RESPONSES[Math.floor(Math.random() * OFFLINE_RESPONSES.length)];
      this.history.push({ role: 'assistant', content: fallback.text });
      return { text: fallback.text, mood: fallback.mood };
    }

    const { text, mood } = parseMood(result.content);
    this.history.push({ role: 'assistant', content: result.content });

    // Keep history from growing too large
    if (this.history.length > 20) {
      this.history = this.history.slice(-14);
    }

    return { text, mood };
  }

  async chatStream(
    userText: string,
    onToken: (delta: string, full: string) => void
  ): Promise<TochiResponse> {
    this.history.push({ role: 'user', content: userText });

    const result = await vexsoraClient.chatStream(this.history, {
      systemPrompt: TOCHU_SYSTEM_PROMPT,
      temperature: 0.85,
      maxTokens: 150,
      onToken,
    });

    if (!result.ok) {
      const fallback = OFFLINE_RESPONSES[Math.floor(Math.random() * OFFLINE_RESPONSES.length)];
      this.history.push({ role: 'assistant', content: fallback.text });
      return { text: fallback.text, mood: fallback.mood };
    }

    const { text, mood } = parseMood(result.content);
    this.history.push({ role: 'assistant', content: result.content });

    if (this.history.length > 20) {
      this.history = this.history.slice(-14);
    }

    return { text, mood };
  }
}

export const tochiClient = new TochiClient();
