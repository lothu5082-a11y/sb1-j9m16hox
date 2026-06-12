import type { Metadata, Viewport } from "next";
import "./globals.css";
import PwaRegister from "@/components/PwaRegister";

export const metadata: Metadata = {
  title: "ShopBook — Daily Sales & Expenses",
  description: "The simple digital notebook for your shop. Log sales and expenses in seconds.",
  applicationName: "ShopBook",
  manifest: "/manifest.webmanifest",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "ShopBook",
  },
  icons: {
    icon: "/favicon.png",
    apple: "/icons/apple-touch-icon.png",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  viewportFit: "cover",
  themeColor: "#2563eb",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        {/* Phone-width column centered on larger screens. */}
        <div className="mx-auto min-h-screen w-full max-w-md bg-gray-50">{children}</div>
        <PwaRegister />
      </body>
    </html>
  );
}
