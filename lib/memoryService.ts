// ---------------------------------------------------------------------------
// memoryService.ts
// Vexsora — sliding conversation history + user profile persistence
// ---------------------------------------------------------------------------

// ---------------------------------------------------------------------------
// AsyncStorage — graceful in-memory fallback
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
  const _mem = new Map<string, string>();
  _storage = {
    getItem: async (k) => _mem.get(k) ?? null,
    setItem: async (k, v) => { _mem.set(k, v); },
    removeItem: async (k) => { _mem.delete(k); },
  };
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const KEY_HISTORY = 'vexsora_history_v1';
const KEY_PROFILE = 'vexsora_profile_v1';
const KEY_MEMORIES = 'vexsora_memories_v1';

const MAX_HISTORY_STORED = 30; // Messages kept on disk
const DEFAULT_HISTORY_LIMIT = 10; // Returned by getHistory() unless overridden

// ---------------------------------------------------------------------------
// Interfaces
// ---------------------------------------------------------------------------

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: number; // Unix ms
}

export interface UserProfile {
  name: string;
  city: string;
  language: string;
  preferences: string[];
  habits: string[];
}

const DEFAULT_PROFILE: UserProfile = {
  name: '',
  city: '',
  language: 'English',
  preferences: [],
  habits: [],
};

// Memory entry type (plain labelled strings, e.g. "[preference] Loves dark mode")
type MemoryEntry = string;

// ---------------------------------------------------------------------------
// MemoryService
// ---------------------------------------------------------------------------

class MemoryService {
  private _history: ChatMessage[] = [];
  private _profile: UserProfile = { ...DEFAULT_PROFILE };
  private _memories: MemoryEntry[] = [];
  private _initialised = false;

  // -------------------------------------------------------------------------
  // Initialisation
  // -------------------------------------------------------------------------

  /**
   * Load all persisted data from storage into memory.
   * Must be awaited before calling any other method.
   */
  async init(): Promise<void> {
    if (this._initialised) return;

    await Promise.all([
      this._loadHistory(),
      this._loadProfile(),
      this._loadMemories(),
    ]);

    this._initialised = true;
  }

  private async _loadHistory(): Promise<void> {
    try {
      const raw = await _storage.getItem(KEY_HISTORY);
      if (raw) {
        const parsed: ChatMessage[] = JSON.parse(raw);
        this._history = parsed.filter(
          (m) =>
            typeof m.id === 'string' &&
            typeof m.role === 'string' &&
            typeof m.content === 'string' &&
            typeof m.timestamp === 'number'
        );
      }
    } catch {
      this._history = [];
    }
  }

  private async _loadProfile(): Promise<void> {
    try {
      const raw = await _storage.getItem(KEY_PROFILE);
      if (raw) {
        const parsed: Partial<UserProfile> = JSON.parse(raw);
        this._profile = { ...DEFAULT_PROFILE, ...parsed };
      }
    } catch {
      this._profile = { ...DEFAULT_PROFILE };
    }
  }

  private async _loadMemories(): Promise<void> {
    try {
      const raw = await _storage.getItem(KEY_MEMORIES);
      if (raw) {
        const parsed: MemoryEntry[] = JSON.parse(raw);
        this._memories = parsed.filter((m) => typeof m === 'string');
      }
    } catch {
      this._memories = [];
    }
  }

  // -------------------------------------------------------------------------
  // Conversation history
  // -------------------------------------------------------------------------

  /**
   * Return the last `limit` messages (most recent last, ready for LLM context).
   *
   * @param limit - Number of messages to return (default 10).
   */
  getHistory(limit = DEFAULT_HISTORY_LIMIT): ChatMessage[] {
    return this._history.slice(-limit);
  }

