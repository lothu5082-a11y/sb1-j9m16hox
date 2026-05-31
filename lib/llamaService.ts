// ---------------------------------------------------------------------------
// llamaService.ts
// Vexsora — on-device LLM service backed by llama.rn
// ---------------------------------------------------------------------------

import { Platform } from 'react-native';
import * as FileSystem from 'expo-file-system/legacy';

// ---------------------------------------------------------------------------
// llama.rn dynamic import — graceful degradation in web/CI/Expo Go
// ---------------------------------------------------------------------------

/**
 * Minimal LlamaContext shape — only the surface we consume.
 * The real type lives in llama.rn; we replicate it so the rest of the app
 * can reference it without a hard dependency on the native package.
 */
export interface LlamaContext {
  completion(
    params: {
      messages: { role: string; content: string }[];
      n_predict?: number;
      stop?: string[];
      temperature?: number;
    },
    onToken: (data: { token: string }) => void
  ): Promise<{ text: string }>;
  release(): Promise<void>;
}

type InitLlamaFn = (params: Record<string, unknown>) => Promise<LlamaContext>;

let _initLlama: InitLlamaFn | null = null;

try {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const llamaModule = require('llama.rn');
  _initLlama = llamaModule.initLlama ?? null;
} catch {
  // llama.rn native module unavailable — web, Expo Go, CI, or unit tests.
  _initLlama = null;
}

// ---------------------------------------------------------------------------
// Model metadata
// ---------------------------------------------------------------------------

export interface ModelMeta {
  id: string;
  name: string;
  subtitle: string;
  sizeMB: number;
  tier: 'Fast' | 'Balanced' | 'Smart';
  tierColor: string;
  url: string;
  filename: string;
  stopTokens: string[];
}

export const MODELS: ModelMeta[] = [
  {
    id: 'llama32-1b',
    name: 'Llama 3.2 1B',
    subtitle: 'Meta · Instruct · Q4_K_M',
    sizeMB: 700,
    tier: 'Fast',
    tierColor: '#10B981',
    url: 'https://huggingface.co/bartowski/Llama-3.2-1B-Instruct-GGUF/resolve/main/Llama-3.2-1B-Instruct-Q4_K_M.gguf',
    filename: 'Llama-3.2-1B-Instruct-Q4_K_M.gguf',
    stopTokens: ['<|eot_id|>', '</s>'],
  },
  {
    id: 'gemma2-2b',
    name: 'Gemma 2 2B',
    subtitle: 'Google · IT · Q4_K_M',
    sizeMB: 1600,
    tier: 'Balanced',
    tierColor: '#A855F7',
    url: 'https://huggingface.co/bartowski/gemma-2-2b-it-GGUF/resolve/main/gemma-2-2b-it-Q4_K_M.gguf',
    filename: 'gemma-2-2b-it-Q4_K_M.gguf',
    stopTokens: ['<end_of_turn>', '</s>'],
  },
  {
    id: 'phi35-mini',
    name: 'Phi-3.5 Mini',
    subtitle: 'Microsoft · Instruct · Q4',
    sizeMB: 2200,
    tier: 'Smart',
    tierColor: '#F59E0B',
    url: 'https://huggingface.co/microsoft/Phi-3.5-mini-instruct-gguf/resolve/main/Phi-3.5-mini-instruct-q4.gguf',
    filename: 'Phi-3.5-mini-instruct-q4.gguf',
    stopTokens: ['<|end|>', '</s>', '<|im_end|>'],
  },
];

export const DEFAULT_MODEL_PATH =
  'file:///storage/emulated/0/Download/Llama-3.2-1B-Instruct-Q4_K_M.gguf';

// ---------------------------------------------------------------------------
// Download progress state
// ---------------------------------------------------------------------------

export interface DownloadState {
  modelId: string;
  progress: number; // 0..1
  downloadedMB: number;
  totalMB: number;
}

// ---------------------------------------------------------------------------
// LlamaService
// ---------------------------------------------------------------------------

class LlamaService {
  private _context: LlamaContext | null = null;
  private _loadedModelPath: string | null = null;
  private _isLoading = false;
  private _activeDownload: ReturnType<
    typeof FileSystem.createDownloadResumable
  > | null = null;
  private _downloadState: DownloadState | null = null;

  // -------------------------------------------------------------------------
  // Capability checks
  // -------------------------------------------------------------------------

  /**
   * Returns true when the llama.rn native module was successfully imported.
   * False on web, Expo Go, or environments without a native build.
   */
  isAvailable(): boolean {
    return _initLlama !== null;
  }

  /** Returns true when a model context is currently held in memory. */
  isLoaded(): boolean {
    return this._context !== null;
  }

  /** Returns true while a model is being initialised from disk. */
  isLoading(): boolean {
    return this._isLoading;
  }

