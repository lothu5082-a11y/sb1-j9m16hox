import { storage } from './storage';

export interface Message {
  role: 'user' | 'assistant';
  content: string;
}

const VEXORA_SYSTEM = `You are Vexora, an AI-powered life assistant. You are helpful, friendly, and concise. You assist users with tasks, answer questions, help with productivity, research, coding, creative writing, and provide intelligent responses. Keep replies conversational and to the point.`;

async function getApiKeys() {
  const keys = await storage.getJSON<Record<string, string>>('vexora:api_keys');
  return keys ?? {};
}

export async function getOllamaConfig(): Promise<{ url: string; model: string }> {
  const cfg = await storage.getJSON<{ url: string; model: string }>('vexora:ollama');
  return cfg ?? { url: 'http://192.168.1.100:11434', model: 'llama3.2' };
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

// Free — no API key, powered by Pollinations.ai
async function callFree(messages: Message[]): Promise<string> {
  const res = await fetch('https://text.pollinations.ai/', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      messages: [
        { role: 'system', content: VEXORA_SYSTEM },
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

// Ollama — local server on your PC/laptop, same Wi-Fi network
async function callOllama(messages: Message[]): Promise<string> {
  const cfg = await getOllamaConfig();
  const res = await fetch(`${cfg.url}/api/chat`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: cfg.model,
      messages: [
        { role: 'system', content: VEXORA_SYSTEM },
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

async function callGemini(apiKey: string, messages: Message[]): Promise<string> {
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
        system_instruction: { parts: [{ text: VEXORA_SYSTEM }] },
        contents,
      }),
    }
  );
  const data = await res.json();
  if (!res.ok) throw new Error(data.error?.message ?? 'Gemini error');
  return data.candidates?.[0]?.content?.parts?.[0]?.text ?? 'No response';
}

async function callGroq(apiKey: string, messages: Message[]): Promise<string> {
  const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
    body: JSON.stringify({
      model: 'llama-3.1-70b-versatile',
      messages: [
        { role: 'system', content: VEXORA_SYSTEM },
        ...messages.map(m => ({ role: m.role, content: m.content })),
      ],
      max_tokens: 1024,
    }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error?.message ?? 'Groq error');
  return data.choices?.[0]?.message?.content ?? 'No response';
}

async function callOpenAI(apiKey: string, messages: Message[]): Promise<string> {
  const res = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
    body: JSON.stringify({
      model: 'gpt-3.5-turbo',
      messages: [
        { role: 'system', content: VEXORA_SYSTEM },
        ...messages.map(m => ({ role: m.role, content: m.content })),
      ],
    }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error?.message ?? 'OpenAI error');
  return data.choices?.[0]?.message?.content ?? 'No response';
}

async function callClaude(apiKey: string, messages: Message[]): Promise<string> {
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
      system: VEXORA_SYSTEM,
      messages: messages.map(m => ({ role: m.role, content: m.content })),
    }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error?.message ?? 'Claude error');
  return data.content?.[0]?.text ?? 'No response';
}

export async function sendToAI(model: string, messages: Message[]): Promise<string> {
  if (model === 'free')   return callFree(messages);
  if (model === 'ollama') return callOllama(messages);

  const keys = await getApiKeys();
  const key = keys[model];
  if (!key) throw new Error(`No API key for ${model}. Go to Settings → API Keys, or use Free AI / Ollama.`);

  switch (model) {
    case 'gemini': return callGemini(key, messages);
    case 'groq':   return callGroq(key, messages);
    case 'openai': return callOpenAI(key, messages);
    case 'claude': return callClaude(key, messages);
    default: throw new Error('Unknown model');
  }
}

export async function saveApiKey(model: string, key: string) {
  const keys = await getApiKeys();
  keys[model] = key.trim();
  await storage.setJSON('vexora:api_keys', keys);
}

export async function loadApiKeys(): Promise<Record<string, string>> {
  return getApiKeys();
}
