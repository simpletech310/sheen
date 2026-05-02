#!/usr/bin/env node
/**
 * End-to-end chat translation DB test.
 *
 * Verifies the actual messages-table flow:
 *   1. Find an existing booking with two parties
 *   2. Set party A locale = es, party B locale = ko (snapshot first; restore at end)
 *   3. Insert messages on both sides via the service-role client (mimicking
 *      the pre-translate path in /api/bookings/[id]/messages)
 *   4. Translate each message using lib/translate logic, write to
 *      messages.translations jsonb
 *   5. Verify each viewer sees the translated text in their own locale
 *   6. Spot-check the cache: re-translating a message that already has
 *      a cached entry should be a no-op (no new API call needed)
 *   7. Clean up test messages so the booking doesn't get polluted
 *
 * Run:
 *   ANTHROPIC_API_KEY=... NEXT_PUBLIC_SUPABASE_URL=... SUPABASE_SERVICE_ROLE_KEY=... \
 *     node scripts/test-chat-db-roundtrip.mjs
 */

import { createClient } from "@supabase/supabase-js";
import Anthropic from "@anthropic-ai/sdk";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!SUPABASE_URL || !SERVICE_KEY) {
  console.error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
  process.exit(1);
}

const sb = createClient(SUPABASE_URL, SERVICE_KEY, {
  auth: { persistSession: false },
});

const anthropic = new Anthropic();
const MODEL = "claude-sonnet-4-5";

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

