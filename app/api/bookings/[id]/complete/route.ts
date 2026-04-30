import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getStripe } from "@/lib/stripe/server";
import { computeFees } from "@/lib/stripe/fees";
import { awardPoints, pointsForService, checkAchievements } from "@/lib/loyalty";
import { sendPushToUser } from "@/lib/push";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(_req: Request, { params }: { params: { id: string } }) {
  const supabase = createClient();
  const stripe = getStripe();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  const { data: booking } = await supabase
    .from("bookings")
    .select("id, assigned_washer_id, assigned_partner_id, service_cents, stripe_payment_intent_id, status, customer_id")
    .eq("id", params.id)
    .maybeSingle();

  if (!booking) return NextResponse.json({ error: "Not found" }, { status: 404 });
  const isWasher = booking.assigned_washer_id === user.id;
  const isPartner = booking.assigned_partner_id === user.id;
  if (!isWasher && !isPartner) {
    return NextResponse.json({ error: "Not allowed" }, { status: 403 });
  }
  if (booking.status === "completed") {
    return NextResponse.json({ ok: true, already_complete: true });
  }

  // Mark complete
  await supabase
    .from("bookings")
    .update({ status: "completed", completed_at: new Date().toISOString() })
    .eq("id", params.id);

  // Compute fees and look up the recipient's connected account
  const fees = computeFees({
    serviceCents: booking.service_cents,
    routedTo: isPartner ? "partner" : "solo_washer",
  });

  let stripeAccountId: string | null = null;
  if (isWasher) {
    const { data: wp } = await supabase
      .from("washer_profiles")
      .select("stripe_account_id, jobs_completed")
      .eq("user_id", user.id)
      .maybeSingle();
    stripeAccountId = wp?.stripe_account_id ?? null;
    // Increment job count
    await supabase
      .from("washer_profiles")
      .update({ jobs_completed: (wp?.jobs_completed ?? 0) + 1 })
      .eq("user_id", user.id);
  } else if (isPartner) {
    const { data: pp } = await supabase
      .from("partner_profiles")
      .select("stripe_account_id, jobs_completed")
      .eq("user_id", user.id)
      .maybeSingle();
    stripeAccountId = pp?.stripe_account_id ?? null;
    await supabase
      .from("partner_profiles")
      .update({ jobs_completed: (pp?.jobs_completed ?? 0) + 1 })
      .eq("user_id", user.id);
  }

  // Upsert payout row in 'pending' state
  const { data: payout } = await supabase
    .from("payouts")
    .upsert(
      {
        washer_id: isWasher ? user.id : null,
        partner_id: isPartner ? user.id : null,
        booking_id: booking.id,
        amount_cents: fees.washerOrPartnerNet,
        status: "pending",
        kind: "wash",
      },
      { onConflict: "booking_id,kind" }
    )
    .select("id")
    .maybeSingle();

  // Attempt Stripe transfer if we have a connected account + a successful charge
  if (stripeAccountId && booking.stripe_payment_intent_id) {
    try {
      const pi = await stripe.paymentIntents.retrieve(booking.stripe_payment_intent_id);
      if (pi.status === "succeeded") {
        const transfer = await stripe.transfers.create({
          amount: fees.washerOrPartnerNet,
          currency: "usd",
          destination: stripeAccountId,
          source_transaction: pi.latest_charge as string,
          metadata: {
            booking_id: booking.id,
            payout_id: payout?.id ?? "",
          },
        });
        await supabase
          .from("payouts")
          .update({ stripe_transfer_id: transfer.id })
          .eq("booking_id", booking.id);
      }
    } catch (e: any) {
      // Don't fail the request — keep payout pending and let ops investigate.
      await supabase.from("booking_events").insert({
        booking_id: booking.id,
        type: "transfer_failed",
        actor_id: user.id,
        payload: { error: e.message ?? String(e) },
      });
    }
  }

  await supabase.from("booking_events").insert({
    booking_id: booking.id,
    type: "completed",
    actor_id: user.id,
    payload: { net_to_pro_cents: fees.washerOrPartnerNet },
  });

  // Loyalty: award points to the customer + check achievements both sides
  try {
    const earned = pointsForService(booking.service_cents);
    if (earned > 0) {
      await awardPoints({
        userId: booking.customer_id,
        points: earned,
        reason: "wash_completed",
        bookingId: booking.id,
      });
    }
    await supabase.from("bookings").update({ points_earned: earned }).eq("id", booking.id);
    const customerNew = await checkAchievements(booking.customer_id);
    const proNew = await checkAchievements(user.id);

    // Push notifications
    await sendPushToUser(booking.customer_id, {
      title: "Your Sheen is done",
      body: "Tap to rate and tip your pro.",
      url: `/app/rate/${booking.id}`,
      tag: `booking-${booking.id}`,
    }).catch(() => {});
    for (const a of [...customerNew]) {
      await sendPushToUser(booking.customer_id, {
        title: "New badge unlocked",
        body: a.replace(/_/g, " "),
        url: "/app/me/achievements",
      }).catch(() => {});
    }
    for (const a of [...proNew]) {
      await sendPushToUser(user.id, {
        title: "New badge unlocked",
        body: a.replace(/_/g, " "),
      }).catch(() => {});
    }
  } catch (e) {
    console.error("Loyalty/push error:", e);
  }

  return NextResponse.json({ ok: true });
}
