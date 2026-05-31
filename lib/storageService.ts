import { Message } from './aiService';

// In-memory conversation store — no native dependencies.
const store = new Map<string, string>();

const kv = {
  get: (key: string): string | null => store.get(key) ?? null,
  set: (key: string, value: string): void => { store.set(key, value); },
  delete: (key: string): void => { store.delete(key); },
};

export interface Conversation {
  id: string;
  title: string;
  messages: Message[];
  createdAt: Date;
  updatedAt: Date;
}

const CONVERSATIONS_KEY = 'vexsora_conversations_v1';
const MAX_MESSAGES = 100;

class StorageService {
  private conversations = new Map<string, Conversation>();
  private loaded = false;

  private ensureLoaded(): void {
    if (this.loaded) return;
    try {
      const raw = kv.get(CONVERSATIONS_KEY);
      if (raw) {
        const parsed: Conversation[] = JSON.parse(raw);
        for (const conv of parsed) {
          this.conversations.set(conv.id, {
            ...conv,
            createdAt: new Date(conv.createdAt),
            updatedAt: new Date(conv.updatedAt),
            messages: conv.messages.map((m) => ({
              ...m,
              timestamp: new Date(m.timestamp),
            })),
          });
        }
      }
    } catch {
      // empty
    }
    this.loaded = true;
  }

  private persist(): void {
    kv.set(CONVERSATIONS_KEY, JSON.stringify(Array.from(this.conversations.values())));
  }

  saveMessages(conversationId: string, messages: Message[]): Conversation {
    this.ensureLoaded();
    const trimmed = messages.slice(-MAX_MESSAGES);
    const existing = this.conversations.get(conversationId);
    const now = new Date();
    const firstUser = trimmed.find((m) => m.role === 'user');
    const title = firstUser
      ? firstUser.content.slice(0, 60) + (firstUser.content.length > 60 ? '…' : '')
      : 'New Conversation';

    const conversation: Conversation = {
      id: conversationId,
      title: existing?.title ?? title,
      messages: trimmed,
      createdAt: existing?.createdAt ?? now,
      updatedAt: now,
    };
    this.conversations.set(conversationId, conversation);
    this.persist();
    return conversation;
  }

  getConversations(): Conversation[] {
    this.ensureLoaded();
    return Array.from(this.conversations.values()).sort(
      (a, b) => b.updatedAt.getTime() - a.updatedAt.getTime()
    );
  }

  getConversation(id: string): Conversation | null {
    this.ensureLoaded();
    return this.conversations.get(id) ?? null;
  }

  deleteConversation(id: string): void {
    this.ensureLoaded();
    this.conversations.delete(id);
    this.persist();
  }

  clearAll(): void {
    this.conversations.clear();
    kv.delete(CONVERSATIONS_KEY);
  }

  createNewId(): string {
    return `conv_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
  }
}

export const storageService = new StorageService();
