# Vexsora — Project Guide

Vexsora is a **premium, 100% offline-first AI assistant** for mobile. The
inference engine runs natively on the device loopback interface
(`http://127.0.0.1:8080`) and exposes an OpenAI-compatible Chat Completions
API. No part of the app reaches out to any cloud service.

---

## Architecture

The app is split into clean, decoupled layers. The UI never touches the
network — it speaks only to the local API client.

```
index.js  ──▶  App.tsx (composition root: fonts, providers, status bar)
                  │
                  ▼
        components/VexsoraTerminal.tsx   ← UI layer (Void Black terminal)
                  │            │
                  │            └────────────▶ utils/actionRouter.ts  ← local tools
                  │  (imports the client, theme, and action router)
                  ▼
            lib/vexsoraClient.ts         ← transport + error boundaries
                  │
                  ▼
   http://127.0.0.1:8080/v1/chat/completions   ← on-device engine
```

### Layer responsibilities

| Layer | File | Owns |
|-------|------|------|
| Entry | `index.js` | Registers the root component via `registerRootComponent`. |
| Root | `App.tsx` | Fonts, `SafeAreaProvider`, `GestureHandlerRootView`, status bar, mounts the terminal. Intentionally thin. |
| UI | `components/VexsoraTerminal.tsx` | All view primitives, chat list, composer, status pill, diagnostics. Calls **only** `vexsoraClient`. |
| Client | `lib/vexsoraClient.ts` | The single bridge to the engine. Owns the loopback endpoint, request shape, timeouts, and **all error handling**. |
| Actions | `utils/actionRouter.ts` | Local tool registry: schema, directive parser, dispatcher, and built-in on-device actions. |
| Theme | `constants/vexsoraTheme.ts` | The "Void Black" design tokens (colors, spacing, radii, glows, mono font). |

### Why the UI is decoupled from transport

`VexsoraTerminal` imports `vexsoraClient` and the theme — nothing else
network-related. It never sees `fetch`, URLs, or HTTP status codes. This keeps
the surface easy to test and lets transport evolve (streaming, auth, a
different local port) without touching the UI.

---

## Local API client (`lib/vexsoraClient.ts`)

- **Endpoint:** `http://127.0.0.1:8080/v1/chat/completions` (device loopback).
- **Core system prompt:** `VEXSORA_CORE_SYSTEM_PROMPT` is prepended to **every**
  request's message array (via the private `composeMessages` helper) so the
  local model always knows its identity and the exact `[[EXEC: action_name
  param="value"]]` tool syntax that `utils/actionRouter.ts` intercepts. Owned by
  the client so no caller can forget it; an optional caller `systemPrompt`
  follows it.
- **`vexsoraClient.chat(history, options)`** — sends a turn. **Always resolves**
  with a typed `ChatResult` (`{ ok: true, content }` or
  `{ ok: false, reason, message }`). It never throws, so the UI cannot crash on
  a network failure.
- **`vexsoraClient.chatStream(history, { onToken })`** — real-time streaming
  turn. Requests `stream: true` and parses the Server-Sent Events from
  llama-server, calling `onToken(delta, full)` for each chunk so tokens render
  the instant they arrive. Built on `XMLHttpRequest` (not `fetch`) because RN's
  `fetch` buffers the whole body — XHR exposes `responseText` progressively on
  both native and web. Resolves with the same typed `ChatResult`; partial text
  already delivered via `onToken` is preserved even if the stream errors mid-way.
- **`vexsoraClient.ping()` / `.status()`** — lightweight liveness probe against
  `/v1/models` with a short timeout.
- **Error boundaries / diagnostics:** every failure is classified into a stable
  `EngineFailureReason` (`offline`, `timeout`, `http`, `parse`, `aborted`) and
  mapped to clean, actionable copy via `diagnosticFor()`. When the local engine
  isn't running, the user sees a calm "Local engine not detected — initialize
  the Vexsora engine" message instead of an error/crash.
- **Timeouts:** `fetchWithTimeout` composes the caller's `AbortSignal` with an
  internal timer (health probe ~2.5s, chat ~120s) so requests can't hang.
- **No cloud dependencies** — only the platform `fetch` + `AbortController`.

---

## Local Action / Tool Registry (`utils/actionRouter.ts`)

Turns Vexsora from a chatbot into a system assistant. Strictly local, no new
dependencies (only `Platform` + the existing `expo-file-system`).

- **Registry:** `actionRouter.register({ name, label, description, params, run })`.
  Built-ins: `create_file`, `toggle_state`, `run_shell`. `describeActions()`
  feeds the action catalog into the system prompt so the engine knows the syntax.
- **Directive parsing:** the engine can request an action two ways —
  - bracket syntax: `[[EXEC: create_file name="notes.txt" content="hi"]]`
  - a JSON tool-call payload (`{ "action": "...", "params": { ... } }`).
  `extractActions(text)` returns `{ cleanedText, actions }`; bracket directives
  win over JSON to avoid double-triggering.
- **Suppression:** `sanitizeStreaming(text)` strips completed directives and
  hides any in-progress directive (unterminated `[[…` tail or a JSON payload)
  so raw command syntax never flashes in the chat window.
- **Dispatch + fallback:** `actionRouter.dispatch(invocation)` runs the handler
  and **always** resolves to a typed `ActionResult` — unknown actions and
  handler errors fall through to a notice. The terminal renders every result as
  **"⚡ System Action Triggered: \<label\>"** (emerald when ok, amber otherwise).
- The terminal intercepts directives from the engine reply, suppresses the raw
  text, finalizes the assistant bubble with the cleaned prose (dropping it if
  the reply was a pure command), then dispatches each action and appends notices.

---

## Design system — "Void Black" (`constants/vexsoraTheme.ts`)

| Token | Value | Used for |
|-------|-------|----------|
| `void` | `#000000` | Pure black background |
| `violet` | `#8A2BE2` | System / human actions (send, prompt, controls) |
| `emerald` | `#00FF7F` | **Active AI states** — engine live, thinking, output |
| `danger` | `#FF4D6D` | Offline / diagnostic states |

The terminal uses a per-platform monospace stack (`MonoFont`) for the terminal
aesthetic, neon glow shadows (`VexsoraGlow`), and a smooth-scrolling `FlatList`
that auto-scrolls to the latest line.

---

## Build & run commands

```bash
npm install            # install dependencies

npm run dev            # start the Expo dev server (Metro)
npm run build:web      # export the web build (expo export --platform web)
npm run lint           # expo lint
npm run typecheck      # tsc --noEmit  (currently passes with 0 errors)
```

> The app boots from `index.js` → `App.tsx` (a single root component). It does
> **not** use a router for the core terminal experience.

### Running against the local engine

The terminal expects an OpenAI-compatible server listening on
`127.0.0.1:8080`. Start your on-device engine first; otherwise the UI shows the
"initialize the local engine" diagnostic and a re-probe button. Tap the status
pill or the re-probe button to re-check liveness.

---

## Conventions

- TypeScript strict mode is on; keep `npm run typecheck` clean.
- Keep transport concerns inside `lib/vexsoraClient.ts`; keep view concerns
  inside `components/`. Don't call `fetch` from a component.
- No cloud-dependent packages — Vexsora stays fully offline-first.

---

## Legacy

The `app/`, `lib/aiService.ts`, and other `lib/*` files are from the prior
`expo-router` starter and are **not** part of the Vexsora entry path. They are
no longer bundled (the entry is `index.js`) and can be removed when convenient.
