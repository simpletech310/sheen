import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { sendPushToUser } from "@/lib/push";
import { z } from "zod";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const Body = z.object({
  // 8-char alphanumeric — matches the trigger's md5 substring.
  code: z.string().min(4).max(20),
});

/**
 * POST /api/bookings/checkin
 * Body: { code }
 *
 * Customer-facing endpoint. Look up the booking by qr_check_in_code
 * (case-insensitive), confirm the calling user is the booking's
 * customer, and stamp started_at + status='in_progress'. Push the
 * washer that the customer's confirmed arrival.
 *
 * The booking_id stays out of the URL — the code itself is the secret,
 * scoped to a single booking, and the matched booking is returned in
 * the response so the customer's tracking page can deep-link.
 */
export async function POST(req: Request) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  const body = Body.parse(await req.json());
  const code = body.code.toUpperCase().trim();

  const { data: booking } = await supabase
    .from("bookings")
    .select(
      "id, customer_id, assigned_washer_id, status, started_at, qr_check_in_code"
    )
    .eq("qr_check_in_code", code)
    .maybeSingle();

  if (!booking) {
    return NextResponse.json({ error: "Code not recognized" }, { status: 404 });
  }
  if (booking.customer_id !== user.id) {
    return NextResponse.json(
      { error: "This isn't your booking" },
      { status: 403 }
    );
  }
  if (booking.started_at) {
    // Idempotent — return the booking so client can navigate.
    return NextResponse.json({
      ok: true,
      booking_id: booking.id,
      already_started: true,
    });
  }
  if (!booking.assigned_washer_id) {
    return NextResponse.json(
      { error: "Pro hasn't claimed yet — check back in a minute." },
      { status: 409 }
    );
  }

  const startedAt = new Date().toISOString();
  const { error } = await supabase
    .from("bookings")
    .update({ status: "in_progress", started_at: startedAt })
    .eq("id", booking.id);
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });

  await supabase.from("booking_events").insert({
    booking_id: booking.id,
    type: "checked_in",
    actor_id: user.id,
    payload: { method: "qr_or_manual" },
  });

  // Tell the pro the timer just started.
  sendPushToUser(booking.assigned_washer_id, {
    title: "Customer checked you in",
    body: "Timer's running. Funds held until they approve.",
    url: `/pro/jobs/${booking.id}/timer`,
    tag: `booking-${booking.id}-checkin`,
  }).catch(() => {});

  return NextResponse.json({ ok: true, booking_id: booking.id });
}
