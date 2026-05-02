#!/usr/bin/env node
/**
 * Generate the 6 PWA icon SVGs with the brand wordmark rendered as
 * outlined SVG paths (vector glyphs, no @font-face). This is the only
 * way to guarantee the font renders identically in:
 *   - the browser <img src="*.svg">
 *   - sharp/librsvg PNG rasterisation (some librsvg versions don't honor
 *     @font-face inside SVG)
 *   - iOS home-screen icon rendering (uses the PNG, but we want parity)
 *
 *   1. node scripts/build-pwa-svgs.mjs       # writes the 6 SVGs
 *   2. node scripts/generate-pwa-icons.mjs   # rasterises to PNG
 *
 * Anton TTF is read from /tmp/anton-fetch/anton.ttf — re-fetch with the
 * curl in the project README if missing.
 */

import { readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import opentype from "opentype.js";

const TTF_PATH = "/tmp/anton-fetch/anton.ttf";
let antonFont;
try {
  antonFont = opentype.parse(readFileSync(TTF_PATH).buffer);
} catch (e) {
  console.error(`Could not load Anton TTF at ${TTF_PATH}: ${e.message}`);
  console.error("Re-fetch with the curl chain in the README.");
  process.exit(1);
}

// Brand colours — match tailwind.config.ts.
const ROYAL = "#003594";
const SOL   = "#FFA300";
const INK   = "#0A0A0A";
const BONE  = "#FAFAF7";

// Helvetica-style sans isn't always available either, so the PRO badge
// is also outlined via Anton (compressed but legible at icon scale).
function textPath(text, x, y, fontSize, fill) {
  // opentype.getPath returns a Path object that knows how to emit SVG d=.
  // Anchor at (x,y) is the LEFT baseline. We compute the actual width and
  // shift x so the text is centred.
  const width = antonFont.getAdvanceWidth(text, fontSize);
  const path = antonFont.getPath(text, x - width / 2, y, fontSize);
  return `<path d="${path.toPathData(2)}" fill="${fill}"/>`;
}

function customer({ size, fontSize, lineY, lineHalfW, strokeW }) {
  const cx = size / 2;
  const cy = size / 2;
  // Anton's cap-height ≈ 0.72 of fontSize. Centring the wordmark vertically
  // means the baseline sits at cy + capHeight*0.5.
  const baselineY = cy + fontSize * 0.36;
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${size} ${size}"><rect width="${size}" height="${size}" fill="${ROYAL}"/>${textPath("SHEEN", cx, baselineY, fontSize, BONE)}<line x1="${cx - lineHalfW}" y1="${lineY}" x2="${cx + lineHalfW}" y2="${lineY}" stroke="${SOL}" stroke-width="${strokeW}" stroke-linecap="square"/></svg>\n`;
}

function washer({ size, fontSize, lineY, lineHalfW, strokeW, proSize, proY }) {
  const cx = size / 2;
  const cy = size / 2;
  // Wordmark sits a touch higher to leave room for the PRO badge.
  const baselineY = cy + fontSize * 0.18;
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${size} ${size}"><rect width="${size}" height="${size}" fill="${INK}"/>${textPath("SHEEN", cx, baselineY, fontSize, SOL)}<line x1="${cx - lineHalfW}" y1="${lineY}" x2="${cx + lineHalfW}" y2="${lineY}" stroke="${BONE}" stroke-width="${strokeW}" stroke-linecap="square"/>${textPath("PRO", cx, proY, proSize, BONE)}</svg>\n`;
}

const ICONS_DIR = resolve(process.cwd(), "public/icons");

// Layout sizes hand-tuned so the wordmark sits inside the iOS rounded-corner
// mask AND the Android maskable safe-zone circle.
const SET = [
  { name: "customer-192.svg",       fn: customer, args: { size: 192, fontSize: 56,  lineY: 130, lineHalfW: 32, strokeW: 3 } },
  { name: "customer-512.svg",       fn: customer, args: { size: 512, fontSize: 150, lineY: 350, lineHalfW: 88, strokeW: 7 } },
  { name: "customer-maskable.svg",  fn: customer, args: { size: 512, fontSize: 124, lineY: 332, lineHalfW: 60, strokeW: 6 } },
  { name: "washer-192.svg",         fn: washer,   args: { size: 192, fontSize: 50,  lineY: 116, lineHalfW: 30, strokeW: 2.5, proSize: 18, proY: 148 } },
  { name: "washer-512.svg",         fn: washer,   args: { size: 512, fontSize: 130, lineY: 308, lineHalfW: 68, strokeW: 6,   proSize: 50, proY: 392 } },
  { name: "washer-maskable.svg",    fn: washer,   args: { size: 512, fontSize: 110, lineY: 290, lineHalfW: 56, strokeW: 5,   proSize: 42, proY: 354 } },
];

console.log(`Outlining wordmarks via opentype.js → 6 SVGs in ${ICONS_DIR}`);
for (const { name, fn, args } of SET) {
  const svg = fn(args);
  writeFileSync(resolve(ICONS_DIR, name), svg);
  console.log(`  ✓ ${name.padEnd(26)} ${svg.length} bytes`);
}
console.log("Done. Re-rasterise PNGs with: node scripts/generate-pwa-icons.mjs");
