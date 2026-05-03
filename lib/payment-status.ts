// Single source of truth for "is this booking actually paid?"
//
// Used by /api/bookings/[id]/claim (block washers from wasting a
// trip on an unpaid booking) and /api/bookings/[id]/complete (hard
// stop — never let a job flip to "completed" if money never moved).
//
// Three legitimate ways a booking is considered paid:
//   1. Stripe PaymentIntent in "succeeded" state (the normal flow).
//   2. Membership covers it (membership_id set, total_cents = 0,
//      no PI ever created).
//   3. Achievement credit / loyalty points cover it in full
//      (total_cents = 0, no PI). The loyalty path also lands here
//      when the customer redeems enough points to drop the charge
//      under Stripe's 50¢ minimum.
//
// Anything else — PI in any non-succeeded status, or no PI on a
// non-zero booking — is treated as unpaid.

import type { SupabaseClient } from "@supabase/supabase-js";
import type Stripe from "stripe";

export type PaymentStatus =
  | { ok: true; mode: "stripe" | "covered" }
  | { ok: false; reason: string };

export async function getBookingPaymentStatus(
  supabase: SupabaseClient,
  stripe: Stripe,
  bookingId: string
): Promise<PaymentStatus> {
  const { data: booking } = await supabase
    .from("bookings")
    .select("id, total_cents, stripe_payment_intent_id, membership_id")
    .eq("id", bookingId)
    .maybeSingle();

  if (!booking) return { ok: false, reason: "booking not found" };

  // Stripe path: a PI was created. Trust the live PI status, not any
  // local cache — the PI may have been refunded, disputed, or never
  // confirmed since the row was first written.
  if (booking.stripe_payment_intent_id) {
    try {
      const pi = await stripe.paymentIntents.retrieve(booking.stripe_payment_intent_id);
      if (pi.status === "succeeded") {
        return { ok: true, mode: "stripe" };
      }
      return {
        ok: false,
        reason: `payment hasn't completed (status: ${pi.status})`,
      };
    } catch {
      return { ok: false, reason: "could not verify payment with Stripe" };
    }
  }

  // No-PI path: must be fully covered. We accept zero total_cents as
  // proof — the checkout endpoint only short-circuits PI creation
  // when membership/credit/loyalty already brought the bill to $0.
  if ((booking.total_cents ?? 0) === 0) {
    return { ok: true, mode: "covered" };
  }

  return {
    ok: false,
    reason: "no payment on file for this booking",
  };
}
