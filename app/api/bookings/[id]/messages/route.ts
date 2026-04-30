import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { sendPushToUser } from "@/lib/push";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(_req: Request, { params }: { params: { id: string } }) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  const { data, error } = await supabase
    .from("messages")
    .select("id, sender_id, body, read_at, created_at")
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

  const { body } = await req.json().catch(() => ({}));
  const text = (body ?? "").toString().trim();
  if (!text) return NextResponse.json({ error: "Empty message" }, { status: 400 });
  if (text.length > 2000) return NextResponse.json({ error: "Too long" }, { status: 400 });

  // Look up the booking parties (RLS will reject this if user isn't one of them).
  const { data: booking } = await supabase
    .from("bookings")
    .select("customer_id, assigned_washer_id, assigned_partner_id")
    .eq("id", params.id)
    .maybeSingle();
  if (!booking) return NextResponse.json({ error: "Booking not found" }, { status: 404 });

  const { data: msg, error } = await supabase
    .from("messages")
    .insert({ booking_id: params.id, sender_id: user.id, body: text })
    .select("id, sender_id, body, read_at, created_at")
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
  for (const r of recipients) {
    sendPushToUser(r, {
      title: "New message · Sheen",
      body: text.length > 80 ? `${text.slice(0, 77)}…` : text,
      url: user.id === booking.customer_id
        ? `/pro/jobs/${params.id}/checkin`
        : `/app/tracking/${params.id}`,
      tag: `chat-${params.id}`,
    }).catch(() => {});
  }

  return NextResponse.json({ message: msg });
}
