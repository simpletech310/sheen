#!/usr/bin/env node
/**
 * Per-namespace translation seeder. Solves the truncation problem in
 * scripts/i18n-translate.ts: translating all 500 keys in one call hits
 * Sonnet's max_tokens limit for verbose languages (Chinese, Vietnamese
 * Cyrillic-equivalent, Russian). This script translates one top-level
 * namespace per API call so each request fits comfortably under the limit.
 *
 * Strategy:
 * 1. Load en.json. Walk top-level namespaces (common, nav, footer, ...).
 * 2. For each missing or still-English namespace per target locale, send
 *    just that namespace to Claude.
 * 3. Splice the translated namespace back into the locale file.
 *
 * Run:
 *   ANTHROPIC_API_KEY=sk-ant-... node scripts/i18n-translate-namespaces.mjs [locale]
 *
 * If a locale arg is given, only that one is processed. Otherwise all 7.
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

async function translateNamespace(ns, target) {
  const prompt = `You are a professional translator working on a car-wash app called Sheen, based in Los Angeles.

Translate every string value in this JSON object from English to ${LOCALE_NAMES[target]}.

Rules:
- Keep the JSON keys and structure exactly the same. Translate ONLY string values (and string elements inside arrays).
- Preserve placeholders like {language}, {name}, {amount}, {count} verbatim — do not translate them.
- Preserve emoji, numbers, currency symbols, dollar amounts, percentages, and URLs verbatim.
- Match a casual + confident tone. Short, direct, no fluff. Headlines stay punchy and bold.
- Brand terms stay in English: "Sheen", "Sheen+", "Sheen Pro", "Sheen+ Basic", "Sheen+ Pro", any "@handle".
- Service-tier brand names stay in English: "Express", "Full Detail", "Premium", "Showroom", "Big Rig", "Rig Rinse", "Trailer Wash", "Full Rig Detail", "Showroom Rig", "Rig Solo", "Rig Pro".
- UI verbs/labels ("Book", "Sign in", "Save") use the natural ${LOCALE_NAMES[target]} equivalent that an app user would expect.
- Industry-standard technical terms (e.g. "DOT", "GL insurance", "VIN") may stay in English where there's no widely-used local term.

Output ONLY the translated JSON, no preamble, no markdown fences, no commentary.

Source:
${JSON.stringify(ns, null, 2)}`;

  const res = await client.messages.create({
    model: "claude-sonnet-4-5",
    max_tokens: 8000, // single namespace fits comfortably
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

// A namespace is "still English" if more than 1/3 of its strings match the
// English source verbatim — heuristic for "this got skipped on the last run."
function leafCount(node) {
  if (typeof node === "string") return 1;
  if (Array.isArray(node)) return node.reduce((a, n) => a + leafCount(n), 0);
  if (node && typeof node === "object") {
    return Object.values(node).reduce((a, v) => a + leafCount(v), 0);
  }
  return 0;
}

function sameAsEnglish(a, b) {
  if (typeof a === "string" && typeof b === "string") return a === b;
  if (Array.isArray(a) && Array.isArray(b)) {
    return a.length === b.length && a.every((v, i) => sameAsEnglish(v, b[i]));
  }
  if (a && b && typeof a === "object" && typeof b === "object") {
    const ks = Object.keys(a);
    return ks.every((k) => sameAsEnglish(a[k], b[k]));
  }
  return false;
}

function englishMatchCount(target, source) {
  if (typeof source === "string") return target === source ? 1 : 0;
  if (Array.isArray(source)) {
    return source.reduce((a, v, i) => a + englishMatchCount(target?.[i], v), 0);
  }
  if (source && typeof source === "object") {
    return Object.entries(source).reduce(
      (a, [k, v]) => a + englishMatchCount(target?.[k], v),
      0
    );
  }
  return 0;
}

const onlyLocale = process.argv[2];
const targets = onlyLocale ? [onlyLocale] : LOCALES;

for (const loc of targets) {
  const path = resolve(MSG, `${loc}.json`);
  const cur = JSON.parse(readFileSync(path, "utf8"));
  console.log(`\n=== ${loc} (${LOCALE_NAMES[loc]}) ===`);

  for (const namespace of Object.keys(en)) {
    const total = leafCount(en[namespace]);
    const enMatches = englishMatchCount(cur[namespace], en[namespace]);
    const ratio = total > 0 ? enMatches / total : 0;

    // Translate if more than 30% of leaves still match English. Brand-term
    // ratios are lower in practice — anything above 30% is a sign the
    // namespace got skipped on the last run.
    if (ratio < 0.3) {
      console.log(`  ${namespace}: ${enMatches}/${total} match-en (${(ratio*100).toFixed(0)}%) — skip`);
      continue;
    }

    process.stdout.write(`  ${namespace}: ${enMatches}/${total} match-en (${(ratio*100).toFixed(0)}%) — translating … `);
    try {
      const translated = await translateNamespace(en[namespace], loc);
      cur[namespace] = translated;
      writeFileSync(path, JSON.stringify(cur, null, 2) + "\n");
      console.log("ok");
    } catch (e) {
      console.log(`FAILED: ${e.message}`);
    }
  }
}

console.log("\nDone.");
