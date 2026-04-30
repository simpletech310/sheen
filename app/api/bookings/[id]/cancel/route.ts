import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getStripe } from "@/lib/stripe/server";
import { sendPushToUser } from "@/lib/push";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * POST /api/bookings/[id]/cancel
 *
 * Customer cancels a booking. Allowed only before the pro has started
 * the wash (status not in completed / in_progress / disputed). Refunds
 * the PaymentIntent (or refunds the loyalty / membership allowance).
 */
export async function POST(req: Request, { params }: { params: { id: string } }) {
  const supabase = createClient();
  const stripe = getStripe();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  const body = await req.json().catch(() => ({}));
  const reason: string = (body?.reason ?? "").toString().slice(0, 500);

  const { data: booking } = await supabase
    .from("bookings")
    .select(
      "id, customer_id, status, total_cents, points_redeemed, membership_id, stripe_payment_intent_id, assigned_washer_id"
    )
    .eq("id", params.id)
    .maybeSingle();
  if (!booking) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (booking.customer_id !== user.id) {
    return NextResponse.json({ error: "Not allowed" }, { status: 403 });
  }
  if (["completed", "cancelled", "disputed", "in_progress"].includes(booking.status)) {
    return NextResponse.json(
      { error: "This wash can no longer be cancelled. Reach out to support." },
      { status: 409 }
    );
  }

  // Refund Stripe payment if there is one and it succeeded.
  if (booking.stripe_payment_intent_id) {
    try {
      const pi = await stripe.paymentIntents.retrieve(booking.stripe_payment_intent_id);
      if (pi.status === "succeeded") {
        await stripe.refunds.create({
          payment_intent: booking.stripe_payment_intent_id,
          reason: "requested_by_customer",
          metadata: { booking_id: booking.id },
        });
      } else if (pi.status === "requires_payment_method" || pi.status === "requires_confirmation") {
        // Customer never finished paying — just cancel the intent.
        await stripe.paymentIntents.cancel(booking.stripe_payment_intent_id);
      }
    } catch (e) {
      // Don't block the cancel — surface to ops via audit_log.
      await supabase.from("audit_log").insert({
        actor_id: user.id,
        action: "stripe_refund_failed",
        target_type: "booking",
        target_id: booking.id,
        payload: { error: (e as any)?.message ?? String(e) },
      });
    }
  }

  // Restore redeemed loyalty points (positive ledger entry).
  if (booking.points_redeemed && booking.points_redeemed > 0) {
    await supabase.from("loyalty_ledger").insert({
      user_id: booking.customer_id,
      points: booking.points_redeemed,
      reason: "redeem_refund",
      booking_id: booking.id,
    });
  }

  // Restore membership allowance.
  if (booking.membership_id) {
    const { data: m } = await supabase
      .from("memberships")
      .select("washes_used")
      .eq("id", booking.membership_id)
      .maybeSingle();
    if (m && (m.washes_used ?? 0) > 0) {
      await supabase
        .from("memberships")
        .update({ washes_used: (m.washes_used ?? 0) - 1 })
        .eq("id", booking.membership_id);
    }
  }

  await supabase
    .from("bookings")
    .update({
      status: "cancelled",
      cancelled_at: new Date().toISOString(),
      cancelled_by: user.id,
      cancellation_reason: reason || null,
    })
    .eq("id", params.id);

  await supabase.from("booking_events").insert({
    booking_id: params.id,
    type: "cancelled",
    actor_id: user.id,
    payload: { reason: reason || null },
  });

  // Notify the assigned pro if there is one.
  if (booking.assigned_washer_id) {
    sendPushToUser(booking.assigned_washer_id, {
      title: "Booking cancelled",
      body: "The customer cancelled this wash.",
      url: "/pro/queue",
      tag: `booking-${booking.id}`,
    }).catch(() => {});
  }

  return NextResponse.json({ ok: true });
}
