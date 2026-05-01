#!/usr/bin/env node
/**
 * Renders the SVG icon set into raster PNGs for surfaces that don't accept
 * SVG (notably Safari's apple-touch-icon and Apple's home-screen splash).
 *
 *   node scripts/generate-pwa-icons.mjs
 *
 * Idempotent — overwrites existing PNGs each run. Re-run any time the SVG
 * source changes.
 */

import { readFileSync } from "node:fs";
import { writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import sharp from "sharp";

const ICONS_DIR = resolve(process.cwd(), "public/icons");

// (sourceSvg, outputPng, size). Apple's recommended apple-touch-icon is 180x180;
// the 512 PNG fallback exists for any odd renderer that wants raster-only.
const RENDERS = [
  ["customer-512.svg", "customer-apple-touch.png", 180],
  ["customer-512.svg", "customer-512.png",         512],
  ["customer-192.svg", "customer-192.png",         192],
  ["washer-512.svg",   "washer-apple-touch.png",   180],
  ["washer-512.svg",   "washer-512.png",           512],
  ["washer-192.svg",   "washer-192.png",           192],
];

async function render(srcName, outName, size) {
  const src = readFileSync(resolve(ICONS_DIR, srcName));
  const png = await sharp(src, { density: 384 })
    .resize(size, size, { fit: "contain", background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .png({ compressionLevel: 9 })
    .toBuffer();
  await writeFile(resolve(ICONS_DIR, outName), png);
  console.log(`  ✓ ${outName.padEnd(28)} ${size}×${size}`);
}

async function main() {
  console.log("Rendering PWA icons →", ICONS_DIR);
  for (const [src, out, size] of RENDERS) {
    await render(src, out, size);
  }
  console.log("Done.");
}

main().catch((err) => {
  console.error("FAILED:", err);
  process.exit(1);
});