  /** Returns true while a GGUF file is being downloaded. */
  isDownloading(): boolean {
    return this._activeDownload !== null;
  }

  /** Returns the file path of the currently loaded model, or null. */
  getLoadedModelPath(): string | null {
    return this._loadedModelPath;
  }

  /** Returns a snapshot of the active download progress, or null. */
  getDownloadState(): DownloadState | null {
    return this._downloadState;
  }

  // -------------------------------------------------------------------------
  // Path helpers
  // -------------------------------------------------------------------------

  /** Base directory where downloaded models are stored. */
  getModelDir(): string {
    return (FileSystem.documentDirectory ?? '') + 'models/';
  }

  /** Full local path for a given model. */
  getModelPath(model: ModelMeta): string {
    return this.getModelDir() + model.filename;
  }

  /** Returns true when the model file exists on disk and is larger than 1 MB. */
  async isModelDownloaded(model: ModelMeta): Promise<boolean> {
    if (Platform.OS === 'web') return false;
    try {
      const info = await FileSystem.getInfoAsync(this.getModelPath(model));
      if (!info.exists) return false;
      const size = (info as { size?: number }).size ?? 0;
      return size > 1_000_000;
    } catch {
      return false;
    }
  }

  /** Returns the ids of every model that has been successfully downloaded. */
  async getDownloadedModels(): Promise<string[]> {
    const results: string[] = [];
    for (const m of MODELS) {
      if (await this.isModelDownloaded(m)) results.push(m.id);
    }
    return results;
  }

  // -------------------------------------------------------------------------
  // Model loading
  // -------------------------------------------------------------------------

  /**
   * Load a GGUF model into memory.
   *
   * Accepts either a {@link ModelMeta} or a raw `file://…` path string.
   * Parameters are tuned for low-memory Android devices:
   *   n_ctx = 1024, n_predict = 200, n_threads = 4, use_mlock = true
   *
   * Throws a descriptive error when the native module is not available.
   */
  async load(modelPathOrMeta: ModelMeta | string): Promise<void> {
    if (!this.isAvailable() || !_initLlama) {
      throw new Error(
        'llama.rn native module is not available. ' +
          'Vexsora requires a native Android build — ' +
          'it cannot run on web, Expo Go, or a simulator without native libraries.'
      );
    }

    if (Platform.OS === 'web') {
      throw new Error(
        'On-device LLM inference is not supported on web. ' +
          'Build a native Android APK to use Vexsora.'
      );
    }

    const modelPath =
      typeof modelPathOrMeta === 'string'
        ? modelPathOrMeta
        : `file://${this.getModelPath(modelPathOrMeta)}`;

    // Release any previously loaded model first
    if (this._context) {
      await this.unload();
    }

    this._isLoading = true;
    try {
      this._context = await _initLlama({
        model: modelPath,
        n_ctx: 1024,
        n_predict: 200,
        n_threads: 4,
        use_mlock: true,
      });
      this._loadedModelPath = modelPath;
    } finally {
      this._isLoading = false;
    }
  }

  // -------------------------------------------------------------------------
  // Inference
  // -------------------------------------------------------------------------

  /**
   * Stream a chat completion.
   *
   * @param systemPrompt - Injected as the leading system message.
   * @param history      - Prior conversation turns (role + content).
   * @param onToken      - Called for every incremental token as it arrives.
   * @returns The full concatenated response text.
   */
  async completion(
    systemPrompt: string,
    history: { role: string; content: string }[],
    onToken: (token: string) => void
  ): Promise<string> {
    if (!this._context) {
      throw new Error(
        'No model is loaded. Call llamaService.load() before calling completion().'
      );
    }

    const messages = [{ role: 'system', content: systemPrompt }, ...history];

    // Match stop tokens to the loaded model
    const matchedModel = MODELS.find((m) =>
      this._loadedModelPath?.includes(m.filename)
    );
    const stopTokens = matchedModel?.stopTokens ?? ['</s>'];

    const result = await this._context.completion(
      {
        messages,
        n_predict: 200,
        stop: stopTokens,
        temperature: 0.7,
      },
      (data) => {
        if (data.token) {
          onToken(data.token);
        }
      }
    );

    return result.text ?? '';
  }

  // -------------------------------------------------------------------------
  // Unload
  // -------------------------------------------------------------------------

  /** Release the model context and free all native memory. */
  async unload(): Promise<void> {
    if (this._context) {
      try {
        await this._context.release();
      } catch {
        // Context may already have been freed by the runtime — ignore.
      }
      this._context = null;
    }
    this._loadedModelPath = null;
  }

  // -------------------------------------------------------------------------
  // Download management
  // -------------------------------------------------------------------------

