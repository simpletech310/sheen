#!/usr/bin/env node
/**
 * Translate ONLY the keys that are still English-identical in each
 * locale. Targets the small-delta case where a few new keys were added
 * to an already-translated namespace — the namespace-threshold script
 * skips those because the namespace is mostly translated.
 *
 * Run:
 *   ANTHROPIC_API_KEY=... node scripts/i18n-translate-deltas.mjs [locale]
 */

import Anthropic from "@anthropic-ai/sdk";
import { readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";

const LOCALES = ["es", "ko", "zh", "vi", "pt", "fr", "ru"];
const LOCALE_NAMES = {
  es: "Spanish",
  ko: "Korean",
  zh: "Simplified Chinese",
  vi: "Vietnamese",
  pt: "Portuguese (Brazil)",
  fr: "French",
  ru: "Russian",
};

const ROOT = resolve(new URL(".", import.meta.url).pathname, "..");
const MSG = resolve(ROOT, "messages");

const client = new Anthropic();
const en = JSON.parse(readFileSync(resolve(MSG, "en.json"), "utf8"));

// Collect every (path, value) pair where the locale value === the
// English value AND the value is a string longer than a few chars
// (filters out brand terms, time units like "60 min", and short
// cognates that legitimately match English).
function findDeltas(target, source, path = "") {
  const deltas = [];
  if (typeof source === "string") {
    // Skip values that look like brand/cognate noise
    const isBrand = /^(Sheen|Big Rig|Express|Full Detail|Premium|Showroom|Stripe|GL insurance|DOT|VIN|Rig|Trailer Wash|Full Rig Detail|Rig Rinse|Rush)/.test(
      source
    );
    const isShort = source.length < 6;
    const isNumeric = /^[\d\s$%.,/+\-—–:]+$/.test(source);
    const isPlaceholder = /^\{[^}]+\}/.test(source.trim());
    if (
      target === source &&
      !isBrand &&
      !isShort &&
      !isNumeric &&
      !isPlaceholder
    ) {
      deltas.push([path, source]);
    }
    return deltas;
  }
  if (Array.isArray(source)) {
    source.forEach((v, i) => {
      deltas.push(...findDeltas(target?.[i], v, `${path}.${i}`));
    });
    return deltas;
  }
  if (source && typeof source === "object") {
    for (const [k, v] of Object.entries(source)) {
      deltas.push(...findDeltas(target?.[k], v, path ? `${path}.${k}` : k));
    }
  }
  return deltas;
}

// Set a value at a dotted/indexed path inside an object.
function setPath(obj, path, value) {
  const parts = path.split(".");
  let cur = obj;
  for (let i = 0; i < parts.length - 1; i++) {
    const k = parts[i];
    if (!(k in cur)) cur[k] = /^\d+$/.test(parts[i + 1]) ? [] : {};
    cur = cur[k];
  }
  cur[parts[parts.length - 1]] = value;
}

async function translateBatch(pairs, target) {
  const obj = Object.fromEntries(pairs);
  const prompt = `You are a professional translator working on a car-wash app called Sheen, based in Los Angeles.

Translate every string value in this JSON object from English to ${LOCALE_NAMES[target]}.

Rules:
- Keep the JSON keys exactly the same. Translate ONLY the string values.
- Preserve placeholders like {language}, {name}, {amount}, {count} verbatim.
- Preserve emoji, numbers, currency symbols, dollar amounts, percentages, and URLs verbatim.
- Match a casual + confident tone. Short, direct, no fluff.
- Brand terms stay in English: "Sheen", "Sheen+", "Sheen Pro", any "@handle".
- Service-tier brand names stay in English: "Express", "Full Detail", "Premium", "Showroom", "Big Rig", "Rig Rinse", "Trailer Wash", "Full Rig Detail", "Showroom Rig".
- Industry-standard technical terms (DOT, GL insurance, VIN, Stripe) may stay in English.

Output ONLY the translated JSON, no preamble, no markdown fences, no commentary.

Source:
${JSON.stringify(obj, null, 2)}`;

  const res = await client.messages.create({
    model: "claude-sonnet-4-5",
    max_tokens: 4000,
    messages: [{ role: "user", content: prompt }],
  });

  const text = res.content
    .filter((b) => b.type === "text")
    .map((b) => b.text)
    .join("")
    .trim()
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/\s*```$/i, "")
    .trim();

  return JSON.parse(text);
}

const onlyLocale = process.argv[2];
const targets = onlyLocale ? [onlyLocale] : LOCALES;

for (const loc of targets) {
  const path = resolve(MSG, `${loc}.json`);
  const cur = JSON.parse(readFileSync(path, "utf8"));
  const deltas = findDeltas(cur, en);
  if (deltas.length === 0) {
    console.log(`${loc}: nothing to do`);
    continue;
  }
  console.log(`\n=== ${loc} (${LOCALE_NAMES[loc]}) — ${deltas.length} keys ===`);
  for (const [p] of deltas) console.log(`  ${p}`);

  // Use compact path-keyed object so Claude returns the same paths back.
  // We'll un-flatten by writing each path back into cur.
  process.stdout.write(`  translating … `);
  try {
    const translated = await translateBatch(deltas, loc);
    for (const [p, v] of Object.entries(translated)) {
      setPath(cur, p, v);
    }
    writeFileSync(path, JSON.stringify(cur, null, 2) + "\n");
    console.log("ok");
  } catch (e) {
    console.log(`FAILED: ${e.message}`);
  }
}

console.log("\nDone.");
