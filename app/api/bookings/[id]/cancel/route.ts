import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getStripe } from "@/lib/stripe/server";
import { sendPushToUser } from "@/lib/push";
import { PENALTY_RULES, computePenaltyAmount } from "@/lib/penalties";

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
      "id, customer_id, status, total_cents, points_redeemed, membership_id, stripe_payment_intent_id, assigned_washer_id, scheduled_window_start"
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

  // ---------- Penalty assessment ----------
  // Two penalty triggers on customer cancel:
  //   - within 1h of window: late_cancel ($15)
  //   - after pro is en_route/arrived: late_cancel_after_enroute ($25)
  // We record the penalty regardless of refund status so admin can see it.
  const minutesToWindow =
    (new Date(booking.scheduled_window_start).getTime() - Date.now()) / 60_000;
  let penaltyAmount = 0;
  let penaltyReason: string | null = null;
  let penaltyDescription: string | null = null;

  if (booking.status === "en_route" || booking.status === "arrived") {
    const rule = PENALTY_RULES.late_cancel_after_enroute;
    penaltyAmount = computePenaltyAmount(rule, booking.total_cents);
    penaltyReason = rule.reason;
    penaltyDescription = rule.description;
  } else if (minutesToWindow < 60) {
    const rule = PENALTY_RULES.late_cancel;
    penaltyAmount = computePenaltyAmount(rule, booking.total_cents);
    penaltyReason = rule.reason;
    penaltyDescription = rule.description;
  }

  if (penaltyAmount > 0 && penaltyReason) {
    await supabase.from("penalties").insert({
      booking_id: booking.id,
      user_id: booking.customer_id,
      party: "customer",
      reason: penaltyReason,
      amount_cents: penaltyAmount,
      status: "applied",
      applied_at: new Date().toISOString(),
      notes: penaltyDescription,
    });
  }

  // Refund the customer's payment, minus the late-cancel fee if any.
  // The penalty is withheld from the refund (if there was a payment); for
  // unpaid bookings the penalty becomes an open balance handled by ops.
  if (booking.stripe_payment_intent_id) {
    try {
      const pi = await stripe.paymentIntents.retrieve(booking.stripe_payment_intent_id);
      if (pi.status === "succeeded") {
        const refundAmount = Math.max(0, booking.total_cents - penaltyAmount);
        await stripe.refunds.create({
          payment_intent: booking.stripe_payment_intent_id,
          // Stripe rejects amount=0; only specify when partial.
          ...(refundAmount > 0 && refundAmount < booking.total_cents
            ? { amount: refundAmount }
            : {}),
          ...(refundAmount === 0 ? { amount: 0 } : {}),
          reason: "requested_by_customer",
          metadata: {
            booking_id: booking.id,
            penalty_cents: String(penaltyAmount),
          },
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

  // Free any achievement credit reserved against this booking — it goes back
  // into the user's wallet so they can spend it on a future wash.
  await supabase
    .from("customer_credits")
    .update({ status: "available", reserved_for_booking_id: null })
    .eq("reserved_for_booking_id", params.id)
    .eq("status", "reserved");

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
