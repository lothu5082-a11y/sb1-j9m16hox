// ---------------------------------------------------------------------------
// knowledgeBase.ts
// Vexsora — local self-learning knowledge base stored as JSON
// ---------------------------------------------------------------------------

// ---------------------------------------------------------------------------
// AsyncStorage — graceful fallback to in-memory when the native module is absent
// ---------------------------------------------------------------------------

type StorageBackend = {
  getItem(key: string): Promise<string | null>;
  setItem(key: string, value: string): Promise<void>;
  removeItem(key: string): Promise<void>;
};

let _storage: StorageBackend;

try {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const AsyncStorage = require('@react-native-async-storage/async-storage').default;
  _storage = AsyncStorage as StorageBackend;
} catch {
  // Fallback: plain in-memory Map (works in web / Expo Go / unit tests)
  const _memStore = new Map<string, string>();
  _storage = {
    getItem: async (k) => _memStore.get(k) ?? null,
    setItem: async (k, v) => { _memStore.set(k, v); },
    removeItem: async (k) => { _memStore.delete(k); },
  };
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const STORAGE_KEY = 'vexsora_kb_v1';
const MAX_FACTS = 200;

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface KnowledgeFact {
  id: string;
  content: string;
  source: 'user_correction' | 'web_scraped' | 'learned';
  timestamp: number; // Unix ms
  tags: string[];
}

// ---------------------------------------------------------------------------
// Correction detection patterns
// ---------------------------------------------------------------------------

/**
 * Patterns that indicate the user is correcting or providing new personal info.
 * Each pattern's first capture group contains the extracted fact fragment.
 */
const CORRECTION_PATTERNS: { re: RegExp; template: (m: RegExpMatchArray) => string }[] = [
  {
    re: /\bno[,.]?\s+(actually\s+)?my\s+name\s+is\s+([A-Za-z][A-Za-z\s'-]{1,40})/i,
    template: (m) => `User's name is ${m[2].trim()}`,
  },
  {
    re: /\bactually[,.]?\s+(?:I(?:'m| am)\s+called|my\s+name\s+is)\s+([A-Za-z][A-Za-z\s'-]{1,40})/i,
    template: (m) => `User's name is ${m[1].trim()}`,
  },
  {
    re: /\bI\s+(?:live|stay|am\s+based|am\s+located)\s+in\s+([A-Za-z][A-Za-z\s,'-]{1,60})/i,
    template: (m) => `User lives in ${m[1].trim()}`,
  },
  {
    re: /\bactually[,.]?\s+I\s+(?:live|stay|am)\s+in\s+([A-Za-z][A-Za-z\s,'-]{1,60})/i,
    template: (m) => `User lives in ${m[1].trim()}`,
  },
  {
    re: /\bno[,.]?\s+I(?:'m| am)\s+from\s+([A-Za-z][A-Za-z\s,'-]{1,60})/i,
    template: (m) => `User is from ${m[1].trim()}`,
  },
  {
    re: /\bI\s+(?:prefer|like|love|enjoy)\s+([A-Za-z][A-Za-z\s,'-]{1,80})/i,
    template: (m) => `User prefers ${m[1].trim()}`,
  },
  {
    re: /\bactually[,.]?\s+(?:the\s+)?(?:correct\s+)?(?:answer|fact|info(?:rmation)?)\s+is\s+(.{5,150})/i,
    template: (m) => m[1].trim(),
  },
  {
    re: /\bthat(?:'s|\s+is)\s+(?:wrong|incorrect|not\s+right)[,.]?\s+(?:it(?:'s| is)\s+actually\s+)?(.{5,150})/i,
    template: (m) => m[1].trim(),
  },
  {
    re: /\bI\s+work\s+(?:as|at)\s+([A-Za-z][A-Za-z\s,'-]{1,80})/i,
    template: (m) => `User works as/at ${m[1].trim()}`,
  },
  {
    re: /\bmy\s+(?:age|birthday)\s+is\s+([A-Za-z0-9][A-Za-z0-9\s,'-]{1,60})/i,
    template: (m) => `User's ${m[0].split(' ')[1]} is ${m[1].trim()}`,
  },
];

// ---------------------------------------------------------------------------
// KnowledgeBaseService
// ---------------------------------------------------------------------------

class KnowledgeBaseService {
  private _facts: KnowledgeFact[] = [];
  private _loaded = false;

  // -------------------------------------------------------------------------
  // Persistence
  // -------------------------------------------------------------------------

  /** Load facts from AsyncStorage into memory. Must be called before any reads. */
  async load(): Promise<void> {
    if (this._loaded) return;
    try {
      const raw = await _storage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed: KnowledgeFact[] = JSON.parse(raw);
        // Validate shape minimally to guard against corrupted data
        this._facts = parsed.filter(
          (f) =>
            typeof f.id === 'string' &&
            typeof f.content === 'string' &&
            typeof f.timestamp === 'number'
        );
      }
    } catch {
      this._facts = [];
    }
    this._loaded = true;
  }

  private async _persist(): Promise<void> {
    await _storage.setItem(STORAGE_KEY, JSON.stringify(this._facts));
  }

  private _ensureLoaded(): void {
    if (!this._loaded) {
      // Warn in development — callers must await load() first.
      console.warn('[KnowledgeBase] load() has not been awaited. Data may be stale.');
    }
  }

  // -------------------------------------------------------------------------
  // CRUD
  // -------------------------------------------------------------------------

  /**
   * Add a new fact to the knowledge base.
   * If the store exceeds MAX_FACTS, the oldest facts are trimmed first.
   */
  async addFact(
    content: string,
    source: KnowledgeFact['source'],
    tags: string[] = []
  ): Promise<KnowledgeFact> {
    this._ensureLoaded();

    // Deduplicate: skip if an identical content string already exists
    const duplicate = this._facts.find(
      (f) => f.content.toLowerCase() === content.toLowerCase()
    );
    if (duplicate) {
      // Refresh timestamp so it isn't pruned as "oldest"
      duplicate.timestamp = Date.now();
      await this._persist();
      return duplicate;
    }

    const fact: KnowledgeFact = {
      id: `kbf_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
      content: content.trim(),
      source,
      timestamp: Date.now(),
      tags,
    };

    this._facts.push(fact);

    // Trim to MAX_FACTS by removing oldest entries
    if (this._facts.length > MAX_FACTS) {
      this._facts.sort((a, b) => a.timestamp - b.timestamp);
      this._facts = this._facts.slice(this._facts.length - MAX_FACTS);
    }

    await this._persist();
    return fact;
  }

  /** Return all stored facts (most recent first). */
  getFacts(): KnowledgeFact[] {
    this._ensureLoaded();
    return [...this._facts].sort((a, b) => b.timestamp - a.timestamp);
  }

  /**
   * Return facts most relevant to the given query string.
   * Relevance is measured by the number of query tokens (3+ chars) found in
   * the fact's content or tags.
   *
   * @param query    - Free-text query.
   * @param maxFacts - Maximum number of facts to return (default 10).
   */
  getRelevantFacts(query: string, maxFacts = 10): KnowledgeFact[] {
    this._ensureLoaded();
    if (this._facts.length === 0) return [];

    const tokens = query
      .toLowerCase()
      .split(/\W+/)
      .filter((w) => w.length >= 3);

    if (tokens.length === 0) {
      return this._facts
        .slice()
        .sort((a, b) => b.timestamp - a.timestamp)
        .slice(0, maxFacts);
    }

    const scored = this._facts.map((fact) => {
      const haystack =
        fact.content.toLowerCase() + ' ' + fact.tags.join(' ').toLowerCase();
      const hits = tokens.filter((t) => haystack.includes(t)).length;
      return { fact, hits };
    });

    return scored
      .filter((s) => s.hits > 0)
      .sort((a, b) => b.hits - a.hits || b.fact.timestamp - a.fact.timestamp)
      .slice(0, maxFacts)
      .map((s) => s.fact);
  }

  /** Remove a fact by id. No-op if the id does not exist. */
  async deleteFact(id: string): Promise<void> {
    this._ensureLoaded();
    const before = this._facts.length;
    this._facts = this._facts.filter((f) => f.id !== id);
    if (this._facts.length !== before) {
      await this._persist();
    }
  }

  /** Remove all facts and clear storage. */
  async clear(): Promise<void> {
    this._facts = [];
    await _storage.removeItem(STORAGE_KEY);
  }

  // -------------------------------------------------------------------------
  // Self-learning helpers
  // -------------------------------------------------------------------------

  /**
   * Detect whether a user message contains a correction or new personal fact.
   *
   * Returns the extracted, human-readable fact string if a pattern matches,
   * or `null` if the message appears to be ordinary conversation.
   *
   * Examples that return a fact:
   *   "No, actually my name is Keanu" → "User's name is Keanu"
   *   "I live in Mumbai"              → "User lives in Mumbai"
   *   "That's wrong, it's 42"         → "it's 42"
   */
  detectCorrection(userMessage: string): string | null {
    const trimmed = userMessage.trim();
    for (const { re, template } of CORRECTION_PATTERNS) {
      const m = trimmed.match(re);
      if (m) {
        const extracted = template(m).trim();
        if (extracted.length >= 5) return extracted;
      }
    }
    return null;
  }

  /**
   * Serialise facts as a plain-text block suitable for injection into a
   * system prompt. Ordered by recency. Truncated at approximately 5 KB.
   *
   * @param maxFacts - Maximum number of facts to include (default 20).
   */
  exportAsContextString(maxFacts = 20): string {
    this._ensureLoaded();
    if (this._facts.length === 0) return '';

    const sorted = [...this._facts]
      .sort((a, b) => b.timestamp - a.timestamp)
      .slice(0, maxFacts);

    const lines: string[] = ['[Knowledge Base]'];
    let totalLen = lines[0].length + 1;

    for (const fact of sorted) {
      const line = `• [${fact.source}] ${fact.content}`;
      if (totalLen + line.length > 5000) break;
      lines.push(line);
      totalLen += line.length + 1;
    }

    return lines.join('\n');
  }
}

// ---------------------------------------------------------------------------
// Singleton export
// ---------------------------------------------------------------------------

export const knowledgeBase = new KnowledgeBaseService();
