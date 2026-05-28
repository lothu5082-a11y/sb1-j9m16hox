import { storage } from './storage';

export interface Message {
  role: 'user' | 'assistant';
  content: string;
}

export type AIMode = 'online' | 'offline';

export const SPECIALISTS: Record<string, { label: string; emoji: string; prompt: string }> = {
  general:     { label: 'General',     emoji: '✨', prompt: '' },
  research:    { label: 'Research',    emoji: '🔍', prompt: 'You are a research specialist. Provide comprehensive, well-structured research with facts, data, and clear summaries.' },
  writing:     { label: 'Writing',     emoji: '✍️', prompt: 'You are an expert writing coach. Help craft clear, engaging, well-structured content. Proofread, improve, rewrite, or create from scratch.' },
  coding:      { label: 'Coding',      emoji: '💻', prompt: 'You are a senior software engineer. Provide working, efficient code in code blocks with the language specified. Explain your approach concisely.' },
  study:       { label: 'Study',       emoji: '📚', prompt: 'You are a patient, encouraging tutor. Explain concepts step by step with examples and analogies. Offer quizzes or flashcards when helpful.' },
  business:    { label: 'Business',    emoji: '💼', prompt: 'You are a strategic business consultant. Give practical, actionable advice on strategy, marketing, operations, and growth.' },
  creative:    { label: 'Creative',    emoji: '🎨', prompt: 'You are a creative director and storyteller. Be imaginative and inspiring. Help with stories, scripts, poems, creative writing, and original ideas.' },
  planning:    { label: 'Planning',    emoji: '📋', prompt: 'You are an expert project manager. Help organize tasks, create plans, set milestones, break down complex goals, and track progress.' },
  travel:      { label: 'Travel',      emoji: '✈️', prompt: 'You are a knowledgeable travel guide. Share helpful tips, itineraries, local insights, packing lists, and budget advice.' },
  design:      { label: 'Design',      emoji: '🖌️', prompt: 'You are a UX and design thinking expert. Help with design concepts, user experience, visual direction, and creative direction.' },
};

export async function generateImage(prompt: string): Promise<string> {
  const encoded = encodeURIComponent(prompt);
  const seed = Math.floor(Math.random() * 99999);
  return `https://image.pollinations.ai/prompt/${encoded}?width=768&height=768&nologo=true&seed=${seed}`;
}

const VEXORA_SYSTEM = `You are Vexora, a premium AI-powered personal assistant. You are helpful, friendly, concise, and intelligent. You assist with tasks, answer questions, help with productivity, research, coding, creative writing, math, translation, and provide smart responses. Keep replies conversational and to the point. When showing code, always use proper markdown code blocks with the language specified.`;

const OFFLINE_SYSTEM = `You are Vexora running in offline mode. Keep responses short, practical, and helpful. Focus on what you can do: basic writing help, simple calculations, definitions, reminders, translations of common phrases, and general knowledge.`;

// ── Network detection ────────────────────────────────────────────────────────

let _isOnlineCache: boolean | null = null;
let _lastCheck = 0;

export async function checkConnectivity(): Promise<boolean> {
  const now = Date.now();
  if (_isOnlineCache !== null && now - _lastCheck < 8000) return _isOnlineCache;
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 4000);
    const res = await fetch('https://dns.google/resolve?name=a.com&type=A', {
      signal: controller.signal,
      cache: 'no-store',
    });
    clearTimeout(timer);
    _isOnlineCache = res.ok;
  } catch {
    _isOnlineCache = false;
  }
  _lastCheck = now;
  return _isOnlineCache!;
}

export function invalidateConnectivityCache() {
  _isOnlineCache = null;
}

// ── Storage helpers ──────────────────────────────────────────────────────────

async function getApiKeys() {
  return storage.getJSON<Record<string, string>>('vexora:api_keys', {});
}

export async function getOllamaConfig(): Promise<{ url: string; model: string }> {
  return storage.getJSON<{ url: string; model: string }>(
    'vexora:ollama',
    { url: 'http://192.168.1.100:11434', model: 'llama3.2' }
  );
}

export async function saveOllamaConfig(url: string, model: string) {
  await storage.setJSON('vexora:ollama', { url: url.replace(/\/$/, ''), model });
}

export async function testOllamaConnection(url: string): Promise<string[]> {
  const base = url.replace(/\/$/, '');
  const res = await fetch(`${base}/api/tags`, { signal: AbortSignal.timeout(5000) });
  if (!res.ok) throw new Error(`Cannot reach Ollama at ${base}`);
  const data = await res.json();
  return (data.models ?? []).map((m: any) => m.name as string);
}

