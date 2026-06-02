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
                  │  (imports only the client + theme)
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
| Theme | `constants/vexsoraTheme.ts` | The "Void Black" design tokens (colors, spacing, radii, glows, mono font). |

### Why the UI is decoupled from transport

`VexsoraTerminal` imports `vexsoraClient` and the theme — nothing else
network-related. It never sees `fetch`, URLs, or HTTP status codes. This keeps
the surface easy to test and lets transport evolve (streaming, auth, a
different local port) without touching the UI.

---

## Local API client (`lib/vexsoraClient.ts`)

- **Endpoint:** `http://127.0.0.1:8080/v1/chat/completions` (device loopback).
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
