import webpush from "web-push";
import { createServiceClient } from "@/lib/supabase/server";
import { translateText } from "@/lib/translate";
import { isLocale, type Locale } from "@/i18n/locales";

let configured = false;
function configure() {
  if (configured) return;
  const pub = process.env.WEB_PUSH_VAPID_PUBLIC_KEY;
  const priv = process.env.WEB_PUSH_VAPID_PRIVATE_KEY;
  const contact = process.env.WEB_PUSH_CONTACT_EMAIL || "hello@sheen.co";
  if (!pub || !priv) return;
  webpush.setVapidDetails(`mailto:${contact}`, pub, priv);
  configured = true;
}

export async function sendPushToUser(
  userId: string,
  payload: { title: string; body: string; url?: string; tag?: string; data?: Record<string, unknown> }
) {
  configure();
  if (!configured) {
    console.log(`[push] would send to ${userId}:`, payload);
    return;
  }
  const supa = createServiceClient();

  // Look up the recipient's preferred locale + their push subscriptions
  // in parallel. If their locale is non-English and Anthropic is wired,
  // translate the title + body before sending so the notification on
  // their lock screen reads in their language. Best-effort — translation
  // failure falls back to the English source.
  const [{ data: userRow }, { data: subs }] = await Promise.all([
    supa.from("users").select("locale").eq("id", userId).maybeSingle(),
    supa
      .from("push_subscriptions")
      .select("id, endpoint, p256dh, auth")
      .eq("user_id", userId),
  ]);
  if (!subs?.length) return;

  const localeRaw = (userRow?.locale ?? "en").split("-")[0].toLowerCase();
  const targetLocale: Locale = isLocale(localeRaw) ? localeRaw : "en";

  let localizedTitle = payload.title;
  let localizedBody = payload.body;
  if (targetLocale !== "en" && process.env.ANTHROPIC_API_KEY) {
    try {
      const [titleT, bodyT] = await Promise.all([
        translateText(payload.title, "en", targetLocale).catch(() => payload.title),
        translateText(payload.body, "en", targetLocale).catch(() => payload.body),
      ]);
      localizedTitle = titleT;
      localizedBody = bodyT;
    } catch {
      // Soft-fail; English is fine.
    }
  }

  const localized = { ...payload, title: localizedTitle, body: localizedBody };
  const json = JSON.stringify(localized);
  await Promise.allSettled(
    subs.map(async (s) => {
      try {
        await webpush.sendNotification(
          { endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } },
          json
        );
      } catch (e: any) {
        // Clean up dead subscriptions
        if (e.statusCode === 404 || e.statusCode === 410) {
          await supa.from("push_subscriptions").delete().eq("id", s.id);
        } else {
          console.error("Push send failed", e?.statusCode, e?.body ?? e?.message);
        }
      }
    })
  );
}
