import { Message } from './aiService';

// In-memory storage
const store = new Map<string, string>();
const storage = {
  getItem: async (key: string) => store.get(key) ?? null,
  setItem: async (key: string, value: string) => { store.set(key, value); },
  removeItem: async (key: string) => { store.delete(key); },
};

export interface Conversation {
  id: string;
  title: string;
  messages: Message[];
  createdAt: Date;
  updatedAt: Date;
}

const CONVERSATIONS_KEY = 'riuka_conversations';
const MAX_MESSAGES_PER_CONVERSATION = 100;

class StorageService {
  private conversations: Map<string, Conversation> = new Map();
  private loaded = false;

  private async ensureLoaded(): Promise<void> {
    if (this.loaded) return;
    try {
      const raw = await storage.getItem(CONVERSATIONS_KEY);
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
      // keep empty
    }
    this.loaded = true;
  }

  private async persist(): Promise<void> {
    const all = Array.from(this.conversations.values());
    await storage.setItem(CONVERSATIONS_KEY, JSON.stringify(all));
  }

  async saveMessages(conversationId: string, messages: Message[]): Promise<Conversation> {
    await this.ensureLoaded();

    // Trim to last 100 messages
    const trimmed = messages.slice(-MAX_MESSAGES_PER_CONVERSATION);

    const existing = this.conversations.get(conversationId);
    const now = new Date();

    // Auto-generate title from first user message
    const firstUserMsg = trimmed.find((m) => m.role === 'user');
    const title = firstUserMsg
      ? firstUserMsg.content.slice(0, 60) + (firstUserMsg.content.length > 60 ? '…' : '')
      : 'New Conversation';

    const conversation: Conversation = {
      id: conversationId,
      title: existing?.title ?? title,
      messages: trimmed,
      createdAt: existing?.createdAt ?? now,
      updatedAt: now,
    };

    this.conversations.set(conversationId, conversation);
    await this.persist();
    return conversation;
  }

  async getConversations(): Promise<Conversation[]> {
    await this.ensureLoaded();
    return Array.from(this.conversations.values()).sort(
      (a, b) => b.updatedAt.getTime() - a.updatedAt.getTime()
    );
  }

  async getConversation(id: string): Promise<Conversation | null> {
    await this.ensureLoaded();
    return this.conversations.get(id) ?? null;
  }

  async deleteConversation(id: string): Promise<void> {
    await this.ensureLoaded();
    this.conversations.delete(id);
    await this.persist();
  }

  async clearAll(): Promise<void> {
    this.conversations.clear();
    await storage.removeItem(CONVERSATIONS_KEY);
  }

  createNewConversationId(): string {
    return Date.now().toString();
  }
}

export const storageService = new StorageService();
