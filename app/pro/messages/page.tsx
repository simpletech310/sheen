import Link from "next/link";
import { Eyebrow } from "@/components/brand/Eyebrow";
import { createClient } from "@/lib/supabase/server";
import { getTranslations } from "next-intl/server";

export const dynamic = "force-dynamic";

type Conversation = {
  booking_id: string;
  booking_status: string;
  scheduled_window_start: string | null;
  tier_name: string | null;
  customer_name: string;
  customer_avatar_url: string | null;
  last_message: string;
  last_message_at: string | null;
  unread: number;
};

export default async function MessagesPage() {
  const t = await getTranslations("proMessages");
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Fetch the same data the API does — server-side render means a single
  // round-trip and no client-side fetch flicker. Mirrors /api/pro/conversations.
  const { data: bookings } = await supabase
    .from("bookings")
    .select(
      "id, status, scheduled_window_start, customer_id, services(tier_name)"
    )
    .eq("assigned_washer_id", user?.id ?? "")
    .order("scheduled_window_start", { ascending: false })
    .limit(50);

  const bookingIds = (bookings ?? []).map((b: any) => b.id);

  let conversations: Conversation[] = [];
  if (bookingIds.length > 0) {
    const { data: messages } = await supabase
      .from("messages")
      .select("booking_id, sender_id, body, read_at, created_at")
      .in("booking_id", bookingIds)
      .order("created_at", { ascending: false });

    const byBooking = new Map<string, { latest: any; unread: number }>();
    for (const m of messages ?? []) {
      const entry = byBooking.get(m.booking_id) || { latest: null, unread: 0 };
      if (!entry.latest) entry.latest = m;
      if (m.sender_id !== user?.id && !m.read_at) entry.unread += 1;
      byBooking.set(m.booking_id, entry);
    }

    const customerIds = Array.from(
      new Set((bookings ?? []).map((b: any) => b.customer_id))
    );
    const { data: customers } = await supabase
      .from("users")
      .select("id, full_name, display_name, avatar_url")
      .in("id", customerIds);
    const customerById = new Map<string, any>(
      (customers ?? []).map((c: any) => [c.id, c])
    );

    conversations = (bookings ?? [])
      .filter((b: any) => byBooking.has(b.id))
      .map((b: any): Conversation => {
        const entry = byBooking.get(b.id)!;
        const c = customerById.get(b.customer_id);
        return {
          booking_id: b.id,
          booking_status: b.status,
          scheduled_window_start: b.scheduled_window_start,
          tier_name: b.services?.tier_name ?? null,
          customer_name: c?.display_name || c?.full_name || t("customerFallback"),
          customer_avatar_url: c?.avatar_url
            ? `${process.env.NEXT_PUBLIC_SUPABASE_URL ?? ""}/storage/v1/object/public/avatars/${c.avatar_url}`
            : null,
          last_message: entry.latest?.body ?? "",
          last_message_at: entry.latest?.created_at ?? null,
          unread: entry.unread,
        };
      })
      .sort((a, b) =>
        (b.last_message_at ?? "").localeCompare(a.last_message_at ?? "")
      );
  }

  return (
    <div className="px-5 pt-10 pb-8">
      <Eyebrow className="!text-bone/60" prefix={null}>
        {t("eyebrow")}
      </Eyebrow>
      <h1 className="display text-3xl mt-3 mb-2">{t("headline")}</h1>
      <div className="h-[3px] w-16 bg-gradient-to-r from-royal to-sol mb-6" />

      {conversations.length === 0 ? (
        <div className="bg-white/5 p-8 text-center">
          <div className="font-mono text-[10px] uppercase tracking-wider text-sol mb-2">
            {t("noThreadsYet")}
          </div>
          <p className="text-sm text-bone/60">
            {t("noThreadsDesc")}
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {conversations.map((c) => {
            const initial = (c.customer_name[0] ?? "C").toUpperCase();
            return (
              <Link
                key={c.booking_id}
                href={`/pro/queue/${c.booking_id}`}
                className="block bg-white/5 hover:bg-white/10 p-4 transition relative"
              >
                <div className="flex items-start gap-3">
                  {c.customer_avatar_url ? (
                    /* eslint-disable-next-line @next/next/no-img-element */
                    <img
                      src={c.customer_avatar_url}
                      alt={c.customer_name}
                      className="shrink-0 w-10 h-10 rounded-full object-cover bg-royal"
                    />
                  ) : (
                    <div className="shrink-0 w-10 h-10 rounded-full bg-royal text-bone flex items-center justify-center font-bold">
                      {initial}
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <div className="flex justify-between items-baseline">
                      <div className="text-sm font-bold truncate">
                        {c.customer_name}
                      </div>
                      <div className="font-mono text-[10px] text-bone/50 shrink-0 ml-2 tabular">
                        {c.last_message_at
                          ? new Date(c.last_message_at).toLocaleString([], {
                              month: "short",
                              day: "numeric",
                              hour: "numeric",
                              minute: "2-digit",
                            })
                          : ""}
                      </div>
                    </div>
                    <div className="text-xs text-bone/50 mt-0.5">
                      {c.tier_name ?? t("serviceFallback")}
                    </div>
                    <p className="text-sm text-bone/80 mt-1.5 line-clamp-2">
                      {c.last_message}
                    </p>
                  </div>
                  {c.unread > 0 && (
                    <span className="shrink-0 ml-2 inline-flex items-center justify-center w-5 h-5 bg-sol text-ink font-mono text-[10px] tabular font-bold">
                      {c.unread}
                    </span>
                  )}
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
