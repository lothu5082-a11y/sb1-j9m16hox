import { Platform } from 'react-native';
import * as FileSystem from 'expo-file-system/legacy';

// llama.rn is a native module. It is only present in a native (EAS / dev-client)
// build. We require it lazily so the web bundle and Expo Go don't crash.
let RNLlama: any = null;
try {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  RNLlama = require('llama.rn');
} catch {
  RNLlama = null;
}

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
    stopTokens: ['<|eot_id|>', '<|end_of_text|>', '</s>'],
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
    id: 'qwen25-15b',
    name: 'Qwen 2.5 1.5B',
    subtitle: 'Alibaba · Instruct · Q4_K_M',
    sizeMB: 1100,
    tier: 'Smart',
    tierColor: '#F59E0B',
    url: 'https://huggingface.co/Qwen/Qwen2.5-1.5B-Instruct-GGUF/resolve/main/qwen2.5-1.5b-instruct-q4_k_m.gguf',
    filename: 'qwen2.5-1.5b-instruct-q4_k_m.gguf',
    stopTokens: ['<|im_end|>', '<|endoftext|>'],
  },
];

export type DownloadState = {
  modelId: string;
  progress: number;
  downloadedMB: number;
  totalMB: number;
};

export type ChatTurn = { role: 'system' | 'user' | 'assistant'; content: string };

class LlamaService {
  private _activeDownload: ReturnType<typeof FileSystem.createDownloadResumable> | null = null;
  private _downloadState: DownloadState | null = null;
  private _loadedModelId: string | null = null;
  private _context: any = null;
  private _loading = false;
  private _stopTokens: string[] = [];

  /** True only when the native llama.rn module is present (real device build). */
  isAvailable(): boolean {
    return Platform.OS !== 'web' && RNLlama != null && typeof RNLlama.initLlama === 'function';
  }
  isLoaded(): boolean { return this._context != null; }
  isLoading(): boolean { return this._loading; }
  isDownloading(): boolean { return this._activeDownload !== null; }
  getLoadedModelId(): string | null { return this._loadedModelId; }
  getDownloadState(): DownloadState | null { return this._downloadState; }

  getModelDir(): string {
    return (FileSystem.documentDirectory ?? '') + 'models/';
  }

  getModelPath(model: ModelMeta): string {
    return this.getModelDir() + model.filename;
  }

  async isModelDownloaded(model: ModelMeta): Promise<boolean> {
    if (Platform.OS === 'web') return false;
    try {
      const info = await FileSystem.getInfoAsync(this.getModelPath(model));
      return info.exists && (info as any).size > 1_000_000;
    } catch {
      return false;
    }
  }

  async getDownloadedModels(): Promise<string[]> {
    const results: string[] = [];
    for (const m of MODELS) {
      if (await this.isModelDownloaded(m)) results.push(m.id);
    }
    return results;
  }

  async downloadModel(
    model: ModelMeta,
    onProgress: (state: DownloadState) => void,
    onDone: () => void,
    onError: (msg: string) => void
  ): Promise<void> {
    if (Platform.OS === 'web') { onError('On-device models need the Android app (not the web preview).'); return; }
    if (this._activeDownload) { onError('A download is already in progress'); return; }

    const dir = this.getModelDir();
    const dirInfo = await FileSystem.getInfoAsync(dir);
    if (!dirInfo.exists) await FileSystem.makeDirectoryAsync(dir, { intermediates: true });

    const destPath = this.getModelPath(model);
    this._downloadState = { modelId: model.id, progress: 0, downloadedMB: 0, totalMB: model.sizeMB };

    this._activeDownload = FileSystem.createDownloadResumable(
      model.url,
      destPath,
      {},
      ({ totalBytesWritten, totalBytesExpectedToWrite }) => {
        const total = totalBytesExpectedToWrite > 0 ? totalBytesExpectedToWrite : model.sizeMB * 1_048_576;
        const progress = Math.min(totalBytesWritten / total, 1);
        const state: DownloadState = {
          modelId: model.id,
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
        onError(`Download failed (status ${result?.status ?? 'unknown'})`);
      }
    } catch (e: any) {
      this._activeDownload = null;
      this._downloadState = null;
      if (!e?.message?.includes('cancel') && !e?.message?.includes('aborted')) {
        onError(e?.message ?? 'Download error');
      }
    }
  }

  async cancelDownload(): Promise<void> {
    if (this._activeDownload) {
      try { await this._activeDownload.cancelAsync(); } catch { }
      this._activeDownload = null;
      this._downloadState = null;
    }
  }

  async deleteModel(model: ModelMeta): Promise<void> {
    if (Platform.OS === 'web') return;
    if (this._loadedModelId === model.id) await this.unload();
    const path = this.getModelPath(model);
    const info = await FileSystem.getInfoAsync(path);
    if (info.exists) await FileSystem.deleteAsync(path, { idempotent: true });
  }

  /** Load a downloaded GGUF into the on-device inference engine. */
  async load(model: ModelMeta): Promise<void> {
    if (!this.isAvailable()) {
      throw new Error('On-device AI needs the installed Android app. Build it with EAS (see README).');
    }
    if (this._loadedModelId === model.id && this._context) return;
    if (this._loading) throw new Error('A model is already loading');

    const downloaded = await this.isModelDownloaded(model);
    if (!downloaded) throw new Error('Download the model first.');

    this._loading = true;
    try {
      // Release any previously loaded model before swapping.
      if (this._context) {
        try { await this._context.release(); } catch { }
        this._context = null;
        this._loadedModelId = null;
      }

      let modelPath = this.getModelPath(model);
      // llama.rn expects a bare filesystem path (no file:// scheme).
      if (modelPath.startsWith('file://')) modelPath = modelPath.replace('file://', '');

      this._context = await RNLlama.initLlama({
        model: modelPath,
        n_ctx: 2048,
        n_gpu_layers: Platform.OS === 'ios' ? 99 : 0, // Metal on iOS; CPU on Android.
        use_mlock: false,
      });
      this._loadedModelId = model.id;
      this._stopTokens = model.stopTokens;
    } catch (e: any) {
      this._context = null;
      this._loadedModelId = null;
      throw new Error(e?.message ?? 'Failed to load model');
    } finally {
      this._loading = false;
    }
  }

  async unload(): Promise<void> {
    if (this._context) {
      try { await this._context.release(); } catch { }
    }
    this._context = null;
    this._loadedModelId = null;
  }

  /**
   * Run a streaming chat completion fully on-device.
   * `onToken` is called with each new token as it is generated.
   * Returns the full generated text.
   */
  async completion(
    history: ChatTurn[],
    onToken: (token: string) => void
  ): Promise<string> {
    if (!this._context) throw new Error('No model loaded');

    const result = await this._context.completion(
      {
        messages: history,
        n_predict: 512,
        temperature: 0.7,
        top_p: 0.9,
        stop: this._stopTokens,
      },
      (data: { token?: string }) => {
        if (data?.token) onToken(data.token);
      }
    );

    const text: string = (result?.text ?? '').toString();
    // Trim any stop token that leaked into the final text.
    let clean = text;
    for (const s of this._stopTokens) {
      const idx = clean.indexOf(s);
      if (idx !== -1) clean = clean.slice(0, idx);
    }
    return clean.trim();
  }
}

export const llamaService = new LlamaService();
