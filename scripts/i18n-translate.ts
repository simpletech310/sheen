/* eslint-disable no-console */
/**
 * One-shot translation seeder.
 *
 *   ANTHROPIC_API_KEY=sk-ant-... npx tsx scripts/i18n-translate.ts
 *
 * Reads messages/en.json (the source of truth), prompts Claude Sonnet
 * to translate the entire JSON tree key-for-key into each non-English
 * locale, and writes messages/{locale}.json. Output is checked into
 * git so production runtime never depends on Anthropic for static UI
 * copy. Re-run whenever en.json changes.
 *
 * Claude is instructed to keep keys + structure intact, only translate
 * leaf string values, and preserve placeholders like {language},
 * {amount}, ICU plurals.
 */
import Anthropic from "@anthropic-ai/sdk";
import { promises as fs } from "fs";
import path from "path";
import { LOCALES, LOCALE_ENGLISH_NAMES, type Locale } from "../i18n/locales";

const SRC_LOCALE: Locale = "en";
const OUT_DIR = path.join(process.cwd(), "messages");

async function translate(json: unknown, target: Locale): Promise<unknown> {
  const client = new Anthropic();
  const targetName = LOCALE_ENGLISH_NAMES[target];

  const prompt = `You are a professional translator working on a car-wash app called Sheen, based in Los Angeles.

Translate every string value in the following JSON from English to ${targetName}.

Hard rules:
- Keep the JSON structure and keys exactly the same. Translate ONLY the string values.
- Preserve placeholders like {language}, {name}, {count} verbatim — do not translate them.
- Preserve emoji, numbers, currency symbols, and URLs verbatim.
- Match the casual + confident tone of the source. Short, direct, no fluff.
- For brand terms ("Sheen", "Sheen+", "Sheen Pro", "@handle") — keep in English.
- For product terms ("Big rig", "Express", "Full Detail", "Premium", "Showroom") — keep in English; they're brand-defined service tiers.
- For UI verbs/labels ("Book", "Sign in", "Save"), use the natural ${targetName} equivalent that an app user would expect.

Output ONLY the translated JSON, no preamble, no markdown fences, no commentary.

Source JSON:
${JSON.stringify(json, null, 2)}`;

  const res = await client.messages.create({
    model: "claude-sonnet-4-5",
    max_tokens: 8000,
    messages: [{ role: "user", content: prompt }],
  });

  const text = res.content
    .filter((b): b is Anthropic.TextBlock => b.type === "text")
    .map((b) => b.text)
    .join("")
    .trim();

  // Strip any stray markdown fences just in case.
  const cleaned = text
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/\s*```$/i, "")
    .trim();

  return JSON.parse(cleaned);
}

async function main() {
  const sourcePath = path.join(OUT_DIR, `${SRC_LOCALE}.json`);
  const sourceRaw = await fs.readFile(sourcePath, "utf-8");
  const source = JSON.parse(sourceRaw);
  console.log(`Loaded ${sourcePath} — ${countStrings(source)} strings`);

  const targets = LOCALES.filter((l) => l !== SRC_LOCALE);
  for (const locale of targets) {
    const outPath = path.join(OUT_DIR, `${locale}.json`);
    process.stdout.write(`→ ${locale} … `);
    try {
      const translated = await translate(source, locale);
      await fs.writeFile(outPath, JSON.stringify(translated, null, 2) + "\n");
      console.log("ok");
    } catch (e: any) {
      console.log(`FAILED: ${e.message ?? e}`);
    }
  }
  console.log("Done.");
}

function countStrings(node: unknown): number {
  if (typeof node === "string") return 1;
  if (Array.isArray(node)) {
    return (node as unknown[]).reduce<number>((a, n) => a + countStrings(n), 0);
  }
  if (node && typeof node === "object") {
    return Object.values(node as Record<string, unknown>).reduce<number>(
      (a, v) => a + countStrings(v),
      0
    );
  }
  return 0;
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
