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
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
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
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
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
  const keys = await getApiKeys();
  const key = keys[model];
  if (!key) throw new Error(`No API key for ${model}. Add it in Settings.`);

  switch (model) {
    case 'gemini': return callGemini(key, messages);
    case 'groq': return callGroq(key, messages);
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
