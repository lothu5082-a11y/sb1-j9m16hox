import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // High-contrast, friendly palette for fast scanning in any light.
        sale: {
          DEFAULT: "#16a34a", // green-600 — money in
          soft: "#dcfce7",
        },
        expense: {
          DEFAULT: "#dc2626", // red-600 — money out
          soft: "#fee2e2",
        },
        brand: {
          DEFAULT: "#2563eb", // blue-600 — primary actions
          dark: "#1d4ed8",
        },
      },
      fontFamily: {
        sans: ["system-ui", "-apple-system", "Segoe UI", "Roboto", "sans-serif"],
      },
    },
  },
  plugins: [],
};

export default config;
