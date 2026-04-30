import webpush from "web-push";
import { createServiceClient } from "@/lib/supabase/server";

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
  const { data: subs } = await supa
    .from("push_subscriptions")
    .select("id, endpoint, p256dh, auth")
    .eq("user_id", userId);
  if (!subs?.length) return;

  const json = JSON.stringify(payload);
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
