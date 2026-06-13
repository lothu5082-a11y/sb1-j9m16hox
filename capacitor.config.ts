import type { CapacitorConfig } from "@capacitor/cli";

// The Android app is a thin native shell around the deployed ShopBook PWA.
// Point it at your live HTTPS deployment (e.g. your Vercel URL).
//
//   • Set CAP_SERVER_URL in the environment before `npx cap sync`
//     (the GitHub Actions release workflow injects it), OR
//   • hard-code `server.url` below.
//
// When no URL is configured the app loads the local placeholder in
// `cap-shell/` which simply explains how to set it.
const serverUrl = process.env.CAP_SERVER_URL?.trim();

const config: CapacitorConfig = {
  appId: "com.shopbook.app",
  appName: "ShopBook",
  webDir: "cap-shell",
  backgroundColor: "#f9fafb",
  android: {
    backgroundColor: "#f9fafb",
  },
  ...(serverUrl
    ? {
        server: {
          url: serverUrl,
          androidScheme: "https",
        },
      }
    : {}),
};

export default config;
