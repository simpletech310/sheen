import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { sendPushToUser } from "@/lib/push";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * POST /api/bookings/[id]/decline-request
 *
 * Pro declines a direct request. We mark request_declined_at so RLS
 * immediately falls the booking through to the general queue (the
 * policy treats declined and expired equivalently).
 */
export async function POST(_req: Request, { params }: { params: { id: string } }) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  const { data, error } = await supabase
    .from("bookings")
    .update({
      request_declined_at: new Date().toISOString(),
      requested_washer_id: null,
      request_expires_at: null,
    })
    .eq("id", params.id)
    .eq("requested_washer_id", user.id)
    .eq("status", "pending")
    .select("id, customer_id")
    .maybeSingle();

  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  if (!data) {
    return NextResponse.json(
      { error: "Request not found or already handled" },
      { status: 409 }
    );
  }

  await supabase.from("booking_events").insert({
    booking_id: params.id,
    type: "request_declined",
    actor_id: user.id,
  });

  // Tell the customer; they didn't lose their booking, just lost the
  // direct match — it's now open to anyone in radius.
  sendPushToUser(data.customer_id, {
    title: "Looking for another pro",
    body: "Your requested pro is busy. We're matching you with the next available.",
    url: `/app/tracking/${params.id}`,
    tag: `booking-${params.id}`,
  }).catch(() => {});

  return NextResponse.json({ ok: true });
}
