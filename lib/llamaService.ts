import { Platform } from 'react-native';

type LlamaContext = {
  completion: (
    params: object,
    callback: (data: { token: string }) => void
  ) => Promise<{ text: string }>;
  release: () => Promise<void>;
};

let _initLlama: ((params: object) => Promise<LlamaContext>) | null = null;
if (Platform.OS !== 'web') {
  try {
    _initLlama = require('llama.rn').initLlama;
  } catch {
    // native module unavailable (Expo Go / web)
  }
}

const SYSTEM_PROMPT =
  'You are Riuka AI, an autonomous on-device executive assistant for Android. ' +
  'You monitor notifications, analyse clipboard data, and execute cross-app workflows ' +
  'via the Accessibility layer. Privacy-first, zero-cloud, extremely capable. ' +
  'Be concise, direct, and action-oriented.';

class LlamaService {
  private ctx: LlamaContext | null = null;
  private _loading = false;
  private _modelPath: string | null = null;

  isAvailable(): boolean { return _initLlama !== null; }
  isLoaded(): boolean { return this.ctx !== null; }
  isLoading(): boolean { return this._loading; }
  getModelPath(): string | null { return this._modelPath; }

  async load(
    modelPath: string,
    onProgress?: (ratio: number) => void
  ): Promise<void> {
    if (!_initLlama) throw new Error('llama.rn not available on this platform');
    if (this.ctx) await this.unload();

    this._loading = true;
    try {
      this.ctx = await _initLlama({
        model: modelPath,
        n_ctx: 2048,
        n_threads: 4,
        n_gpu_layers: 0,
      });
      this._modelPath = modelPath;
      onProgress?.(1);
    } finally {
      this._loading = false;
    }
  }

  async unload(): Promise<void> {
    if (this.ctx) {
      await this.ctx.release();
      this.ctx = null;
      this._modelPath = null;
    }
  }

  async completion(
    history: { role: string; content: string }[],
    onToken: (token: string) => void
  ): Promise<string> {
    if (!this.ctx) throw new Error('No model loaded');

    const messages = [
      { role: 'system', content: SYSTEM_PROMPT },
      ...history,
    ];

    let full = '';
    await this.ctx.completion(
      {
        messages,
        n_predict: 512,
        temperature: 0.7,
        stop: ['</s>', '<|end|>', '<|eot_id|>', '<|im_end|>'],
      },
      (data) => {
        if (data.token) {
          full += data.token;
          onToken(data.token);
        }
      }
    );
    return full;
  }
}

export const llamaService = new LlamaService();
