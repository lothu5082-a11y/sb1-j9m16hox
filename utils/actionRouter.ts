/**
 * Vexsora — Local Action / Tool Registry
 * --------------------------------------------------------------------------
 * Turns Vexsora from a chatbot into a system assistant. This module owns:
 *
 *   1. A schema registry of locally-executable actions (create a file, run a
 *      shell command, toggle a system state, …). Each action declares its
 *      params and a `run()` handler that performs the effect on-device.
 *   2. A parser that detects action directives the engine embeds in its
 *      replies — either the bracket syntax  [[EXEC: create_file name="x.txt"]]
 *      or a structured JSON tool-call payload.
 *   3. A dispatcher that runs the matched action locally and a fallback for
 *      unknown actions so the UI can always surface "System Action Triggered".
 *
 * Strictly local + zero new dependencies: only React Native's `Platform` and
 * the project's existing `expo-file-system` are used. No handler ever throws —
 * every dispatch resolves to a typed `ActionResult`.
 */

import { Platform } from 'react-native';
import * as FileSystem from 'expo-file-system/legacy';

// ── Types ─────────────────────────────────────────────────────────────────────
export type ActionParams = Record<string, string>;

export interface ActionInvocation {
  /** Registered action name, e.g. `create_file`. */
  name: string;
  params: ActionParams;
  /** The exact matched directive text — used to strip it from the chat view. */
  raw: string;
}

export interface ActionResult {
  ok: boolean;
  /** Human label shown as "System Action Triggered: <label>". */
  label: string;
  /** Optional one-line detail rendered under the notice. */
  detail?: string;
}

export interface ActionParamSpec {
  name: string;
  required?: boolean;
  description?: string;
}

export interface ActionDefinition {
  name: string;
  label: string;
  description: string;
  params: ActionParamSpec[];
  /** Perform the action locally. Implementations must never throw. */
  run: (params: ActionParams) => Promise<ActionResult> | ActionResult;
}

/** Title-cases an action name for fallback labels: `toggle_state` → `Toggle State`. */
function humanize(name: string): string {
  return name
    .replace(/[_-]+/g, ' ')
    .trim()
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

// ── Registry / dispatcher ─────────────────────────────────────────────────────
class ActionRouter {
  private registry = new Map<string, ActionDefinition>();

  register(def: ActionDefinition): void {
    this.registry.set(def.name, def);
  }

  has(name: string): boolean {
    return this.registry.has(name);
  }

  get(name: string): ActionDefinition | undefined {
    return this.registry.get(name);
  }

  list(): ActionDefinition[] {
    return [...this.registry.values()];
  }

  /**
   * Execute a single invocation. Unknown actions resolve through the fallback
   * so the terminal still reports "System Action Triggered". Never throws.
   */
  async dispatch(invocation: ActionInvocation): Promise<ActionResult> {
    const def = this.registry.get(invocation.name);
    if (!def) {
      return {
        ok: false,
        label: humanize(invocation.name),
        detail: `No local handler registered for "${invocation.name}".`,
      };
    }
    try {
      return await def.run(invocation.params);
    } catch (err) {
      return {
        ok: false,
        label: def.label,
        detail: err instanceof Error ? err.message : 'Action failed.',
      };
    }
  }
}

export const actionRouter = new ActionRouter();

// ── Directive parsing ──────────────────────────────────────────────────────────
/** Bracket directive: `[[EXEC: action_name key="value" flag=on]]`. */
const EXEC_PATTERN = '\\[\\[\\s*EXEC\\s*:\\s*([a-zA-Z0-9_]+)\\s*([^\\]]*?)\\]\\]';

/** Parse `key="value"` / `key='value'` / `key=value` pairs from a param string. */
function parseParams(raw: string): ActionParams {
  const params: ActionParams = {};
  const re = /([a-zA-Z0-9_]+)\s*=\s*(?:"([^"]*)"|'([^']*)'|(\S+))/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(raw)) !== null) {
    params[m[1]] = m[2] ?? m[3] ?? m[4] ?? '';
  }
  return params;
}

/** Attempt to read a structured JSON tool-call payload (optionally fenced). */
function parseJsonAction(text: string): ActionInvocation | null {
  const fence = text.match(/```(?:json)?\s*([\s\S]*?)```/i);
  const candidate = (fence ? fence[1] : text).trim();
  if (!candidate.startsWith('{')) return null;
  try {
    const obj = JSON.parse(candidate) as Record<string, unknown>;
    const name = obj.action ?? obj.tool ?? obj.name;
    if (typeof name !== 'string') return null;
    const rawParams = (obj.params ?? obj.arguments ?? {}) as Record<string, unknown>;
    const params: ActionParams = {};
    for (const key of Object.keys(rawParams)) params[key] = String(rawParams[key]);
    return { name, params, raw: fence ? fence[0] : candidate };
  } catch {
    return null;
  }
}

export interface ParsedMessage {
  /** Engine text with every action directive removed — safe to display. */
  cleanedText: string;
  /** All detected action invocations, in order. */
  actions: ActionInvocation[];
}

