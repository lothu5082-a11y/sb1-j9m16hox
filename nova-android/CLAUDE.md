# Nova Android — Project Conventions

## Key commands

```bash
cd nova-android
./gradlew assembleDebug          # build debug APK
./gradlew assembleRelease        # build release APK
./gradlew lint                   # run lint
./gradlew test                   # unit tests
./gradlew connectedAndroidTest   # instrumented tests (device required)
```

APK output: `app/build/outputs/apk/debug/app-debug.apk`

## Tech stack

- Kotlin + Jetpack Compose + Material 3
- Gradle Kotlin DSL, AGP 8.3.2, Gradle 8.7, JDK 17
- minSdk 26 / targetSdk 34
- OkHttp for networking, kotlinx.serialization for JSON
- Room (chat history), DataStore Preferences (settings)
- Android SpeechRecognizer + TextToSpeech for voice

## Architecture

```
NovaApp (Application) — manual DI, holds singletons
  ├── SettingsRepository ← DataStore Preferences
  ├── ChatRepository ← Room (ChatDao) + OpenRouterClient
  └── OpenRouterClient ← OkHttp

UI layer (Compose):
  NavGraph → ChatScreen / SettingsScreen
  Each screen has a ViewModel wired via ViewModelFactory
```

## Layer rules

- ViewModels call repositories only — no direct DB or HTTP calls
- Repositories call data sources only — no Android framework imports
- All network is in `data/remote/`, all persistence in `data/local/`
- Never put API keys in source; always read from DataStore at runtime
- No cloud dependencies — networking goes to openrouter.ai only

## No secrets policy

API keys are entered at runtime and stored in DataStore. They never appear in source code, build files, or logs.

## Adding a new screen

1. Create `ui/yourscreen/YourScreen.kt` + `YourViewModel.kt`
2. Add a `ViewModelFactory` class in the same file
3. Add the route to `ui/navigation/NavGraph.kt`

## Phase roadmap

- **Phase 1** (current): Chat UI, OpenRouter online brain, voice, history, CI pipeline
- **Phase 2**: MediaPipe on-device LLM, brain selector (Online/Offline/Auto)
- **Phase 3**: Agent actions via Android Intents (alarms, SMS, calendar, apps)
- **Phase 4**: VoiceInteractionService — set Nova as default assistant
