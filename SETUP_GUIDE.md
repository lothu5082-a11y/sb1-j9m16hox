# Vexora AI — Offline Android App Setup Guide

This is your **step-by-step guide** to install and run the app on your Android phone.  
No coding knowledge needed — just follow each step in order.

---

## What you need (one-time installs)

| Tool | What it is | Download link |
|---|---|---|
| **Android Studio** | The program used to build Android apps | https://developer.android.com/studio |
| **Java 17** | Required by Android Studio (usually bundled with it) | Included with Android Studio |
| **A USB cable** | To connect your phone to your PC | Any USB-C or Micro-USB cable |

---

## Step 1 — Install Android Studio

1. Go to https://developer.android.com/studio and click **Download Android Studio**.
2. Run the installer and click **Next** on every screen (defaults are fine).
3. When Android Studio opens for the first time, let it finish downloading components (may take 10–20 minutes on first launch).

---

## Step 2 — Open the project

1. Open Android Studio.
2. Click **"Open"** (or "Open an Existing Project").
3. Navigate to the folder where you downloaded this repository, then go inside the **`android`** subfolder.
4. Click **OK / Open**. Android Studio will sync the project (a progress bar runs at the bottom). Wait for it to finish.

---

## Step 3 — Download the AI model

The app runs the AI **100% offline** — no internet when chatting. But you need to download the model file once.

1. Go to https://www.kaggle.com/models/google/gemma/frameworks/tfLite/variations/gemma-2b-it-gpu-int4  
   *(You may need a free Kaggle account.)*
2. Download the file — it will be named something like `gemma-2b-it-gpu-int4.bin` (about 1.5 GB).
3. Keep this file somewhere easy to find, like your Desktop.

> **Alternative smaller model:** If 1.5 GB is too large, search Kaggle or HuggingFace for `gemma-2b mediapipe bin` — any `.bin` file compatible with MediaPipe LlmInference will work.

---

## Step 4 — Enable Developer Mode on your Android phone

*(Skip if you already have Developer Options enabled.)*

1. Open **Settings** on your phone.
2. Scroll down to **"About phone"**.
3. Tap **"Build number"** seven times quickly. You'll see "You are now a developer!"
4. Go back to Settings → **Developer Options** → turn on **USB Debugging**.

---

## Step 5 — Connect your phone

1. Plug your phone into your PC with the USB cable.
2. On your phone, when asked "Allow USB debugging?" tap **Allow**.
3. In Android Studio, look at the top toolbar — your phone's name should appear in the dropdown (e.g., "Samsung Galaxy S23").

---

## Step 6 — Copy the model file to your phone

Open a **Command Prompt** (Windows) or **Terminal** (Mac/Linux) and run:

```
adb push YOUR_MODEL_FILE_PATH /data/data/com.vexora.aiassistant/files/model.bin
```

Replace `YOUR_MODEL_FILE_PATH` with the actual path to the `.bin` file you downloaded.

**Example on Windows:**
```
adb push C:\Users\YourName\Desktop\gemma-2b-it-gpu-int4.bin /data/data/com.vexora.aiassistant/files/model.bin
```

**Example on Mac:**
```
adb push /Users/YourName/Desktop/gemma-2b-it-gpu-int4.bin /data/data/com.vexora.aiassistant/files/model.bin
```

> `adb` is installed with Android Studio. If the command is not found, add Android Studio's `platform-tools` folder to your PATH, or navigate to it first:  
> Windows: `C:\Users\YourName\AppData\Local\Android\Sdk\platform-tools\adb.exe`  
> Mac: `~/Library/Android/sdk/platform-tools/adb`

---

## Step 7 — Build and install the app

1. In Android Studio, click the green **▶ Run** button (top toolbar).
2. Android Studio will build the app and install it on your phone automatically.
3. The app "Vexora AI" will open on your phone.

---

## Step 8 — Use the app

- **Type a message** in the box at the bottom and tap **Send**.
- The AI thinks locally on your phone — no internet needed.
- Say **"open the camera"** → the app opens your camera.
- Say **"open settings"** → the app opens device settings.
- The first response may take 10–30 seconds while the model loads into memory. After that it gets faster.

---

## Troubleshooting

| Problem | Fix |
|---|---|
| "Model file not found" message | You haven't pushed the model yet — repeat Step 6 |
| App crashes on launch | Your phone may be below Android 8 (API 26). Check Settings → About phone → Android version |
| `adb` command not found | See the path hint in Step 6 |
| Build fails in Android Studio | Click **File → Sync Project with Gradle Files**, wait, then try again |
| Phone not appearing in Android Studio | Make sure USB Debugging is on (Step 4) and try a different USB cable |

---

## Privacy note

Everything runs **100% on your device**. No messages, no model data, nothing leaves your phone.
