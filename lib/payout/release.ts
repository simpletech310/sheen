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
      "id, status, assigned_washer_id, assigned_partner_id, customer_id, service_cents, stripe_payment_intent_id, customer_approved_at, funds_released_at, is_rush, rush_made_in_time, rush_bonus_cents, rush_surcharge_cents"
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
    .select("id, stripe_transfer_id, amount_cents, status")
    .eq("booking_id", booking.id)
    .eq("kind", "wash")
    .maybeSingle();

  // If we already transferred, just mark released.
  if (payout?.stripe_transfer_id) {
    await supabase
      .from("bookings")
      .update({ funds_released_at: new Date().toISOString(), status: "funded" })
      .eq("id", booking.id);
    return { ok: true, reason: "transfer_existed", transferId: payout.stripe_transfer_id };
  }

  // Lock the payout row so a concurrent caller (e.g. the 24h cron firing while
  // the customer hits "Approve" by hand) can't double-transfer. We flip
  // 'pending' → 'releasing'; if 0 rows match, somebody else already won.
  // On any failure below we flip it back to 'pending' for safe retry.
  if (payout) {
    const { data: lock } = await supabase
      .from("payouts")
      .update({ status: "releasing" })
      .eq("id", payout.id)
      .eq("status", "pending")
      .select("id")
      .maybeSingle();
    if (!lock) {
      return { ok: false, reason: "release_in_progress" };
    }
  }

  const releaseLockOnError = async () => {
    if (!payout) return;
    await supabase
      .from("payouts")
      .update({ status: "pending" })
      .eq("id", payout.id)
      .eq("status", "releasing");
  };

  const isWasher = !!booking.assigned_washer_id;
  const isPartner = !!booking.assigned_partner_id;
  const fees = computeFees({
    serviceCents: booking.service_cents,
    routedTo: isPartner ? "partner" : "solo_washer",
  });

  // Rush adjustments. The base payout from computeFees is the regular
  // 78%-of-service-cents number. Rush layers a delta on top:
  //   - on time: +rush_bonus_cents
  //   - late:    -RUSH_LATE_WASHER_PENALTY_PCT * service_cents
  // Late jobs also refund a chunk of the customer's rush surcharge.
  let washerNet = fees.washerOrPartnerNet;
  let customerRefundCents = 0;
  if (booking.is_rush) {
    const { resolveRushPayoutDeltas } = await import("@/lib/rush");
    // If rush_made_in_time is still null at payout time, treat it as
    // a miss — the pro never showed up before the deadline.
    const madeInTime = booking.rush_made_in_time === true;
    const deltas = resolveRushPayoutDeltas({
      serviceCents: booking.service_cents,
      bonusCents: booking.rush_bonus_cents ?? 0,
      madeInTime,
    });
    washerNet = Math.max(0, washerNet + deltas.washerDeltaCents);
    customerRefundCents = deltas.customerRefundCents;
  }

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
    await releaseLockOnError();
    await supabase
      .from("bookings")
      .update({ funds_released_at: new Date().toISOString(), status: "funded" })
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
      await releaseLockOnError();
      return { ok: false, reason: "pi_not_succeeded" };
    }

    // If the rush deadline was missed, refund the customer their share
    // of the surcharge BEFORE the transfer. The remaining surcharge
    // stays with the platform (covers operational risk + late routing).
    if (customerRefundCents > 0) {
      try {
        await stripe.refunds.create({
          payment_intent: booking.stripe_payment_intent_id,
          amount: customerRefundCents,
          metadata: {
            booking_id: booking.id,
            reason: "rush_deadline_missed",
          },
        });
      } catch (refErr: any) {
        // The refund + transfer are a single financial unit — if we can't
        // refund the customer their rush surcharge, we must NOT transfer
        // the (now-incorrect) payout to the pro. Bail and let ops retry.
        await supabase.from("booking_events").insert({
          booking_id: booking.id,
          type: "rush_refund_failed",
          actor_id: actorId,
          payload: { error: refErr.message ?? String(refErr) },
        });
        await releaseLockOnError();
        return { ok: false, reason: "refund_failed" };
      }
    }

    const transfer = await stripe.transfers.create({
      amount: washerNet,
      currency: "usd",
      destination: stripeAccountId,
      source_transaction: pi.latest_charge as string,
      metadata: {
        booking_id: booking.id,
        payout_id: payout?.id ?? "",
        approved_by: actorId,
        rush: booking.is_rush ? "1" : "0",
        rush_made_in_time:
          booking.rush_made_in_time === true
            ? "yes"
            : booking.rush_made_in_time === false
            ? "no"
            : "unknown",
      },
    });
    // Upsert (not update-only) so a release-without-prior-complete-insert
    // doesn't silently transfer funds without a DB record. Migration 0006
    // gives us a unique index on (booking_id, kind) so this is a clean
    // conflict target. Without this, the wallet permanently forgets any
    // payout where the /complete insert was skipped or RLS-blocked.
    await supabase
      .from("payouts")
      .upsert(
        {
          booking_id: booking.id,
          washer_id: booking.assigned_washer_id ?? null,
          partner_id: booking.assigned_partner_id ?? null,
          kind: "wash",
          amount_cents: washerNet,
          status: "paid",
          stripe_transfer_id: transfer.id,
        },
        { onConflict: "booking_id,kind" }
      );
    await supabase
      .from("bookings")
      .update({ funds_released_at: new Date().toISOString(), status: "funded" })
      .eq("id", booking.id);
    // Achievement freebie: any credit reserved against this booking is now
    // burned — final state, no take-backs once the wash is funded.
    await supabase
      .from("customer_credits")
      .update({ status: "redeemed", redeemed_at: new Date().toISOString(), redeemed_for_booking_id: booking.id })
      .eq("reserved_for_booking_id", booking.id)
      .eq("status", "reserved");
    await supabase.from("booking_events").insert({
      booking_id: booking.id,
      type: "funds_released",
      actor_id: actorId,
      payload: {
        transfer_id: transfer.id,
        amount_cents: washerNet,
        rush_refund_cents: customerRefundCents,
      },
    });

    // Tell the pro the money's on its way.
    const recipient = booking.assigned_washer_id ?? booking.assigned_partner_id;
    if (recipient) {
      const rushNote = booking.is_rush
        ? booking.rush_made_in_time === true
          ? " (rush bonus included)"
          : booking.rush_made_in_time === false
          ? " (rush deadline missed — bonus forfeited)"
          : ""
        : "";
      sendPushToUser(recipient, {
        title: "Customer approved · you've been paid ✓",
        body: `$${(washerNet / 100).toFixed(2)} on the way to your account${rushNote}.`,
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
    await releaseLockOnError();
    return { ok: false, reason: "stripe_error" };
  }
}
