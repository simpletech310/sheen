import { getStripe } from "@/lib/stripe/server";
import { computeFees } from "@/lib/stripe/fees";
import { createServiceClient } from "@/lib/supabase/server";
import { sendPushToUser } from "@/lib/push";

/**
 * Releases funds for a completed, customer-approved booking. Idempotent —
 * safe to call multiple times; returns early if the transfer is already
 * recorded.
 *
 * Called from:
 *  - /api/bookings/[id]/approve (customer hits "approve" on tracking page)
 *  - cron auto-approval after 24h (v2)
 *
 * Logic kept here so washer-completion vs customer-approval don't go out
 * of sync. The previous implementation transferred the moment the washer
 * marked complete — bypassing the approval gate entirely.
 */
export async function releaseFundsForBooking(
  bookingId: string,
  actorId: string
): Promise<{ ok: boolean; reason?: string; transferId?: string }> {
  const supabase = createServiceClient();
  const stripe = getStripe();

  const { data: booking } = await supabase
    .from("bookings")
    .select(
      "id, status, assigned_washer_id, assigned_partner_id, customer_id, service_cents, stripe_payment_intent_id, customer_approved_at, funds_released_at"
    )
    .eq("id", bookingId)
    .maybeSingle();

  if (!booking) return { ok: false, reason: "not_found" };
  if (booking.status !== "completed") {
    return { ok: false, reason: "not_completed" };
  }
  if (!booking.customer_approved_at) {
    return { ok: false, reason: "not_approved" };
  }
  if (booking.funds_released_at) {
    return { ok: true, reason: "already_released" };
  }

  // Existing payout row created at /complete time.
  const { data: payout } = await supabase
    .from("payouts")
    .select("id, stripe_transfer_id, amount_cents")
    .eq("booking_id", booking.id)
    .eq("kind", "wash")
    .maybeSingle();

  // If we already transferred, just mark released.
  if (payout?.stripe_transfer_id) {
    await supabase
      .from("bookings")
      .update({ funds_released_at: new Date().toISOString() })
      .eq("id", booking.id);
    return { ok: true, reason: "transfer_existed", transferId: payout.stripe_transfer_id };
  }

  const isWasher = !!booking.assigned_washer_id;
  const isPartner = !!booking.assigned_partner_id;
  const fees = computeFees({
    serviceCents: booking.service_cents,
    routedTo: isPartner ? "partner" : "solo_washer",
  });

  // Connected Stripe account.
  let stripeAccountId: string | null = null;
  if (isWasher && booking.assigned_washer_id) {
    const { data: wp } = await supabase
      .from("washer_profiles")
      .select("stripe_account_id")
      .eq("user_id", booking.assigned_washer_id)
      .maybeSingle();
    stripeAccountId = wp?.stripe_account_id ?? null;
  } else if (isPartner && booking.assigned_partner_id) {
    const { data: pp } = await supabase
      .from("partner_profiles")
      .select("stripe_account_id")
      .eq("user_id", booking.assigned_partner_id)
      .maybeSingle();
    stripeAccountId = pp?.stripe_account_id ?? null;
  }

  if (!stripeAccountId || !booking.stripe_payment_intent_id) {
    // No payout target — mark released and let ops follow up. The
    // payout row stays pending and visible on /admin.
    await supabase
      .from("bookings")
      .update({ funds_released_at: new Date().toISOString() })
      .eq("id", booking.id);
    await supabase.from("booking_events").insert({
      booking_id: booking.id,
      type: "funds_released_no_transfer",
      actor_id: actorId,
      payload: {
        has_account: !!stripeAccountId,
        has_pi: !!booking.stripe_payment_intent_id,
      },
    });
    return { ok: true, reason: "no_stripe_target" };
  }

  try {
    const pi = await stripe.paymentIntents.retrieve(booking.stripe_payment_intent_id);
    if (pi.status !== "succeeded") {
      return { ok: false, reason: "pi_not_succeeded" };
    }
    const transfer = await stripe.transfers.create({
      amount: fees.washerOrPartnerNet,
      currency: "usd",
      destination: stripeAccountId,
      source_transaction: pi.latest_charge as string,
      metadata: {
        booking_id: booking.id,
        payout_id: payout?.id ?? "",
        approved_by: actorId,
      },
    });
    await supabase
      .from("payouts")
      .update({ stripe_transfer_id: transfer.id, status: "paid" })
      .eq("booking_id", booking.id)
      .eq("kind", "wash");
    await supabase
      .from("bookings")
      .update({ funds_released_at: new Date().toISOString() })
      .eq("id", booking.id);
    await supabase.from("booking_events").insert({
      booking_id: booking.id,
      type: "funds_released",
      actor_id: actorId,
      payload: { transfer_id: transfer.id, amount_cents: fees.washerOrPartnerNet },
    });

    // Tell the pro the money's on its way.
    const recipient = booking.assigned_washer_id ?? booking.assigned_partner_id;
    if (recipient) {
      sendPushToUser(recipient, {
        title: "Customer approved · you've been paid ✓",
        body: `$${(fees.washerOrPartnerNet / 100).toFixed(2)} on the way to your account.`,
        url: "/pro/wallet",
        tag: `payout-${booking.id}`,
      }).catch(() => {});
    }
    return { ok: true, transferId: transfer.id };
  } catch (e: any) {
    await supabase.from("booking_events").insert({
      booking_id: booking.id,
      type: "transfer_failed",
      actor_id: actorId,
      payload: { error: e.message ?? String(e) },
    });
    return { ok: false, reason: "stripe_error" };
  }
}
