/**
 * Vexsora Local API Client
 * --------------------------------------------------------------------------
 * The single bridge between the UI layer and the on-device inference engine.
 *
 * The engine runs natively on the device loopback interface and exposes an
 * OpenAI-compatible Chat Completions endpoint:
 *
 *      http://127.0.0.1:8080/v1/chat/completions
 *
 * Design goals:
 *   1. 100% offline-first — never reaches out to any cloud service.
 *   2. Fully decoupled — the UI imports ONLY from this module and never
 *      touches `fetch`, URLs, or transport details directly.
 *   3. Crash-proof — every call resolves with a typed result. Network /
 *      connection failures are caught here and surfaced as a clean,
 *      actionable diagnostic instead of an unhandled rejection.
 *
 * No external, cloud-dependent packages are used. Only the platform `fetch`
 * + `AbortController` primitives.
 */

// ── Endpoint configuration (device loopback) ───────────────────────────────
export const VEXSORA_HOST = 'http://127.0.0.1:8080';
export const VEXSORA_CHAT_ENDPOINT = `${VEXSORA_HOST}/v1/chat/completions`;
export const VEXSORA_MODELS_ENDPOINT = `${VEXSORA_HOST}/v1/models`;

const HEALTH_TIMEOUT_MS = 2_500;
const CHAT_TIMEOUT_MS = 120_000;

/**
 * Strict core system instruction prepended to EVERY request before it reaches
 * the engine. The local model has no inherent knowledge of Vexsora's tool
 * syntax, so this teaches it the exact `[[EXEC: ...]]` directive format that
 * `utils/actionRouter.ts` knows how to intercept. Owned by the client so no
 * caller can forget it.
 */
export const VEXSORA_CORE_SYSTEM_PROMPT =
  'You are Vexsora Core, an offline device automation assistant. You possess ' +
  'system-level capabilities. When a command requires a local tool, you MUST ' +
  'prefix or embed the exact command syntax using: [[EXEC: action_name ' +
  'param_name="value"]]. Do not use markdown code blocks for actions.\n' +
  'Available Tools:\n' +
  '1. create_file (params: name, content)\n' +
  '2. toggle_state (params: systemState)\n' +
  '3. run_shell (params: command)\n\n' +
  'Example: If asked to log an idea to note.txt, emit: [[EXEC: create_file ' +
  'name="note.txt" content="user idea"]]';

// ── Types ───────────────────────────────────────────────────────────────────
export type ChatRole = 'system' | 'user' | 'assistant';

export interface ChatMessage {
  role: ChatRole;
  content: string;
}

export interface ChatOptions {
  model?: string;
  systemPrompt?: string;
  temperature?: number;
  maxTokens?: number;
  /** Abort the in-flight request (e.g. user navigates away / cancels). */
  signal?: AbortSignal;
}

/** Callback fired for every token chunk as it streams in from the engine. */
export type StreamTokenHandler = (delta: string, full: string) => void;

export interface StreamChatOptions extends ChatOptions {
  /** Invoked for each incremental token. `full` is the accumulated text. */
  onToken: StreamTokenHandler;
}

/** Why a request could not be completed — drives the UI diagnostic copy. */
export type EngineFailureReason =
  | 'offline' // could not reach the loopback server at all
  | 'timeout' // server reachable but did not respond in time
  | 'http' // server responded with a non-2xx status
  | 'parse' // response was not the expected shape
  | 'aborted'; // caller cancelled the request

export type ChatResult =
  | { ok: true; content: string }
  | {
      ok: false;
      reason: EngineFailureReason;
      message: string;
      status?: number;
    };

export type EngineStatus = 'unknown' | 'checking' | 'online' | 'offline';

// ── Human-readable diagnostics ───────────────────────────────────────────────
const DIAGNOSTICS: Record<EngineFailureReason, string> = {
  offline:
    `Local engine not detected on ${VEXSORA_HOST}.\n` +
    `Initialize the Vexsora engine on this device, then retry.`,
  timeout:
    `The local engine is reachable but did not respond in time.\n` +
    `It may still be loading the model — give it a moment and retry.`,
  http:
    `The local engine returned an unexpected error.\n` +
    `Check the engine logs on ${VEXSORA_HOST} and retry.`,
  parse:
    `The local engine returned a response Vexsora could not read.\n` +
    `Confirm it speaks the OpenAI-compatible chat format.`,
  aborted: `Request cancelled.`,
};

export function diagnosticFor(reason: EngineFailureReason): string {
  return DIAGNOSTICS[reason];
}

// ── Internal helpers ──────────────────────────────────────────────────────────

/** Distinguishes an internal timeout abort from a caller-initiated abort. */
class TimeoutError extends Error {
  constructor() {
    super('timeout');
    this.name = 'TimeoutError';
  }
}

