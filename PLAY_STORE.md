# Publishing ShopBook to the Google Play Store

ShopBook ships in two layers:

1. **A web app (PWA)** — already installable on any phone via the browser's
   "Install app" prompt. This is the fastest way to get it on a home screen.
2. **A native Android app** — a Capacitor shell around the deployed web app,
   packaged as a signed `.aab` (Android App Bundle) for the Play Store.

This guide takes you from zero to a published Play Store listing. The parts only
you can do (your Google account, your signing key) are called out clearly — the
repo has everything else ready.

---

## Overview of the pipeline

```
 your code ──▶ deploy web app (Vercel) ──▶ public HTTPS URL
                                              │
        GitHub Actions "Android Release" ◀────┘
                     │  (uses your signing key from GitHub Secrets)
                     ▼
            app-release.aab  ──▶  upload to Google Play Console
```

---

## Step 1 — Deploy the web app

The Android app loads your live site, so deploy it first.

1. Push this repo to GitHub (already done if you're reading this there).
2. Go to [vercel.com](https://vercel.com) → **New Project** → import this repo.
3. Add the two environment variables (from your Supabase project → Settings → API):
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
4. Deploy. Note the URL, e.g. `https://shopbook.vercel.app`.

> Any host that runs Next.js works (Netlify, Render, your own server). Vercel is
> the simplest.

Confirm the PWA works: open the URL on an Android phone in Chrome → menu →
**Install app**. It should add a ShopBook icon to your home screen. 🎉

---

## Step 2 — Create your Android signing key (one time)

Google Play apps must be signed. You create an **upload key** once and reuse it
forever (losing it means you can't update the app, so back it up).

On your computer (needs the JDK, which you already have if you installed
Android Studio):

```bash
keytool -genkey -v \
  -keystore shopbook-upload.keystore \
  -alias shopbook \
  -keyalg RSA -keysize 2048 -validity 10000
```

It asks for a **keystore password**, a **key password**, and your name/org.
Remember these — you'll need them in the next step. Keep the
`shopbook-upload.keystore` file somewhere safe and private (never commit it).

---

## Step 3 — Add the signing secrets to GitHub

In your GitHub repo → **Settings → Secrets and variables → Actions → New
repository secret**, add these four:

| Secret name                 | Value                                                              |
| --------------------------- | ----------------------------------------------------------------- |
| `ANDROID_KEYSTORE_BASE64`   | The keystore file, base64-encoded (command below)                 |
| `ANDROID_KEYSTORE_PASSWORD` | The keystore password you chose                                   |
| `ANDROID_KEY_ALIAS`         | `shopbook`                                                         |
| `ANDROID_KEY_PASSWORD`      | The key password you chose                                        |

To base64-encode the keystore:

```bash
# macOS / Linux
base64 -i shopbook-upload.keystore | tr -d '\n' > keystore.base64.txt
```

Copy the contents of `keystore.base64.txt` into `ANDROID_KEYSTORE_BASE64`.

---

## Step 4 — Build the signed AAB

1. In GitHub → **Actions** → **Android Release (AAB)** → **Run workflow**.
2. Enter your deployed URL from Step 1 (e.g. `https://shopbook.vercel.app`).
3. When it finishes, download the **`shopbook-release-aab`** artifact. Inside is
   `app-release.aab`.

> Prefer to build locally? Install Android Studio, then:
> ```bash
> CAP_SERVER_URL=https://shopbook.vercel.app npx cap sync android
> ANDROID_KEYSTORE_FILE=$PWD/shopbook-upload.keystore \
> ANDROID_KEYSTORE_PASSWORD=... ANDROID_KEY_ALIAS=shopbook ANDROID_KEY_PASSWORD=... \
> (cd android && ./gradlew bundleRelease)
> ```
> The AAB lands in `android/app/build/outputs/bundle/release/app-release.aab`.

---

## Step 5 — Create the Play Store listing

1. Sign up for a [Google Play Developer account](https://play.google.com/console)
   (one-time **$25** fee). This is the part only you can do.
2. **Create app** → name **ShopBook**, type **App**, **Free**.
3. Fill in the required listing content:
   - **App icon (512×512):** use `public/icons/icon-1024.png` (resize to 512) or
     `public/icons/icon-512.png`.
   - **Feature graphic (1024×500):** make a simple banner with the logo.
   - **Short & full description:** see the suggested copy below.
   - **Screenshots:** open the app on a phone and capture the Dashboard, Quick
     Add, and Settings screens (2–8 phone screenshots required).
   - Complete **Content rating**, **Data safety**, **Privacy policy** (you must
     host a privacy policy URL — a simple page stating you store the user's email
     and their sales/expense entries in Supabase is enough), and **Target
     audience**.
4. **Production → Create new release** → upload `app-release.aab`.
5. Roll out. First reviews typically take a few days.

### Suggested listing copy

> **Short description:** Replace your paper notebook — track daily sales and
> expenses in seconds.
>
> **Full description:** ShopBook is the simple digital notebook for small shops.
> Record a sale or an expense in under 10 seconds with big, clear buttons. See
> your profit for today, this week and this month at a glance. Choose your local
> currency. Your data is private and synced securely so you can sign in from any
> phone.

---

## App identity reference

| Field         | Value             | Where to change                              |
| ------------- | ----------------- | -------------------------------------------- |
| Package name  | `com.shopbook.app`| `capacitor.config.ts` + `android/app/build.gradle` |
| Version name  | `1.0`             | `android/app/build.gradle` (`versionName`)   |
| Version code  | `1`               | `android/app/build.gradle` (`versionCode`)   |

**For every Play update**, bump `versionCode` (must increase) and usually
`versionName`, then re-run the workflow.

---

## Notes & upgrade path

- This Android build is a **managed WebView** that loads your deployed PWA — the
  standard Capacitor remote-URL pattern. It needs a network connection on first
  load; the PWA service worker then caches the shell for limited offline use.
- To make a **fully offline** native build later, switch the app to Next.js
  static export (`output: 'export'`) and set Capacitor's `webDir` to the
  exported `out/` folder instead of using `server.url`. That requires moving the
  pages to client-side rendering (no `middleware.ts` / server components).
- Don't have a Mac? Everything above runs on the GitHub Actions CI — you never
  need Xcode/Android Studio locally to ship the Android app.
