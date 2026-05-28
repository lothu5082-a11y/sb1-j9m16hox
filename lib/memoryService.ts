// In-memory storage
const store = new Map<string, string>();
const storage = {
  getItem: async (key: string) => store.get(key) ?? null,
  setItem: async (key: string, value: string) => { store.set(key, value); },
  removeItem: async (key: string) => { store.delete(key); },
};

export interface MemoryItem {
  id: string;
  type: 'preference' | 'fact' | 'context' | 'habit';
  content: string;
  timestamp: Date;
  tags: string[];
}

export interface ConversationSummary {
  id: string;
  date: Date;
  summary: string;
  messageCount: number;
}

const MEMORIES_KEY = 'vexora_memories';
const SUMMARIES_KEY = 'vexora_summaries';

class MemoryService {
  private memories: MemoryItem[] = [];
  private summaries: ConversationSummary[] = [];
  private loaded = false;

  private async ensureLoaded(): Promise<void> {
    if (this.loaded) return;
    try {
      const rawMemories = await storage.getItem(MEMORIES_KEY);
      if (rawMemories) {
        const parsed = JSON.parse(rawMemories);
        this.memories = parsed.map((m: MemoryItem) => ({
          ...m,
          timestamp: new Date(m.timestamp),
        }));
      }
      const rawSummaries = await storage.getItem(SUMMARIES_KEY);
      if (rawSummaries) {
        const parsed = JSON.parse(rawSummaries);
        this.summaries = parsed.map((s: ConversationSummary) => ({
          ...s,
          date: new Date(s.date),
        }));
      }
    } catch {
      // keep defaults
    }
    this.loaded = true;
  }

  private async persistMemories(): Promise<void> {
    await storage.setItem(MEMORIES_KEY, JSON.stringify(this.memories));
  }

  private async persistSummaries(): Promise<void> {
    await storage.setItem(SUMMARIES_KEY, JSON.stringify(this.summaries));
  }

  async getMemories(): Promise<MemoryItem[]> {
    await this.ensureLoaded();
    return [...this.memories];
  }

  async addMemory(
    content: string,
    type: MemoryItem['type'],
    tags: string[] = []
  ): Promise<MemoryItem> {
    await this.ensureLoaded();
    const item: MemoryItem = {
      id: `mem_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
      type,
      content,
      timestamp: new Date(),
      tags,
    };
    this.memories.push(item);
    await this.persistMemories();
    return item;
  }

  async deleteMemory(id: string): Promise<void> {
    await this.ensureLoaded();
    this.memories = this.memories.filter((m) => m.id !== id);
    await this.persistMemories();
  }

  async clearAllMemories(): Promise<void> {
    this.memories = [];
    await storage.removeItem(MEMORIES_KEY);
  }

  async buildContextString(): Promise<string> {
    await this.ensureLoaded();
    if (this.memories.length === 0) return '';

    const lines: string[] = ['User context:'];
    for (const mem of this.memories) {
      lines.push(`[${mem.type}] ${mem.content}`);
    }

    let result = lines.join('\n');
    if (result.length > 500) {
      result = result.slice(0, 497) + '...';
    }
    return result;
  }

  async getSummaries(): Promise<ConversationSummary[]> {
    await this.ensureLoaded();
    return [...this.summaries];
  }

  async saveSummary(summary: Omit<ConversationSummary, 'id'>): Promise<ConversationSummary> {
    await this.ensureLoaded();
    const item: ConversationSummary = {
      id: `sum_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
      ...summary,
    };
    this.summaries.unshift(item);
    // keep last 50
    if (this.summaries.length > 50) {
      this.summaries = this.summaries.slice(0, 50);
    }
    await this.persistSummaries();
    return item;
  }

  async getStats(): Promise<{
    total: number;
    byType: { preference: number; fact: number; context: number; habit: number };
  }> {
    await this.ensureLoaded();
    const byType = { preference: 0, fact: 0, context: 0, habit: 0 };
    for (const mem of this.memories) {
      byType[mem.type]++;
    }
    return { total: this.memories.length, byType };
  }
}

export const memoryService = new MemoryService();