/**
 * `fetch` wrapped with a hard timeout. Composes an optional caller-supplied
 * AbortSignal with an internal timeout so either can cancel the request. A
 * timeout is surfaced as a distinct `TimeoutError` (RN's generic AbortError
 * message is not reliable to parse), while a caller abort propagates as-is.
 */
async function fetchWithTimeout(
  url: string,
  init: RequestInit,
  timeoutMs: number,
  externalSignal?: AbortSignal
): Promise<Response> {
  const controller = new AbortController();
  let timedOut = false;
  const timer = setTimeout(() => {
    timedOut = true;
    controller.abort();
  }, timeoutMs);

  const onExternalAbort = () => controller.abort();
  if (externalSignal) {
    if (externalSignal.aborted) controller.abort();
    else externalSignal.addEventListener('abort', onExternalAbort, { once: true });
  }

  try {
    return await fetch(url, { ...init, signal: controller.signal });
  } catch (err) {
    if (timedOut) throw new TimeoutError();
    throw err;
  } finally {
    clearTimeout(timer);
    externalSignal?.removeEventListener('abort', onExternalAbort);
  }
}

/** Classify a thrown fetch error into a stable failure reason. */
function classifyThrow(err: unknown, externalSignal?: AbortSignal): EngineFailureReason {
  if (err instanceof TimeoutError) return 'timeout';
  if (externalSignal?.aborted) return 'aborted';
  // RN / web surface unreachable hosts as a generic TypeError ("Network request failed").
  return 'offline';
}

// ── Public client ─────────────────────────────────────────────────────────────
class VexsoraClient {
  readonly host = VEXSORA_HOST;
  readonly endpoint = VEXSORA_CHAT_ENDPOINT;

  /**
   * Build the final message array sent to the engine. The Vexsora Core system
   * instruction is always prepended first; an optional caller-supplied
   * systemPrompt follows it, then the conversation history.
   */
  private composeMessages(history: ChatMessage[], systemPrompt?: string): ChatMessage[] {
    const preamble: ChatMessage[] = [
      { role: 'system', content: VEXSORA_CORE_SYSTEM_PROMPT },
    ];
    if (systemPrompt) preamble.push({ role: 'system', content: systemPrompt });
    return [...preamble, ...history];
  }

  /**
   * Lightweight liveness probe. Resolves to `true` only if the loopback
   * engine answers the models endpoint. Never throws.
   */
  async ping(signal?: AbortSignal): Promise<boolean> {
    try {
      const res = await fetchWithTimeout(
        VEXSORA_MODELS_ENDPOINT,
        { method: 'GET' },
        HEALTH_TIMEOUT_MS,
        signal
      );
      return res.ok;
    } catch {
      return false;
    }
  }

  /** Same as `ping`, mapped to the richer EngineStatus enum. */
  async status(signal?: AbortSignal): Promise<EngineStatus> {
    return (await this.ping(signal)) ? 'online' : 'offline';
  }

