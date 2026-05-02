import { NextResponse } from "next/server";
import { createClient, createServiceClient } from "@/lib/supabase/server";
import { sendPushToUser } from "@/lib/push";
import { isLocale, type Locale } from "@/i18n/locales";
import { translateText, detectLanguage } from "@/lib/translate";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(_req: Request, { params }: { params: { id: string } }) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  const { data, error } = await supabase
    .from("messages")
    .select(
      "id, sender_id, body, image_path, read_at, created_at, original_language, translations"
    )
    .eq("booking_id", params.id)
    .order("created_at", { ascending: true })
    .limit(200);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Mark messages we received as read.
  const unreadIds = (data ?? [])
    .filter((m) => m.sender_id !== user.id && !m.read_at)
    .map((m) => m.id);
  if (unreadIds.length) {
    await supabase
      .from("messages")
      .update({ read_at: new Date().toISOString() })
      .in("id", unreadIds);
  }

  return NextResponse.json({ messages: data ?? [] });
}

export async function POST(req: Request, { params }: { params: { id: string } }) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  const { body, image_path } = await req.json().catch(() => ({}));
  const text = (body ?? "").toString().trim();
  const imagePath = typeof image_path === "string" ? image_path.trim() : "";
  // Either text OR an image is fine — both is also fine. Reject empty.
  if (!text && !imagePath) {
    return NextResponse.json({ error: "Empty message" }, { status: 400 });
  }
  if (text.length > 2000) return NextResponse.json({ error: "Too long" }, { status: 400 });

  // Look up the booking parties (RLS will reject this if user isn't one of them).
  const { data: booking } = await supabase
    .from("bookings")
    .select("customer_id, assigned_washer_id, assigned_partner_id")
    .eq("id", params.id)
    .maybeSingle();
  if (!booking) return NextResponse.json({ error: "Booking not found" }, { status: 404 });

  // Sender's locale — used as the default original_language so we don't
  // pay for a Claude detection call on every send. Falls back to 'en'
  // if the sender hasn't picked a preference yet.
  const { data: sender } = await supabase
    .from("users")
    .select("locale")
    .eq("id", user.id)
    .maybeSingle();
  const senderLocale: Locale =
    sender?.locale && isLocale(sender.locale.split("-")[0])
      ? (sender.locale.split("-")[0] as Locale)
      : "en";

  const { data: msg, error } = await supabase
    .from("messages")
    .insert({
      booking_id: params.id,
      sender_id: user.id,
      body: text || null,
      image_path: imagePath || null,
      original_language: text ? senderLocale : null,
    })
    .select(
      "id, sender_id, body, image_path, read_at, created_at, original_language, translations"
    )
    .maybeSingle();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Push to the other party (best effort).
  const recipients: string[] = [];
  if (user.id !== booking.customer_id) recipients.push(booking.customer_id);
  if (booking.assigned_washer_id && user.id !== booking.assigned_washer_id) {
    recipients.push(booking.assigned_washer_id);
  }
  if (booking.assigned_partner_id && user.id !== booking.assigned_partner_id) {
    recipients.push(booking.assigned_partner_id);
  }

  // Best-effort pre-translate for each recipient whose locale differs
  // from the sender's. Done after-the-fact (no await blocking the
  // response) so chat send latency stays low. The recipient's realtime
  // payload arrives a beat later with translations populated; if the
  // background translate hasn't finished by then, the client falls
  // back to /api/messages/translate on first render.
  if (msg && text && msg.id) {
    void preTranslateForRecipients(msg.id, text, senderLocale, recipients);
  }
  const previewText = text
    ? (text.length > 80 ? `${text.slice(0, 77)}…` : text)
    : "📷 Photo";
  for (const r of recipients) {
    sendPushToUser(r, {
      title: "New message · Sheen",
      body: previewText,
      url: user.id === booking.customer_id
        ? `/pro/jobs/${params.id}/checkin`
        : `/app/tracking/${params.id}`,
      tag: `chat-${params.id}`,
    }).catch(() => {});
  }

  return NextResponse.json({ message: msg });
}

async function preTranslateForRecipients(
  messageId: string,
  text: string,
  senderLocale: Locale,
  recipients: string[]
) {
  try {
    const admin = createServiceClient();
    const { data: rows } = await admin
      .from("users")
      .select("id, locale")
      .in("id", recipients);

    // Distinct target languages — if both recipients are Spanish we
    // only translate once.
    const targets = new Set<Locale>();
    for (const r of rows ?? []) {
      const norm = (r.locale ?? "en").split("-")[0];
      if (isLocale(norm) && norm !== senderLocale) targets.add(norm);
    }
    if (targets.size === 0) return;

    // If we don't actually have a key configured, give up silently —
    // translateText throws and we don't want to bombard the logs.
    if (!process.env.ANTHROPIC_API_KEY) return;

    const translations: Record<string, string> = {};
    await Promise.all(
      Array.from(targets).map(async (target) => {
        try {
          translations[target] = await translateText(text, senderLocale, target);
        } catch {
          // best-effort; client will retry on render
        }
      })
    );

    if (Object.keys(translations).length === 0) return;

    // Merge into existing (the realtime UPDATE this triggers is what
    // pushes the translated text to the recipient's chat panel).
    const { data: current } = await admin
      .from("messages")
      .select("translations")
      .eq("id", messageId)
      .maybeSingle();
    const merged = {
      ...((current?.translations as Record<string, string> | null) ?? {}),
      ...translations,
    };
    await admin
      .from("messages")
      .update({ translations: merged })
      .eq("id", messageId);
  } catch {
    // Pre-translate is fully best-effort. Lazy translate on render is
    // the durable path.
  }
}

// Detection import is referenced via translateText's flow; keep the
// symbol live so static analysis doesn't drop it.
void detectLanguage;