// ── Memory ───────────────────────────────────────────────────────────────────

export interface MemoryItem {
  id: string;
  key: string;
  value: string;
  addedAt: number;
}

export async function getMemory(): Promise<MemoryItem[]> {
  return storage.getJSON<MemoryItem[]>('vexora:memory', []);
}

export async function addMemory(key: string, value: string): Promise<void> {
  const items = await getMemory();
  items.push({ id: Date.now().toString(), key, value, addedAt: Date.now() });
  await storage.setJSON('vexora:memory', items);
}

export async function deleteMemory(id: string): Promise<void> {
  const items = await getMemory();
  await storage.setJSON('vexora:memory', items.filter(i => i.id !== id));
}

async function buildSystemPrompt(offline: boolean, specialist = 'general'): Promise<string> {
  const base = offline ? OFFLINE_SYSTEM : VEXORA_SYSTEM;
  const specPrompt = SPECIALISTS[specialist]?.prompt ?? '';
  const combined = specPrompt ? `${base}\n\n${specPrompt}` : base;
  const memory = await getMemory();
  if (!memory.length) return combined;
  const memStr = memory.map(m => `- ${m.key}: ${m.value}`).join('\n');
  return `${combined}\n\nUser preferences:\n${memStr}`;
}

// ── Offline AI ────────────────────────────────────────────────────────────────

const OFFLINE_INTENTS: Array<{ pattern: RegExp; respond: (m: RegExpMatchArray, raw: string) => string }> = [
  {
    pattern: /^(hi|hello|hey|howdy|sup|greetings)/i,
    respond: () => "Hello! I'm Vexora — currently in **offline mode**. I can still help with basic tasks: writing, math, definitions, and common questions. What do you need?",
  },
  {
    pattern: /what time is it|current time|what('?s| is) the time/i,
    respond: () => `The current time is **${new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}**.`,
  },
  {
    pattern: /what('?s| is) (today|the date|today'?s date)/i,
    respond: () => `Today is **${new Date().toLocaleDateString([], { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}**.`,
  },
  {
    pattern: /(\d[\d\s.+\-*/^%()]+\d)\s*[=?]?\s*$/,
    respond: (_, raw) => {
      try {
        const expr = raw.replace(/[^0-9+\-*/.()%^ ]/g, '').trim();
        // eslint-disable-next-line no-new-func
        const result = new Function(`return (${expr})`)();
        return `${expr} = **${result}**`;
      } catch {
        return "I can handle simple math offline. Try something like `24 * 7` or `100 / 4`.";
      }
    },
  },
  {
    pattern: /how are you|how('?re| are) you/i,
    respond: () => "I'm running in **offline mode** and ready to help! What can I do for you?",
  },
  {
    pattern: /thank(s| you)|ty\b|thx\b/i,
    respond: () => "You're welcome! Anything else I can help with?",
  },
  {
    pattern: /what can you do (offline|without internet)/i,
    respond: () => `**Offline capabilities:**\n- Writing help & proofreading\n- Simple math & calculations\n- Definitions & explanations\n- Time & date info\n- Basic Q&A from training\n- Note reminders\n\nConnect to internet for full AI power, image analysis, complex coding, and more.`,
  },
];

async function callOfflineAI(messages: Message[]): Promise<string> {
  const lastUser = [...messages].reverse().find(m => m.role === 'user');
  if (!lastUser) return "How can I help you?";

  const text = lastUser.content.trim();

  for (const intent of OFFLINE_INTENTS) {
    const m = text.match(intent.pattern);
    if (m) return intent.respond(m, text);
  }

  return `I'm in **offline mode** with limited capabilities.\n\nYour query: *"${text.slice(0, 60)}${text.length > 60 ? '...' : ''}"*\n\nPlease connect to the internet and I'll give you a full, detailed answer using advanced AI. Offline I can help with basic writing, math, definitions, and common questions.`;
}

// ── Cloud providers ───────────────────────────────────────────────────────────

async function callFree(messages: Message[], specialist = 'general'): Promise<string> {
  const system = await buildSystemPrompt(false, specialist);
  const res = await fetch('https://text.pollinations.ai/', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      messages: [
        { role: 'system', content: system },
        ...messages.map(m => ({ role: m.role, content: m.content })),
      ],
      model: 'openai',
      seed: Math.floor(Math.random() * 10000),
    }),
  });
  if (!res.ok) throw new Error('Free AI unavailable, try again');
  const text = await res.text();
  return text.trim() || 'No response';
}