/**
 * Extract action directives from a completed engine reply, returning the
 * display-safe text plus the invocations to dispatch. Bracket directives take
 * precedence; a JSON tool-call is only considered when no bracket directive is
 * present (avoids double-triggering).
 */
export function extractActions(text: string): ParsedMessage {
  const actions: ActionInvocation[] = [];

  const cleaned = text.replace(new RegExp(EXEC_PATTERN, 'gi'), (raw, name, rest) => {
    actions.push({ name: String(name), params: parseParams(String(rest ?? '')), raw });
    return '';
  });

  if (actions.length === 0) {
    const jsonAction = parseJsonAction(cleaned);
    if (jsonAction) {
      return { cleanedText: cleaned.replace(jsonAction.raw, '').trim(), actions: [jsonAction] };
    }
  }

  return { cleanedText: cleaned.trim(), actions };
}

/**
 * Display sanitizer for the streaming phase: strips completed directives and
 * hides any *in-progress* directive (an unterminated `[[…` tail, or a JSON
 * tool-call still being emitted) so raw command syntax never flashes in the UI.
 */
export function sanitizeStreaming(text: string): string {
  let t = text.replace(new RegExp(EXEC_PATTERN, 'gi'), '');

  // Hide an unterminated bracket directive tail.
  const open = t.lastIndexOf('[[');
  if (open !== -1 && t.indexOf(']]', open) === -1) {
    t = t.slice(0, open);
  }

  // Hide an in-progress JSON tool-call (whole reply is the payload).
  const trimmed = t.trimStart();
  if (trimmed.startsWith('{') || /^```(?:json)?/i.test(trimmed)) {
    return '';
  }

  return t;
}

/** One-line summaries of every registered action, for the system prompt. */
export function describeActions(): string {
  return actionRouter
    .list()
    .map((d) => {
      const ps = d.params.map((p) => (p.required ? `${p.name}*` : p.name)).join(' ');
      return `- ${d.name}${ps ? ` (${ps})` : ''}: ${d.description}`;
    })
    .join('\n');
}

// ── Built-in local actions ─────────────────────────────────────────────────────

/** In-memory system toggles, exposed for introspection / future UI binding. */
export const systemState: Record<string, boolean> = {};

actionRouter.register({
  name: 'create_file',
  label: 'Create File',
  description: 'Write a text file to local device storage.',
  params: [
    { name: 'name', required: true, description: 'File name, e.g. notes.txt' },
    { name: 'content', description: 'File contents' },
  ],
  async run(params) {
    const name = (params.name ?? params.path ?? 'untitled.txt').trim() || 'untitled.txt';
    const content = params.content ?? '';
    try {
      if (Platform.OS === 'web') {
        if (typeof localStorage !== 'undefined') {
          localStorage.setItem(`vexsora_fs:${name}`, content);
        }
        return {
          ok: true,
          label: 'Create File',
          detail: `Saved "${name}" (${content.length} chars) to local storage.`,
        };
      }
      const dir = `${FileSystem.documentDirectory ?? ''}vexsora/`;
      const info = await FileSystem.getInfoAsync(dir);
      if (!info.exists) await FileSystem.makeDirectoryAsync(dir, { intermediates: true });
      const path = `${dir}${name}`;
      await FileSystem.writeAsStringAsync(path, content);
      return {
        ok: true,
        label: 'Create File',
        detail: `Wrote "${name}" (${content.length} chars) on-device.`,
      };
    } catch (err) {
      return {
        ok: false,
        label: 'Create File',
        detail: err instanceof Error ? err.message : 'Write failed.',
      };
    }
  },
});

actionRouter.register({
  name: 'toggle_state',
  label: 'Toggle State',
  description: 'Flip or set a local system state flag (name, optional value=on/off).',
  params: [
    { name: 'name', required: true, description: 'State key to toggle' },
    { name: 'value', description: 'on/off — omit to flip current value' },
  ],
  run(params) {
    const key = (params.name ?? params.key ?? params.state ?? '').trim();
    if (!key) return { ok: false, label: 'Toggle State', detail: 'No state name provided.' };
    const next =
      params.value !== undefined
        ? /^(on|true|1|enable|enabled|yes)$/i.test(params.value)
        : !systemState[key];
    systemState[key] = next;
    return { ok: true, label: 'Toggle State', detail: `${key} → ${next ? 'ON' : 'OFF'}` };
  },
});

actionRouter.register({
  name: 'run_shell',
  label: 'Run Shell',
  description: 'Request execution of a shell command (cmd="…").',
  params: [{ name: 'cmd', required: true, description: 'Shell command to run' }],
  run(params) {
    const cmd = (params.cmd ?? params.command ?? params.value ?? '').trim();
    // On-device shell execution is sandboxed and intentionally not performed;
    // the action is still surfaced to the user via the terminal notice.
    return {
      ok: false,
      label: 'Run Shell',
      detail: cmd
        ? `Sandboxed on-device — not executed: ${cmd}`
        : 'No command provided.',
    };
  },
});
