# Vexsora — Private On-Device AI Assistant

Vexsora is a mobile AI assistant that runs a **real AI model fully offline on your
phone** — no internet, no cloud, fully private. It has a Gemini/GPT-style chat UI
and Siri-style voice (talk to it, it talks back, and it can run device actions).

## How the offline AI works

- The "On-Device" brain runs a small **GGUF language model** locally using
  [`llama.rn`](https://github.com/mybigday/llama.rn) (llama.cpp for React Native).
- You download a model **once** (in Settings → Brain Engine → On-Device), then it
  answers with no network connection.
- Voice in (speech→text) uses `expo-speech-recognition`; voice out (text→speech)
  uses `expo-speech`.

### Models you can download

| Model | Size | Best for |
|-------|------|----------|
| Llama 3.2 1B | ~0.7 GB | Fastest, low-RAM phones |
| Qwen 2.5 1.5B | ~1.1 GB | Smartest small model |
| Gemma 2 2B | ~1.6 GB | Balanced quality |

> A phone with **4 GB+ RAM** is recommended. Bigger models = smarter but slower.

## Important: offline AI needs the installed Android app

The on-device model **cannot** run in the web preview or in Expo Go — it needs the
native module compiled into a real app. Build an APK with EAS:

```bash
npm install
npx expo login            # one time
npx eas build -p android --profile preview   # produces an installable APK
```

Install the resulting APK on your Android phone, open Settings → On-Device,
download a model, tap **Activate**, then chat — fully offline.

### Run locally for development (native)

```bash
npx expo prebuild        # generates the native android/ project
npx expo run:android     # build + install a dev build on a connected device
```

## Web preview

`npm run dev` (or the web build) runs the UI everywhere, but the **On-Device**
brain is disabled on web. On web you can still use a cloud provider (OpenAI /
Gemini / Claude / Groq) by entering an API key in Settings — note that cloud mode
is **not** offline or private.

## Scripts

- `npm run dev` — Expo dev server
- `npm run build:web` — export the web bundle
- `npm run typecheck` — TypeScript check