  /**
   * Send a chat turn to the local engine. Always resolves with a ChatResult —
   * transport failures become typed `{ ok: false, ... }` values so callers
   * never have to wrap this in a try/catch to stay crash-free.
   */
  async chat(history: ChatMessage[], options: ChatOptions = {}): Promise<ChatResult> {
    const {
      model = 'local',
      systemPrompt,
      temperature = 0.7,
      maxTokens = 1024,
      signal,
    } = options;

    const messages = this.composeMessages(history, systemPrompt);

    let res: Response;
    try {
      res = await fetchWithTimeout(
        VEXSORA_CHAT_ENDPOINT,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            model,
            messages,
            temperature,
            max_tokens: maxTokens,
            stream: false,
          }),
        },
        CHAT_TIMEOUT_MS,
        signal
      );
    } catch (err) {
      const reason = classifyThrow(err, signal);
      return { ok: false, reason, message: diagnosticFor(reason) };
    }

    if (!res.ok) {
      return {
        ok: false,
        reason: 'http',
        status: res.status,
        message: diagnosticFor('http'),
      };
    }

    try {
      const data = await res.json();
      const content: unknown = data?.choices?.[0]?.message?.content;
      if (typeof content !== 'string' || content.length === 0) {
        return { ok: false, reason: 'parse', message: diagnosticFor('parse') };
      }
      return { ok: true, content: content.trim() };
    } catch {
      return { ok: false, reason: 'parse', message: diagnosticFor('parse') };
    }
  }

  /**
   * Streaming variant of `chat`. Requests `stream: true` and parses the
   * Server-Sent Events emitted by llama-server, invoking `onToken` for every
   * incremental chunk so the UI can render tokens the instant they arrive.
   *
   * Implemented on `XMLHttpRequest` rather than `fetch` because React Native's
   * `fetch` buffers the whole response body (no `ReadableStream`), whereas XHR
   * exposes `responseText` progressively during `readyState === LOADING` on
   * both native and web.
   *
   * Like `chat`, it always resolves with a typed `ChatResult` and never throws.
   * The resolved `content` holds the final accumulated text; any tokens already
   * delivered via `onToken` remain even if the stream later errors mid-flight.
   */
  chatStream(history: ChatMessage[], options: StreamChatOptions): Promise<ChatResult> {
    const {
      model = 'local',
      systemPrompt,
      temperature = 0.7,
      maxTokens = 1024,
      signal,
      onToken,
    } = options;

    const messages = this.composeMessages(history, systemPrompt);

    return new Promise<ChatResult>((resolve) => {
      const xhr = new XMLHttpRequest();
      let settled = false;
      let timedOut = false;
      let full = '';
      let processed = 0; // index into responseText already consumed
      let sseBuffer = ''; // carries an incomplete trailing line between chunks

      const cleanup = () => {
        signal?.removeEventListener('abort', onAbort);
      };
      const finish = (result: ChatResult) => {
        if (settled) return;
        settled = true;
        cleanup();
        resolve(result);
      };
      const onAbort = () => {
        finish({ ok: false, reason: 'aborted', message: diagnosticFor('aborted') });
        try {
          xhr.abort();
        } catch {
          /* noop */
        }
      };

      // Parse one SSE line ("data: {...}" / "data: [DONE]"); ignore comments.
      const handleLine = (raw: string) => {
        const line = raw.trim();
        if (!line || !line.startsWith('data:')) return;
        const payload = line.slice(5).trim();
        if (payload === '[DONE]') {
          finish(
            full.trim().length > 0
              ? { ok: true, content: full.trim() }
              : { ok: false, reason: 'parse', message: diagnosticFor('parse') }
          );
          return;
        }
        try {
          const json = JSON.parse(payload);
          const choice = json?.choices?.[0];
          // Support both chat-style deltas and raw completion text.
          const delta: unknown = choice?.delta?.content ?? choice?.text;
          if (typeof delta === 'string' && delta.length > 0) {
            full += delta;
            onToken(delta, full);
          }
        } catch {
          /* keepalive or partial JSON — skip */
        }
      };

      // Consume newly arrived text; on `final`, flush any trailing partial line.
      const drain = (final: boolean) => {
        const text = xhr.responseText || '';
        if (text.length > processed) {
          sseBuffer += text.slice(processed);
          processed = text.length;
        }
        let nl: number;
        while ((nl = sseBuffer.indexOf('\n')) >= 0) {
          const line = sseBuffer.slice(0, nl);
          sseBuffer = sseBuffer.slice(nl + 1);
          handleLine(line);
          if (settled) return;
        }
        if (final && sseBuffer.trim().length > 0) {
          handleLine(sseBuffer);
          sseBuffer = '';
        }
      };

      xhr.onreadystatechange = () => {
        if (settled) return;
        if (xhr.readyState === 3 /* LOADING */) {
          drain(false);
        } else if (xhr.readyState === 4 /* DONE */) {
          drain(true);
          if (settled) return;
          if (timedOut) {
            finish({ ok: false, reason: 'timeout', message: diagnosticFor('timeout') });
          } else if (xhr.status === 0) {
            finish({ ok: false, reason: 'offline', message: diagnosticFor('offline') });
          } else if (xhr.status < 200 || xhr.status >= 300) {
            finish({ ok: false, reason: 'http', status: xhr.status, message: diagnosticFor('http') });
          } else if (full.trim().length === 0) {
            finish({ ok: false, reason: 'parse', message: diagnosticFor('parse') });
          } else {
            finish({ ok: true, content: full.trim() });
          }
        }
      };

      xhr.ontimeout = () => {
        timedOut = true;
        finish({ ok: false, reason: 'timeout', message: diagnosticFor('timeout') });
      };
      xhr.onerror = () => {
        finish({ ok: false, reason: 'offline', message: diagnosticFor('offline') });
      };

      if (signal) {
        if (signal.aborted) {
          onAbort();
          return;
        }
        signal.addEventListener('abort', onAbort, { once: true });
      }

      try {
        xhr.open('POST', VEXSORA_CHAT_ENDPOINT);
        xhr.setRequestHeader('Content-Type', 'application/json');
        xhr.setRequestHeader('Accept', 'text/event-stream');
        xhr.timeout = CHAT_TIMEOUT_MS;
        xhr.send(
          JSON.stringify({
            model,
            messages,
            temperature,
            max_tokens: maxTokens,
            stream: true,
          })
        );
      } catch {
        finish({ ok: false, reason: 'offline', message: diagnosticFor('offline') });
      }
    });
  }
}

export const vexsoraClient = new VexsoraClient();