  /**
   * Download a model GGUF file to local storage using expo-file-system.
   *
   * Supports two call signatures:
   *   downloadModel(model, onProgress, onDone, onError)
   *   downloadModel(url, destPath, onProgress, onDone, onError)
   */
  async downloadModel(
    modelOrUrl: ModelMeta | string,
    destPathOrOnProgress: string | ((state: DownloadState) => void),
    onProgressOrOnDone?: ((state: DownloadState) => void) | (() => void),
    onDoneOrOnError?: (() => void) | ((msg: string) => void),
    onError?: (msg: string) => void
  ): Promise<void> {
    if (Platform.OS === 'web') {
      const errFn =
        typeof onError === 'function'
          ? onError
          : (onDoneOrOnError as (msg: string) => void);
      errFn?.('Model downloads are not supported on web.');
      return;
    }

    if (this._activeDownload) {
      const errFn =
        typeof onError === 'function'
          ? onError
          : (onDoneOrOnError as (msg: string) => void);
      errFn?.('A download is already in progress. Cancel it first.');
      return;
    }

    // Resolve overloaded arguments
    let model: ModelMeta | null = null;
    let url: string;
    let destPath: string;
    let onProgress: (state: DownloadState) => void;
    let onDone: () => void;
    let onErr: (msg: string) => void;

    if (
      typeof modelOrUrl === 'string' &&
      typeof destPathOrOnProgress === 'string'
    ) {
      // (url, destPath, onProgress, onDone, onError)
      url = modelOrUrl;
      destPath = destPathOrOnProgress;
      onProgress =
        (onProgressOrOnDone as (state: DownloadState) => void) ?? (() => {});
      onDone = (onDoneOrOnError as () => void) ?? (() => {});
      onErr = onError ?? (() => {});
    } else {
      // (model, onProgress, onDone, onError)
      model = modelOrUrl as ModelMeta;
      url = model.url;
      destPath = this.getModelPath(model);
      onProgress =
        (destPathOrOnProgress as (state: DownloadState) => void) ?? (() => {});
      onDone = (onProgressOrOnDone as () => void) ?? (() => {});
      onErr = (onDoneOrOnError as (msg: string) => void) ?? (() => {});
    }

    // Ensure destination directory exists
    const dirPath = destPath.substring(0, destPath.lastIndexOf('/') + 1);
    const dirInfo = await FileSystem.getInfoAsync(dirPath);
    if (!dirInfo.exists) {
      await FileSystem.makeDirectoryAsync(dirPath, { intermediates: true });
    }

    const totalMB = model?.sizeMB ?? 0;
    this._downloadState = {
      modelId: model?.id ?? 'custom',
      progress: 0,
      downloadedMB: 0,
      totalMB,
    };

    this._activeDownload = FileSystem.createDownloadResumable(
      url,
      destPath,
      {},
      ({ totalBytesWritten, totalBytesExpectedToWrite }: { totalBytesWritten: number; totalBytesExpectedToWrite: number }) => {
        const total =
          totalBytesExpectedToWrite > 0
            ? totalBytesExpectedToWrite
            : totalMB * 1_048_576;
        const progress = Math.min(totalBytesWritten / total, 1);
        const state: DownloadState = {
          modelId: model?.id ?? 'custom',
          progress,
          downloadedMB: Math.round(totalBytesWritten / 1_048_576),
          totalMB: Math.round(total / 1_048_576),
        };
        this._downloadState = state;
        onProgress(state);
      }
    );

    try {
      const result = await this._activeDownload.downloadAsync();
      this._activeDownload = null;
      this._downloadState = null;
      if (result?.status === 200) {
        onDone();
      } else {
        onErr(`Download failed — HTTP ${result?.status ?? 'unknown'}`);
      }
    } catch (e: unknown) {
      this._activeDownload = null;
      this._downloadState = null;
      const msg = e instanceof Error ? e.message : String(e);
      // Suppress cancellation noise
      if (!msg.toLowerCase().includes('cancel') && !msg.toLowerCase().includes('aborted')) {
        onErr(msg || 'Unknown download error');
      }
    }
  }

  /** Cancel an in-progress download. */
  async cancelDownload(): Promise<void> {
    if (this._activeDownload) {
      try {
        await this._activeDownload.cancelAsync();
      } catch {
        // Already finished or already cancelled — safe to ignore.
      }
      this._activeDownload = null;
      this._downloadState = null;
    }
  }

  /** Delete a downloaded model file from local storage. */
  async deleteModel(model: ModelMeta): Promise<void> {
    if (Platform.OS === 'web') return;
    const path = this.getModelPath(model);
    const info = await FileSystem.getInfoAsync(path);
    if (info.exists) {
      await FileSystem.deleteAsync(path, { idempotent: true });
    }
  }
}

export const llamaService = new LlamaService();
