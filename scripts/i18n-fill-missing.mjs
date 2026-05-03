#!/usr/bin/env node
/**
 * Walk en.json and copy any missing keys into each locale file with the
 * English value as a placeholder. After this runs, the
 * i18n-translate-deltas.mjs script will see those keys as
 * English-identical and translate them in the next pass.
 *
 * Run:
 *   node scripts/i18n-fill-missing.mjs
 */

import { readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";

const LOCALES = ["es", "ko", "zh", "vi", "pt", "fr", "ru"];
const ROOT = resolve(new URL(".", import.meta.url).pathname, "..");
const MSG = resolve(ROOT, "messages");

const en = JSON.parse(readFileSync(resolve(MSG, "en.json"), "utf8"));

function fillMissing(target, source) {
  let added = 0;
  if (Array.isArray(source)) {
    for (let i = 0; i < source.length; i++) {
      if (target[i] === undefined) {
        target[i] = JSON.parse(JSON.stringify(source[i]));
        added++;
      } else if (typeof source[i] === "object" && source[i] !== null) {
        added += fillMissing(target[i], source[i]);
      }
    }
    return added;
  }
  if (source && typeof source === "object") {
    for (const [k, v] of Object.entries(source)) {
      if (!(k in target)) {
        target[k] = JSON.parse(JSON.stringify(v));
        added++;
      } else if (typeof v === "object" && v !== null) {
        if (typeof target[k] !== "object" || target[k] === null) {
          target[k] = Array.isArray(v) ? [] : {};
        }
        added += fillMissing(target[k], v);
      }
    }
  }
  return added;
}

for (const loc of LOCALES) {
  const path = resolve(MSG, `${loc}.json`);
  const cur = JSON.parse(readFileSync(path, "utf8"));
  const added = fillMissing(cur, en);
  if (added > 0) {
    writeFileSync(path, JSON.stringify(cur, null, 2) + "\n");
    console.log(`${loc}: filled ${added} missing keys`);
  } else {
    console.log(`${loc}: complete`);
  }
}
