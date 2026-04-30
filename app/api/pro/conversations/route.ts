import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * GET /api/pro/conversations
 *
 * Aggregates message threads across every booking the calling washer is
 * assigned to. Optional query param `count_only=1` returns just the
 * unread total (used by ProBottomNav's poller — keeps the response tiny).
 */
export async function GET(req: Request) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  const url = new URL(req.url);
  const countOnly = url.searchParams.get("count_only") === "1";

  // 1. Pull every booking this washer has touched (assigned + completed).
  const { data: bookings } = await supabase
    .from("bookings")
    .select(
      "id, status, scheduled_window_start, customer_id, services(tier_name, category)"
    )
    .eq("assigned_washer_id", user.id)
    .order("scheduled_window_start", { ascending: false })
    .limit(50);

  const bookingIds = (bookings ?? []).map((b: any) => b.id);
  if (bookingIds.length === 0) {
    return NextResponse.json(countOnly ? { unread: 0 } : { conversations: [], unread: 0 });
  }

  // 2. Fetch all messages for those bookings.
  const { data: messages } = await supabase
    .from("messages")
    .select("id, booking_id, sender_id, body, read_at, created_at")
    .in("booking_id", bookingIds)
    .order("created_at", { ascending: false });

  // 3. Bucket by booking, take the latest message + unread count from
  //    everyone but us.
  const byBooking = new Map<
    string,
    { latest: any; unread: number; allIds: string[] }
  >();
  for (const m of messages ?? []) {
    const entry = byBooking.get(m.booking_id) || { latest: null, unread: 0, allIds: [] };
    if (!entry.latest) entry.latest = m;
    if (m.sender_id !== user.id && !m.read_at) entry.unread += 1;
    entry.allIds.push(m.id);
    byBooking.set(m.booking_id, entry);
  }

  const totalUnread = Array.from(byBooking.values()).reduce(
    (acc, v) => acc + v.unread,
    0
  );

  if (countOnly) {
    return NextResponse.json({ unread: totalUnread });
  }

  // 4. Look up customer names in one go.
  const customerIds = Array.from(
    new Set((bookings ?? []).map((b: any) => b.customer_id))
  );
  const { data: customers } = await supabase
    .from("users")
    .select("id, full_name")
    .in("id", customerIds);
  const nameById = new Map<string, string>(
    (customers ?? []).map((c: any) => [c.id, c.full_name ?? "Customer"])
  );

  const conversations = (bookings ?? [])
    .filter((b: any) => byBooking.has(b.id))
    .map((b: any) => {
      const entry = byBooking.get(b.id)!;
      return {
        booking_id: b.id,
        booking_status: b.status,
        scheduled_window_start: b.scheduled_window_start,
        tier_name: b.services?.tier_name ?? null,
        customer_name: nameById.get(b.customer_id) ?? "Customer",
        last_message: entry.latest?.body ?? "",
        last_message_at: entry.latest?.created_at ?? null,
        unread: entry.unread,
      };
    })
    .sort((a, b) =>
      (b.last_message_at ?? "").localeCompare(a.last_message_at ?? "")
    );

  return NextResponse.json({ conversations, unread: totalUnread });
}
