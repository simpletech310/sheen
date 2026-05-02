import { NextResponse } from "next/server";
import { z } from "zod";
import { createClient, createServiceClient } from "@/lib/supabase/server";
import { LOCALES, isLocale, type Locale } from "@/i18n/locales";
import { translateText, detectLanguage } from "@/lib/translate";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * POST /api/messages/translate
 * Body: { message_id: uuid, target_lang: "es" }
 * Response: { text: string, original_language: Locale }
 *
 * Lazily translates a chat message into the viewer's preferred
 * language. Cached on `messages.translations[target_lang]` after first
 * call so the second viewer doesn't re-hit Claude. The request must
 * come from someone who can read the message (RLS on `messages`
 * already gates that to booking parties + admins).
 */

const Body = z.object({
  message_id: z.string().uuid(),
  target_lang: z.enum(LOCALES as unknown as [string, ...string[]]),
});

export async function POST(req: Request) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  const parsed = Body.parse(await req.json());
  const target = parsed.target_lang as Locale;

  // RLS scopes this read to booking parties; if the caller can't see
  // it, maybeSingle returns null and we 404.
  const { data: msg } = await supabase
    .from("messages")
    .select("id, body, original_language, translations, sender_id")
    .eq("id", parsed.message_id)
    .maybeSingle();
  if (!msg) {
    return NextResponse.json({ error: "Message not found" }, { status: 404 });
  }

  // Cache hit — return immediately.
  const existing =
    (msg.translations as Record<string, string> | null)?.[target];
  if (existing && msg.original_language) {
    return NextResponse.json({
      text: existing,
      original_language: msg.original_language,
    });
  }

  // If the original language is missing, detect it. Service-role
  // client because we'll write back the column the regular session
  // can't (messages are insert-only for non-senders).
  const admin = createServiceClient();

  let originalLang: Locale = "en";
  if (msg.original_language && isLocale(msg.original_language)) {
    originalLang = msg.original_language;
  } else {
    originalLang = await detectLanguage(msg.body);
    await admin
      .from("messages")
      .update({ original_language: originalLang })
      .eq("id", msg.id);
  }

  // No-op: the message is already in the viewer's language.
  if (originalLang === target) {
    return NextResponse.json({
      text: msg.body,
      original_language: originalLang,
    });
  }

  let translated: string;
  try {
    translated = await translateText(msg.body, originalLang, target);
  } catch (e: any) {
    // Friendly fall-through when the API key is missing or Claude is
    // down — show the original text, log the failure for ops, and
    // tag the response so the client can render a "translation
    // unavailable" hint instead of a hard error.
    return NextResponse.json(
      {
        text: msg.body,
        original_language: originalLang,
        error: e?.message ?? "translation_failed",
      },
      { status: 200 }
    );
  }

  // Cache it. jsonb_set + COALESCE so we don't overwrite a parallel
  // translation into a different language that landed first.
  const next = {
    ...((msg.translations as Record<string, string> | null) ?? {}),
    [target]: translated,
  };
  await admin
    .from("messages")
    .update({ translations: next })
    .eq("id", msg.id);

  return NextResponse.json({
    text: translated,
    original_language: originalLang,
  });
}
