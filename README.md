# Nova — AI Assistant for Android

Nova is a hybrid offline/online AI assistant app for Android, built with Kotlin and Jetpack Compose.

---

## How to get the APK on your phone (no computer needed)

### Step 1 — Trigger a build

The APK is built automatically by GitHub Actions every time code is pushed. You can also start a build manually:

1. Open this repository on your phone's browser
2. Tap the **Actions** tab at the top
3. In the left sidebar, tap **Nova Android — Build Debug APK**
4. Tap the **Run workflow** button (top right of the workflow list)
5. Tap the green **Run workflow** button in the dropdown

### Step 2 — Download the APK

1. Wait ~5–10 minutes for the build to go green (✅)
2. Tap the completed run to open it
3. Scroll down to **Artifacts**
4. Tap **nova-apk** — it downloads as a `.zip` file

### Step 3 — Install the APK

1. Open your phone's **Files** app and find the downloaded `.zip`
2. Extract it — you'll see `app-debug.apk` inside
3. Tap the APK file
4. If prompted, go to **Settings → Apps → Special app access → Install unknown apps** and allow your browser or Files app
5. Tap **Install** and then **Open**

### Step 4 — Set up Nova

1. Tap the **Settings** (⚙) icon in the top-right corner
2. Enter your **OpenRouter API key** (get a free one at openrouter.ai/keys)
3. The default model `meta-llama/llama-3.1-8b-instruct:free` is free — no changes needed
4. Tap **Save Key** and go back to chat

---

## Features (Phase 1)

- Dark-themed chat UI with message bubbles
- Powered by OpenRouter (OpenAI-compatible API, free models available)
- Voice input via microphone button
- Text-to-speech replies (toggle in Settings)
- Chat history saved on device, reloaded on launch
- Friendly error messages for bad keys, no network, etc.

---

## Build it yourself

```bash
cd nova-android
./gradlew assembleDebug
# APK: app/build/outputs/apk/debug/app-debug.apk
```

Requires JDK 17 and Android SDK (API 34).
