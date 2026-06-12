import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "ShopBook — Daily Sales & Expenses",
  description: "The simple digital notebook for your shop. Log sales and expenses in seconds.",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  themeColor: "#2563eb",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        {/* Phone-width column centered on larger screens. */}
        <div className="mx-auto min-h-screen w-full max-w-md bg-gray-50">{children}</div>
      </body>
    </html>
  );
}