  /**
   * Append a new message to the history and persist a sliding window to storage.
   *
   * @param role    - `'user'` or `'assistant'`.
   * @param content - Message text.
   * @returns The newly created {@link ChatMessage}.
   */
  addMessage(role: ChatMessage['role'], content: string): ChatMessage {
    const message: ChatMessage = {
      id: `msg_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
      role,
      content,
      timestamp: Date.now(),
    };

    this._history.push(message);

    // Trim to sliding window and persist asynchronously (fire-and-forget)
    if (this._history.length > MAX_HISTORY_STORED) {
      this._history = this._history.slice(-MAX_HISTORY_STORED);
    }

    this._persistHistory().catch(() => {});

    return message;
  }

  /** Delete all conversation history from memory and storage. */
  async clearHistory(): Promise<void> {
    this._history = [];
    await _storage.removeItem(KEY_HISTORY);
  }

  private async _persistHistory(): Promise<void> {
    const window = this._history.slice(-MAX_HISTORY_STORED);
    await _storage.setItem(KEY_HISTORY, JSON.stringify(window));
  }

  // -------------------------------------------------------------------------
  // User profile
  // -------------------------------------------------------------------------

  /** Return a shallow copy of the current user profile. */
  getProfile(): UserProfile {
    return { ...this._profile };
  }

  /**
   * Merge partial profile updates and persist.
   *
   * @param partial - Fields to update (others remain unchanged).
   */
  async updateProfile(partial: Partial<UserProfile>): Promise<void> {
    this._profile = { ...this._profile, ...partial };
    await _storage.setItem(KEY_PROFILE, JSON.stringify(this._profile));
  }

  // -------------------------------------------------------------------------
  // Freeform memories
  // -------------------------------------------------------------------------

  /**
   * Append a new labelled memory string.
   *
   * @param content - Human-readable fact or preference.
   * @param type    - Label tag, e.g. `'preference'`, `'fact'`, `'habit'`.
   */
  async addMemory(content: string, type: string): Promise<void> {
    const entry: MemoryEntry = `[${type}] ${content.trim()}`;

    // Deduplicate by value
    if (this._memories.includes(entry)) return;

    this._memories.push(entry);
    await _storage.setItem(KEY_MEMORIES, JSON.stringify(this._memories));
  }

  /** Return all stored memory strings. */
  getMemories(): string[] {
    return [...this._memories];
  }

  /** Remove a specific memory string. No-op if not found. */
  async deleteMemory(entry: string): Promise<void> {
    const idx = this._memories.indexOf(entry);
    if (idx === -1) return;
    this._memories.splice(idx, 1);
    await _storage.setItem(KEY_MEMORIES, JSON.stringify(this._memories));
  }

  /** Wipe all stored memories. */
  async clearAllMemories(): Promise<void> {
    this._memories = [];
    await _storage.removeItem(KEY_MEMORIES);
  }

  // -------------------------------------------------------------------------
  // Context string for prompt injection
  // -------------------------------------------------------------------------

  /**
   * Build a compact, human-readable context block for injection into a
   * system prompt. Includes profile fields and recent memories.
   *
   * Stays under 600 characters to avoid inflating the context window.
   */
  buildContextString(): string {
    const lines: string[] = [];

    // Profile
    if (this._profile.name) lines.push(`Name: ${this._profile.name}`);
    if (this._profile.city) lines.push(`City: ${this._profile.city}`);
    if (this._profile.language && this._profile.language !== 'English')
      lines.push(`Language: ${this._profile.language}`);
    if (this._profile.preferences.length > 0)
      lines.push(`Preferences: ${this._profile.preferences.join(', ')}`);
    if (this._profile.habits.length > 0)
      lines.push(`Habits: ${this._profile.habits.join(', ')}`);

    // Memories (most recent, up to 5)
    const recentMemories = this._memories.slice(-5);
    if (recentMemories.length > 0) {
      lines.push('Memories:');
      recentMemories.forEach((m) => lines.push(`  ${m}`));
    }

    if (lines.length === 0) return '';

    let result = lines.join('\n');
    if (result.length > 600) {
      result = result.slice(0, 597) + '…';
    }
    return result;
  }
}

// ---------------------------------------------------------------------------
// Singleton export
// ---------------------------------------------------------------------------

export const memoryService = new MemoryService();
