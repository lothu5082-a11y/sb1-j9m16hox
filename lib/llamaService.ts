import { Platform } from 'react-native';
import * as FileSystem from 'expo-file-system/legacy';

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

export type DownloadState = {
  modelId: string;
  progress: number;
  downloadedMB: number;
  totalMB: number;
};

class LlamaService {
  private _activeDownload: ReturnType<typeof FileSystem.createDownloadResumable> | null = null;
  private _downloadState: DownloadState | null = null;
  private _loadedModelId: string | null = null;

  isAvailable(): boolean { return false; }
  isLoaded(): boolean { return false; }
  isLoading(): boolean { return false; }
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
    if (Platform.OS === 'web') { onError('Not supported on web'); return; }
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
    const path = this.getModelPath(model);
    const info = await FileSystem.getInfoAsync(path);
    if (info.exists) await FileSystem.deleteAsync(path, { idempotent: true });
  }

  async load(_model: ModelMeta): Promise<void> {
    throw new Error('On-device inference not available in this build');
  }

  async unload(): Promise<void> {
    this._loadedModelId = null;
  }

  async completion(
    _history: { role: string; content: string }[],
    _onToken: (token: string) => void
  ): Promise<string> {
    throw new Error('No model loaded');
  }
}

export const llamaService = new LlamaService();