async function translateText(text, source, target) {
  if (source === target) return text;
  const res = await anthropic.messages.create({
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

function log(stage, msg) {
  console.log(`[${stage}] ${msg}`);
}

async function main() {
  // 1. Find a booking with both customer + assigned washer
  log("setup", "Finding a booking with customer + washer …");
  const { data: bookings } = await sb
    .from("bookings")
    .select("id, customer_id, assigned_washer_id")
    .not("assigned_washer_id", "is", null)
    .limit(5);
  if (!bookings || bookings.length === 0) {
    console.error("No bookings with assigned washers found. Cannot run e2e test.");
    process.exit(1);
  }
  const booking = {
    id: bookings[0].id,
    customer_id: bookings[0].customer_id,
    washer_id: bookings[0].assigned_washer_id,
  };
  log("setup", `Using booking ${booking.id}`);
  log("setup", `  customer ${booking.customer_id}`);
  log("setup", `  washer   ${booking.washer_id}`);

  // 2. Snapshot + override locales
  const { data: usersBefore } = await sb
    .from("users")
    .select("id, locale")
    .in("id", [booking.customer_id, booking.washer_id]);
  const localesBefore = Object.fromEntries(
    (usersBefore ?? []).map((u) => [u.id, u.locale])
  );
  log("setup", `Snapshotted locales: ${JSON.stringify(localesBefore)}`);

  // Customer = Korean, washer = Spanish — the user's headline scenario
  await sb.from("users").update({ locale: "ko" }).eq("id", booking.customer_id);
  await sb.from("users").update({ locale: "es" }).eq("id", booking.washer_id);
  log("setup", "Set customer→ko, washer→es");

  const insertedIds = [];

  try {
    // 3. Insert washer→customer message in Spanish
    const washerMsg = "Estoy en camino, llego en 10 minutos 🚗";
    log("insert", `Washer (es) sends: "${washerMsg}"`);
    const { data: m1, error: e1 } = await sb
      .from("messages")
      .insert({
        booking_id: booking.id,
        sender_id: booking.washer_id,
        body: washerMsg,
        original_language: "es",
      })
      .select("id")
      .single();
    if (e1) throw new Error(`Insert washer msg failed: ${e1.message}`);
    insertedIds.push(m1.id);

    // Pre-translate to recipient locale (the "send-time best-effort"
    // path — recipient is customer at locale ko).
    const m1ToKo = await translateText(washerMsg, "es", "ko");
    log("translate", `→ Korean (customer view): "${m1ToKo}"`);
    await sb
      .from("messages")
      .update({ translations: { ko: m1ToKo } })
      .eq("id", m1.id);

    // 4. Insert customer→washer message in Korean
    const customerMsg = "고마워요! 게이트 코드는 4421이에요. 검은색 테슬라 옆에 주차해주세요.";
    log("insert", `Customer (ko) sends: "${customerMsg}"`);
    const { data: m2, error: e2 } = await sb
      .from("messages")
      .insert({
        booking_id: booking.id,
        sender_id: booking.customer_id,
        body: customerMsg,
        original_language: "ko",
      })
      .select("id")
      .single();
    if (e2) throw new Error(`Insert customer msg failed: ${e2.message}`);
    insertedIds.push(m2.id);

    const m2ToEs = await translateText(customerMsg, "ko", "es");
    log("translate", `→ Spanish (washer view): "${m2ToEs}"`);
    await sb
      .from("messages")
      .update({ translations: { es: m2ToEs } })
      .eq("id", m2.id);

    // 5. Read messages back, simulate each viewer
    const { data: thread } = await sb
      .from("messages")
      .select("id, sender_id, body, original_language, translations")
      .eq("booking_id", booking.id)
      .in("id", insertedIds)
      .order("created_at", { ascending: true });

    console.log("\n--- CUSTOMER VIEW (locale: ko) ---");
    for (const m of thread) {
      const isMine = m.sender_id === booking.customer_id;
      const text =
        m.original_language === "ko"
          ? m.body
          : m.translations?.ko ?? m.body;
      const sender = isMine ? "You (ko)" : "Washer";
      const tag =
        m.original_language !== "ko" && !isMine
          ? ` [translated from ${m.original_language}]`
          : "";
      console.log(`  ${sender}${tag}: ${text}`);
    }

    console.log("\n--- WASHER VIEW (locale: es) ---");
    for (const m of thread) {
      const isMine = m.sender_id === booking.washer_id;
      const text =
        m.original_language === "es"
          ? m.body
          : m.translations?.es ?? m.body;
      const sender = isMine ? "You (es)" : "Customer";
      const tag =
        m.original_language !== "es" && !isMine
          ? ` [translated from ${m.original_language}]`
          : "";
      console.log(`  ${sender}${tag}: ${text}`);
    }

    // 6. Cache spot-check: re-fetch the Korean translation of m1 — should
    // already be cached, no API call needed.
    const { data: cached } = await sb
      .from("messages")
      .select("translations")
      .eq("id", m1.id)
      .single();
    const cachedKo = cached?.translations?.ko;
    if (cachedKo === m1ToKo) {
      console.log(`\n[cache] ✓ Korean translation cached for message m1`);
    } else {
      console.log(
        `\n[cache] ✗ Cache mismatch — expected "${m1ToKo}", got "${cachedKo}"`
      );
    }

    // 7. Add a third locale (English) to m1 — simulates an admin or a
    // third party joining the thread with locale=en. Should add to
    // translations without overwriting the existing ko entry.
    const m1ToEn = await translateText(washerMsg, "es", "en");
    log("cache", `Adding en translation to m1: "${m1ToEn}"`);
    const { data: cur } = await sb
      .from("messages")
      .select("translations")
      .eq("id", m1.id)
      .single();
    const merged = { ...(cur?.translations ?? {}), en: m1ToEn };
    await sb.from("messages").update({ translations: merged }).eq("id", m1.id);

    const { data: final } = await sb
      .from("messages")
      .select("translations")
      .eq("id", m1.id)
      .single();
    console.log(`[cache] m1 translations now: ${JSON.stringify(final?.translations)}`);
    if (final?.translations?.ko && final?.translations?.en) {
      console.log("[cache] ✓ Both ko + en translations cached on same message");
    } else {
      console.log("[cache] ✗ Lost a translation when adding new one");
    }
  } finally {
    // Cleanup: delete test messages, restore locales
    if (insertedIds.length) {
      await sb.from("messages").delete().in("id", insertedIds);
      log("cleanup", `Deleted ${insertedIds.length} test messages`);
    }
    for (const [id, locale] of Object.entries(localesBefore)) {
      await sb.from("users").update({ locale: locale ?? "en" }).eq("id", id);
    }
    log("cleanup", "Restored original locales");
  }

  console.log("\n✓ Chat DB roundtrip test complete");
}

main().catch((e) => {
  console.error("FAILED:", e);
  process.exit(1);
});