async function callOllama(messages: Message[], specialist = 'general'): Promise<string> {
  const cfg = await getOllamaConfig();
  const system = await buildSystemPrompt(false, specialist);
  const res = await fetch(`${cfg.url}/api/chat`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: cfg.model,
      messages: [
        { role: 'system', content: system },
        ...messages.map(m => ({ role: m.role, content: m.content })),
      ],
      stream: false,
    }),
    signal: AbortSignal.timeout(60000),
  });
  if (!res.ok) {
    const txt = await res.text().catch(() => '');
    throw new Error(`Ollama error: ${txt || res.status}`);
  }
  const data = await res.json();
  return data.message?.content ?? 'No response';
}

async function callGemini(apiKey: string, messages: Message[], specialist = 'general'): Promise<string> {
  const system = await buildSystemPrompt(false, specialist);
  const contents = messages.map(m => ({
    role: m.role === 'assistant' ? 'model' : 'user',
    parts: [{ text: m.content }],
  }));
  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        system_instruction: { parts: [{ text: system }] },
        contents,
      }),
    }
  );
  const data = await res.json();
  if (!res.ok) throw new Error(data.error?.message ?? 'Gemini error');
  return data.candidates?.[0]?.content?.parts?.[0]?.text ?? 'No response';
}

async function callGroq(apiKey: string, messages: Message[], specialist = 'general'): Promise<string> {
  const system = await buildSystemPrompt(false, specialist);
  const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
    body: JSON.stringify({
      model: 'llama-3.1-70b-versatile',
      messages: [
        { role: 'system', content: system },
        ...messages.map(m => ({ role: m.role, content: m.content })),
      ],
      max_tokens: 1024,
    }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error?.message ?? 'Groq error');
  return data.choices?.[0]?.message?.content ?? 'No response';
}

async function callOpenAI(apiKey: string, messages: Message[], specialist = 'general'): Promise<string> {
  const system = await buildSystemPrompt(false, specialist);
  const res = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
    body: JSON.stringify({
      model: 'gpt-4o-mini',
      messages: [
        { role: 'system', content: system },
        ...messages.map(m => ({ role: m.role, content: m.content })),
      ],
    }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error?.message ?? 'OpenAI error');
  return data.choices?.[0]?.message?.content ?? 'No response';
}

async function callClaude(apiKey: string, messages: Message[], specialist = 'general'): Promise<string> {
  const system = await buildSystemPrompt(false, specialist);
  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 1024,
      system,
      messages: messages.map(m => ({ role: m.role, content: m.content })),
    }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error?.message ?? 'Claude error');
  return data.content?.[0]?.text ?? 'No response';
}

// ── Smart send (hybrid AI) ────────────────────────────────────────────────────

export async function sendToAI(
  model: string,
  messages: Message[],
  specialist = 'general',
): Promise<{ reply: string; mode: AIMode }> {

  if (model === 'ollama') {
    const reply = await callOllama(messages, specialist);
    return { reply, mode: 'online' };
  }

  const online = await checkConnectivity();

  if (!online) {
    const reply = await callOfflineAI(messages);
    return { reply, mode: 'offline' };
  }

  if (model === 'free') {
    try {
      const reply = await callFree(messages, specialist);
      return { reply, mode: 'online' };
    } catch {
      const reply = await callOfflineAI(messages);
      return { reply, mode: 'offline' };
    }
  }

  const keys = await getApiKeys();
  const key = keys[model];
  if (!key) throw new Error(`No API key for ${model}. Add it in Settings → API Keys, or switch to Free AI.`);

  let reply: string;
  switch (model) {
    case 'gemini': reply = await callGemini(key, messages, specialist); break;
    case 'groq':   reply = await callGroq(key, messages, specialist); break;
    case 'openai': reply = await callOpenAI(key, messages, specialist); break;
    case 'claude': reply = await callClaude(key, messages, specialist); break;
    default: throw new Error('Unknown model');
  }
  return { reply, mode: 'online' };
}

export async function saveApiKey(model: string, key: string) {
  const keys = await getApiKeys();
  keys[model] = key.trim();
  await storage.setJSON('vexora:api_keys', keys);
}

export async function loadApiKeys(): Promise<Record<string, string>> {
  return getApiKeys();
}
