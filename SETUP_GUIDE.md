# Vexora AI — Phone-Only Setup Guide

**No PC or laptop needed.** Everything is done from your Android phone.

---

## How it works

1. GitHub automatically builds the app for you (it's already set up).
2. You download the app file (APK) straight to your phone.
3. You download the AI model file to your phone.
4. You open the app and select the model — done.

---

## Step 1 — Get the APK from GitHub

1. Open your phone's browser and go to your GitHub repository.
2. Tap the **Actions** tab (near the top of the page).
3. Tap the latest green build called **"Build APK"**.
4. Scroll to the bottom and tap **"VexoraAI-debug"** to download it.
5. The file `app-debug.apk` will save to your Downloads folder.

> **If you don't see a green build yet:** The build runs automatically when code is pushed.
> Wait 5–10 minutes and refresh the page. A green checkmark means it succeeded.

---

## Step 2 — Allow your phone to install the APK

Android blocks unknown apps by default. Do this once:

1. Open **Settings** on your phone.
2. Search for **"Install unknown apps"** or go to:
   **Settings → Apps → Special app access → Install unknown apps**
3. Find your browser (e.g., Chrome) and turn on **"Allow from this source"**.

---

## Step 3 — Install the APK

1. Open your **Downloads** folder (Files app → Downloads).
2. Tap **app-debug.apk**.
3. Tap **Install** when asked.
4. Tap **Open** when it finishes.

---

## Step 4 — Download the AI model file

The AI runs 100% offline — but you need to download the model file once.

1. Open your phone's browser.
2. Search for: **"gemma 2b mediapipe bin kaggle"**
3. Go to the Kaggle page and download the file  
   (it's about 1.5 GB — use Wi-Fi, not mobile data).
4. The `.bin` file will save to your Downloads folder.

> **No Kaggle account?** Search for **"gemma-2b-it-gpu-int4.bin huggingface"** as an alternative.

---

## Step 5 — Load the model into the app

1. Open the **Vexora AI** app on your phone.
2. You'll see a setup screen with a **"Choose Model File (.bin)"** button.
3. Tap the button — your phone's file picker opens.
4. Navigate to your **Downloads** folder.
5. Tap the `.bin` file you downloaded.
6. The app will copy it (may take 1–3 minutes for a large file).
7. The chat screen will open automatically when it's ready.

---

## Step 6 — Start chatting

- Type anything and tap **Send**.
- The first response may take 20–30 seconds (the AI is loading into memory).
- After that, responses are faster.
- Say **"open the camera"** → camera opens.
- Say **"open settings"** → device settings open.
- Everything works **100% offline** — no internet needed after setup.

---

## Troubleshooting

| Problem | Fix |
|---|---|
| No green build in Actions tab | Wait 10 minutes, then refresh. If it shows red, let me know. |
| "App not installed" error | Try again after enabling "Install unknown apps" (Step 2) |
| "Choose Model File" shows no Downloads folder | Tap the menu icon (≡) in the file picker and choose "Downloads" |
| App shows "Copy failed" | The file might be corrupted — re-download the model and try again |
| App crashes on open | Your Android version may be below 8.0 — check Settings → About phone |
| Response is very slow | Normal for first response. The model is large. Be patient. |

---

## Your privacy

Nothing leaves your phone. No internet connection is used after the model is loaded.
All AI processing happens on your device.
