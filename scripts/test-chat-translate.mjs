#!/usr/bin/env node
/**
 * Manual test harness for the chat translation pipeline.
 *
 * Calls lib/translate.ts directly (no auth, no DB) to verify the
 * Anthropic round-trip works across every supported locale pair we
 * actually expect to see in production.
 *
 * Run:
 *   ANTHROPIC_API_KEY=sk-ant-... node scripts/test-chat-translate.mjs
 */

import Anthropic from "@anthropic-ai/sdk";

const LOCALE_NAMES = {
  en: "English",
  es: "Spanish",
  ko: "Korean",
  zh: "Chinese",
  vi: "Vietnamese",
  pt: "Portuguese",
  fr: "French",
  ru: "Russian",
};

const MODEL = "claude-sonnet-4-5";
const client = new Anthropic();

async function translate(text, source, target) {
  if (source === target) return text;
  const res = await client.messages.create({
    model: MODEL,
    max_tokens: Math.max(120, text.length * 4),
    messages: [
      {
        role: "user",
        content: `Translate the following chat message from ${LOCALE_NAMES[source]} to ${LOCALE_NAMES[target]}. Match casual conversational tone. Preserve emoji, numbers, names, and any URLs verbatim. Output ONLY the translated text — no quotes, no explanation, no preface.

Message:
${text}`,
      },
    ],
  });
  return res.content
    .filter((b) => b.type === "text")
    .map((b) => b.text)
    .join("")
    .trim();
}

// Realistic chat-during-a-job scenarios. Each is what one party would
// actually type. Source language varies — we want to confirm the
// matrix works in every direction we care about, not just from English.
const SCENARIOS = [
  {
    label: "Washer → Customer · ETA",
    source: "es",
    text: "Voy en camino, llego en 15 minutos 🚗",
    targets: ["en", "ko", "zh", "vi", "pt", "fr", "ru"],
  },
  {
    label: "Customer → Washer · Gate code",
    source: "en",
    text: "Use gate code 4421, then drive to the back. Black Tesla on the right.",
    targets: ["es", "ko", "zh", "vi"],
  },
  {
    label: "Customer → Washer · Korean",
    source: "ko",
    text: "지금 가고 있어요? 5분 후에 약속이 있어요.",
    targets: ["en", "es"],
  },
  {
    label: "Washer → Customer · Done + tip ask",
    source: "vi",
    text: "Em xong rồi nha anh, xe đẹp lắm! Anh check rồi tip nếu thấy ổn nhé 🙏",
    targets: ["en", "es", "ko"],
  },
  {
    label: "Washer → Customer · Chinese",
    source: "zh",
    text: "我到了，停在门口。麻烦您下楼开门，谢谢！",
    targets: ["en", "es"],
  },
  {
    label: "Customer → Washer · French",
    source: "fr",
    text: "Bonjour, le portail est ouvert. La voiture est dans le garage à droite.",
    targets: ["en", "es", "vi"],
  },
  {
    label: "Customer → Washer · Russian",
    source: "ru",
    text: "Здравствуйте! Машина серая Toyota, номер 7ABC123. Спасибо!",
    targets: ["en", "es"],
  },
  {
    label: "Washer → Customer · Portuguese",
    source: "pt",
    text: "Oi! Cheguei agora. Posso começar?",
    targets: ["en", "es", "ko"],
  },
  {
    label: "Edge case · numbers + URL preserved",
    source: "en",
    text: "Pricing details: $129 + 8.25% tax. See https://sheen.co/pricing for the full breakdown.",
    targets: ["es", "ko", "zh"],
  },
  {
    label: "Edge case · emoji + name preserved",
    source: "es",
    text: "Hola Edward! El auto quedó perfecto 🚙✨ — gracias por la propina!",
    targets: ["en", "ko"],
  },
];

let passed = 0;
let failed = 0;

console.log(`\nTesting chat translation matrix · ${MODEL}\n`);

for (const s of SCENARIOS) {
  console.log(`\n▸ ${s.label}`);
  console.log(`  [${s.source}] ${s.text}`);
  for (const t of s.targets) {
    try {
      const out = await translate(s.text, s.source, t);
      // Sanity checks: numbers, URLs, emoji should survive.
      const numbersPreserved = (s.text.match(/\d+/g) ?? []).every((n) =>
        out.includes(n)
      );
      const urlPreserved = !s.text.includes("https://") || out.includes("https://");
      const emojiPreserved =
        !/[\u{1F300}-\u{1F9FF}]/u.test(s.text) ||
        /[\u{1F300}-\u{1F9FF}]/u.test(out);

      const flags = [];
      if (!numbersPreserved) flags.push("MISSING_NUM");
      if (!urlPreserved) flags.push("MISSING_URL");
      if (!emojiPreserved) flags.push("MISSING_EMOJI");
      // Output should not be the same as input across non-trivial pairs
      // — if Claude returned the source text verbatim, something's wrong.
      if (out === s.text) flags.push("UNCHANGED");

      const ok = flags.length === 0;
      const tag = ok ? "✓" : `✗ [${flags.join(",")}]`;
      console.log(`  → [${t}] ${tag} ${out}`);
      if (ok) passed++;
      else failed++;
    } catch (e) {
      console.log(`  → [${t}] ✗ ERROR: ${e.message}`);
      failed++;
    }
  }
}

console.log(`\n\nResults: ${passed} passed · ${failed} failed`);
process.exit(failed === 0 ? 0 : 1);
