import type { MetadataRoute } from "next";

// Web App Manifest — makes ShopBook installable on Android/iOS home screens
// and is the basis for the Trusted Web Activity (Play Store) build.
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "ShopBook — Sales & Expenses",
    short_name: "ShopBook",
    description: "The simple digital notebook for your shop. Log sales and expenses in seconds.",
    start_url: "/",
    scope: "/",
    display: "standalone",
    orientation: "portrait",
    background_color: "#f9fafb",
    theme_color: "#2563eb",
    categories: ["business", "finance", "productivity"],
    icons: [
      { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/icons/icon-maskable-192.png", sizes: "192x192", type: "image/png", purpose: "maskable" },
      { src: "/icons/icon-maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
