import Anthropic from "@anthropic-ai/sdk";
import {
  LOCALES,
  LOCALE_ENGLISH_NAMES,
  isLocale,
  type Locale,
} from "@/i18n/locales";

// Lazily instantiate the Anthropic client so build-time scaffolding
// (next build, type-check) doesn't blow up when ANTHROPIC_API_KEY is
// missing. Runtime calls return a structured "no key" error so the
// chat UI can fall back to showing the original text gracefully.
let _client: Anthropic | null = null;
function getClient(): Anthropic | null {
  if (_client) return _client;
  if (!process.env.ANTHROPIC_API_KEY) return null;
  _client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
  return _client;
}

const MODEL = "claude-sonnet-4-5";

/**
 * Translate one chat message from `source` to `target`. Tight prompt:
 * preserve emoji, numbers, names, URLs; output ONLY the translated
 * text. Keeps token counts low and removes Claude's natural urge to
 * preface with "Sure, here's the translation:".
 */
export async function translateText(
  text: string,
  source: Locale,
  target: Locale
): Promise<string> {
  if (source === target) return text;
  const client = getClient();
  if (!client) {
    throw new Error("translation_unavailable: ANTHROPIC_API_KEY not set");
  }

  const sourceName = LOCALE_ENGLISH_NAMES[source];
  const targetName = LOCALE_ENGLISH_NAMES[target];

  const res = await client.messages.create({
    model: MODEL,
    max_tokens: Math.max(120, text.length * 4),
    messages: [
      {
        role: "user",
        content: `Translate the following chat message from ${sourceName} to ${targetName}. Match casual conversational tone. Preserve emoji, numbers, names, and any URLs verbatim. Output ONLY the translated text — no quotes, no explanation, no preface.

Message:
${text}`,
      },
    ],
  });

  const out = res.content
    .filter((b): b is Anthropic.TextBlock => b.type === "text")
    .map((b) => b.text)
    .join("")
    .trim();

  if (!out) throw new Error("translation_empty");
  return out;
}

/**
 * Detect the language of a chat message. Returns one of the supported
 * locales; falls back to "en" if Claude returns something we don't
 * support (or the API call fails). Cheap one-shot — only used the
 * first time we touch a message whose `original_language` is null.
 */
export async function detectLanguage(text: string): Promise<Locale> {
  const client = getClient();
  if (!client) return "en";

  try {
    const res = await client.messages.create({
      model: MODEL,
      max_tokens: 10,
      messages: [
        {
          role: "user",
          content: `Identify the primary language of the following text. Reply with EXACTLY one of these ISO 639-1 codes: ${LOCALES.join(", ")}. Just the two-letter code, nothing else.

Text:
${text}`,
        },
      ],
    });
    const out = res.content
      .filter((b): b is Anthropic.TextBlock => b.type === "text")
      .map((b) => b.text)
      .join("")
      .trim()
      .toLowerCase()
      .slice(0, 2);
    return isLocale(out) ? out : "en";
  } catch {
    return "en";
  }
}
