#!/usr/bin/env node
/**
 * Generate the 6 PWA icon SVGs with the Anton font subset embedded as a
 * base64 @font-face. Browsers render the SVG with the real brand font,
 * and `sharp` (in scripts/generate-pwa-icons.mjs) picks it up the same
 * way, so the PNG outputs match the SVG previews exactly.
 *
 *   1. node scripts/build-pwa-svgs.mjs   # writes the 6 SVGs
 *   2. node scripts/generate-pwa-icons.mjs  # rasterises to PNG
 *
 * The Anton TTF is the Google Fonts subset for the characters we need
 * (S, H, E, N, P, R, O). Lives at /tmp/anton-fetch/anton.b64; if missing,
 * re-fetch with the curl in the project README.
 */

import { readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";

const B64_PATH = "/tmp/anton-fetch/anton.b64";
let antonB64 = "";
try {
  antonB64 = readFileSync(B64_PATH, "utf8").trim();
} catch {
  console.error(`Missing ${B64_PATH}. Re-fetch with:`);
  console.error(`  mkdir -p /tmp/anton-fetch && curl -sL 'https://fonts.googleapis.com/css2?family=Anton&text=SHEENPRO&display=swap' -A 'Mozilla/4.0' | grep -o 'https://fonts.gstatic.com[^)]*' | xargs -I{} curl -sL {} -o /tmp/anton-fetch/anton.ttf && base64 -i /tmp/anton-fetch/anton.ttf | tr -d '\\n' > /tmp/anton-fetch/anton.b64`);
  process.exit(1);
}

// Embedded `@font-face` rule. The `Anton` family name has to match the
// font-family attribute on the <text> elements below.
const FONT_DEFS = `<defs><style type="text/css"><![CDATA[
@font-face { font-family: 'Anton'; font-style: normal; font-weight: 400; src: url(data:font/truetype;base64,${antonB64}) format('truetype'); }
]]></style></defs>`;

// Brand colours — match tailwind.config.ts.
const ROYAL = "#003594";
const SOL   = "#FFA300";
const INK   = "#0A0A0A";
const BONE  = "#FAFAF7";

const ANTON_FAMILY = "Anton, Impact, 'Helvetica Neue Condensed Bold', 'Arial Narrow Bold', sans-serif";
const SANS_FAMILY  = "'Helvetica Neue', Arial, sans-serif";

// Single source of truth for layout per variant. Each entry produces a
// self-contained SVG with the font baked in.
function customer({ size, fontSize, lineY1, lineX1, lineX2, strokeW }) {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${size} ${size}">${FONT_DEFS}<rect width="${size}" height="${size}" fill="${ROYAL}"/><text x="${size/2}" y="${(size/2) + (fontSize*0.35)}" font-family="${ANTON_FAMILY}" font-size="${fontSize}" font-weight="400" fill="${BONE}" text-anchor="middle" letter-spacing="2">SHEEN</text><line x1="${lineX1}" y1="${lineY1}" x2="${lineX2}" y2="${lineY1}" stroke="${SOL}" stroke-width="${strokeW}" stroke-linecap="square"/></svg>\n`;
}

function washer({ size, fontSize, lineY1, lineX1, lineX2, strokeW, proSize, proY, proSpacing }) {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${size} ${size}">${FONT_DEFS}<rect width="${size}" height="${size}" fill="${INK}"/><text x="${size/2}" y="${(size/2) + (fontSize*0.18)}" font-family="${ANTON_FAMILY}" font-size="${fontSize}" font-weight="400" fill="${SOL}" text-anchor="middle" letter-spacing="2">SHEEN</text><line x1="${lineX1}" y1="${lineY1}" x2="${lineX2}" y2="${lineY1}" stroke="${BONE}" stroke-width="${strokeW}" stroke-linecap="square"/><text x="${size/2}" y="${proY}" font-family="${SANS_FAMILY}" font-size="${proSize}" font-weight="700" letter-spacing="${proSpacing}" fill="${BONE}" text-anchor="middle">PRO</text></svg>\n`;
}

const ICONS_DIR = resolve(process.cwd(), "public/icons");

// Layout sizes carefully sized so the wordmark sits inside the iOS
// rounded-corner mask AND the Android safe-zone circle (the maskable
// variants get tighter padding to survive an even more aggressive crop).
const SET = [
  // Customer
  { name: "customer-192.svg",       fn: customer, args: { size: 192, fontSize: 56, lineY1: 130, lineX1: 64, lineX2: 128, strokeW: 3 } },
  { name: "customer-512.svg",       fn: customer, args: { size: 512, fontSize: 150, lineY1: 350, lineX1: 168, lineX2: 344, strokeW: 7 } },
  { name: "customer-maskable.svg",  fn: customer, args: { size: 512, fontSize: 124, lineY1: 332, lineX1: 196, lineX2: 316, strokeW: 6 } },
  // Washer (PRO badge below)
  { name: "washer-192.svg",         fn: washer,   args: { size: 192, fontSize: 50, lineY1: 116, lineX1: 66, lineX2: 126, strokeW: 2.5, proSize: 17, proY: 144, proSpacing: 5 } },
  { name: "washer-512.svg",         fn: washer,   args: { size: 512, fontSize: 130, lineY1: 308, lineX1: 188, lineX2: 324, strokeW: 6, proSize: 46, proY: 384, proSpacing: 14 } },
  { name: "washer-maskable.svg",    fn: washer,   args: { size: 512, fontSize: 110, lineY1: 290, lineX1: 200, lineX2: 312, strokeW: 5, proSize: 38, proY: 348, proSpacing: 12 } },
];

console.log(`Embedding Anton (${(antonB64.length / 1024).toFixed(1)}KB base64) into 6 SVGs →`);
for (const { name, fn, args } of SET) {
  const svg = fn(args);
  writeFileSync(resolve(ICONS_DIR, name), svg);
  console.log(`  ✓ ${name.padEnd(26)} ${svg.length} bytes`);
}
console.log("Done. Re-rasterise PNGs with: node scripts/generate-pwa-icons.mjs");
