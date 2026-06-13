// Generates the source images that @capacitor/assets expands into Android
// launcher icons and splash screens. Run before `npx capacitor-assets generate`.
import sharp from "sharp";
import { mkdir } from "node:fs/promises";

const OUT = new URL("../assets/", import.meta.url);
await mkdir(OUT, { recursive: true });

const BRAND = "#2563eb";
const LIGHT = "#f9fafb";

function ledger(size, { bg = "none" } = {}) {
  const inner = size;
  const lineH = inner * 0.06;
  const lineX = inner * 0.3;
  const lineW = inner * 0.4;
  return `
<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
  <rect width="${size}" height="${size}" fill="${bg}"/>
  <rect x="${inner * 0.26}" y="${inner * 0.22}" width="${inner * 0.05}" height="${inner * 0.56}" fill="#fff" opacity="0.35"/>
  <rect x="${lineX}" y="${inner * 0.34}" width="${lineW}" height="${lineH}" rx="${lineH / 2}" fill="#fff"/>
  <rect x="${lineX}" y="${inner * 0.48}" width="${lineW * 0.8}" height="${lineH}" rx="${lineH / 2}" fill="#fff" opacity="0.85"/>
  <rect x="${lineX}" y="${inner * 0.62}" width="${lineW * 0.6}" height="${lineH}" rx="${lineH / 2}" fill="#fff" opacity="0.7"/>
  <circle cx="${inner * 0.68}" cy="${inner * 0.66}" r="${inner * 0.09}" fill="#16a34a"/>
</svg>`;
}

// Full icon (used for the legacy/square icon).
await sharp(Buffer.from(`
<svg xmlns="http://www.w3.org/2000/svg" width="1024" height="1024">
  <rect width="1024" height="1024" rx="180" fill="${BRAND}"/>
</svg>`))
  .composite([{ input: Buffer.from(ledger(1024)) }])
  .png()
  .toFile(new URL("icon-only.png", OUT).pathname);

// Adaptive-icon background (solid brand) and foreground (glyph, padded).
await sharp(Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="1024" height="1024"><rect width="1024" height="1024" fill="${BRAND}"/></svg>`))
  .png()
  .toFile(new URL("icon-background.png", OUT).pathname);

await sharp({ create: { width: 1024, height: 1024, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } } })
  .composite([{ input: Buffer.from(ledger(1024).replace('width="1024" height="1024"', 'width="700" height="700"')), top: 162, left: 162 }])
  .png()
  .toFile(new URL("icon-foreground.png", OUT).pathname);

// Splash screens (centered logo on a flat background).
function splashSvg(bg) {
  return `
<svg xmlns="http://www.w3.org/2000/svg" width="2732" height="2732">
  <rect width="2732" height="2732" fill="${bg}"/>
  <rect x="1106" y="1106" width="520" height="520" rx="110" fill="${BRAND}"/>
  ${ledger(520).replace('<svg xmlns="http://www.w3.org/2000/svg" width="520" height="520" viewBox="0 0 520 520">', '<g transform="translate(1106,1106)">').replace("</svg>", "</g>")}
</svg>`;
}
await sharp(Buffer.from(splashSvg(LIGHT))).png().toFile(new URL("splash.png", OUT).pathname);
await sharp(Buffer.from(splashSvg("#0b1220"))).png().toFile(new URL("splash-dark.png", OUT).pathname);

console.log("capacitor source assets generated");
