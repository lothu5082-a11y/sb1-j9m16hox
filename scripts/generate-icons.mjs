// Generates PWA / Play Store icons from an inline SVG using sharp.
// Run with: node scripts/generate-icons.mjs
import sharp from "sharp";
import { mkdir } from "node:fs/promises";

const OUT = new URL("../public/icons/", import.meta.url);
await mkdir(OUT, { recursive: true });

const BRAND = "#2563eb";

// A simple ledger/notebook mark on the brand background.
// `pad` controls the safe-zone padding (maskable icons need ~20%).
function svg(size, { maskable = false } = {}) {
  const pad = maskable ? size * 0.18 : size * 0.1;
  const inner = size - pad * 2;
  const x = pad;
  const y = pad;
  const r = inner * 0.16;
  // Three "entry lines" + a coin dot to suggest money records.
  const lineH = inner * 0.07;
  const lineX = x + inner * 0.2;
  const lineW = inner * 0.5;
  const l1 = y + inner * 0.3;
  const l2 = y + inner * 0.48;
  const l3 = y + inner * 0.66;
  return `
<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
  <rect width="${size}" height="${size}" fill="${maskable ? BRAND : "none"}"/>
  <rect x="${x}" y="${y}" width="${inner}" height="${inner}" rx="${r}" fill="${BRAND}"/>
  <rect x="${x + inner * 0.14}" y="${y}" width="${inner * 0.06}" height="${inner}" fill="#ffffff" opacity="0.35"/>
  <rect x="${lineX}" y="${l1}" width="${lineW}" height="${lineH}" rx="${lineH / 2}" fill="#ffffff"/>
  <rect x="${lineX}" y="${l2}" width="${lineW * 0.8}" height="${lineH}" rx="${lineH / 2}" fill="#ffffff" opacity="0.85"/>
  <rect x="${lineX}" y="${l3}" width="${lineW * 0.6}" height="${lineH}" rx="${lineH / 2}" fill="#ffffff" opacity="0.7"/>
  <circle cx="${x + inner * 0.8}" cy="${y + inner * 0.74}" r="${inner * 0.12}" fill="#16a34a"/>
</svg>`;
}

const jobs = [
  { name: "icon-192.png", size: 192 },
  { name: "icon-512.png", size: 512 },
  { name: "icon-maskable-192.png", size: 192, maskable: true },
  { name: "icon-maskable-512.png", size: 512, maskable: true },
  { name: "icon-1024.png", size: 1024, maskable: true }, // Play Store listing
  { name: "apple-touch-icon.png", size: 180 },
];

for (const { name, size, maskable } of jobs) {
  await sharp(Buffer.from(svg(size, { maskable })))
    .png()
    .toFile(new URL(name, OUT).pathname);
  console.log("wrote", name);
}

// A small favicon too.
await sharp(Buffer.from(svg(64)))
  .png()
  .toFile(new URL("../public/favicon.png", import.meta.url).pathname);
console.log("done");
