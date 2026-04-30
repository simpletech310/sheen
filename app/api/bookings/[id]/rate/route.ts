import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getStripe } from "@/lib/stripe/server";
import { sendPushToUser } from "@/lib/push";
import { z } from "zod";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const Body = z.object({
  stars: z.number().int().min(1).max(5),
  tip_pct: z.number().min(0).max(100).default(0),
  comment: z.string().optional().default(""),
});

export async function POST(req: Request, { params }: { params: { id: string } }) {
  const supabase = createClient();
  const stripe = getStripe();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  const body = Body.parse(await req.json());

  const { data: booking } = await supabase
    .from("bookings")
    .select(
      "id, customer_id, assigned_washer_id, assigned_partner_id, service_cents, stripe_payment_intent_id"
    )
    .eq("id", params.id)
    .maybeSingle();
  if (!booking || booking.customer_id !== user.id) {
    return NextResponse.json({ error: "Booking not found" }, { status: 404 });
  }

  const tipCents = Math.round((booking.service_cents * body.tip_pct) / 100);

  await supabase
    .from("bookings")
    .update({ tip_cents: tipCents })
    .eq("id", params.id);

  // Save the review (one per booking).
  const proId = booking.assigned_washer_id ?? booking.assigned_partner_id;
  if (proId) {
    await supabase.from("reviews").upsert({
      booking_id: booking.id,
      rating_int: body.stars,
      comment: body.comment,
      reviewer_id: user.id,
      reviewee_id: proId,
    });
  }

  // Tip transfer: 100% of the tip routes to the pro's connected Stripe
  // account on top of the wash payout. If anything fails, log a booking_event
  // and let ops follow up — never fail the customer's request.
  if (tipCents > 0 && proId && booking.stripe_payment_intent_id) {
    try {
      // Resolve the connected account for the pro.
      let stripeAccountId: string | null = null;
      if (booking.assigned_washer_id) {
        const { data: wp } = await supabase
          .from("washer_profiles")
          .select("stripe_account_id")
          .eq("user_id", booking.assigned_washer_id)
          .maybeSingle();
        stripeAccountId = wp?.stripe_account_id ?? null;
      } else if (booking.assigned_partner_id) {
        const { data: pp } = await supabase
          .from("partner_profiles")
          .select("stripe_account_id")
          .eq("user_id", booking.assigned_partner_id)
          .maybeSingle();
        stripeAccountId = pp?.stripe_account_id ?? null;
      }

      if (stripeAccountId) {
        const pi = await stripe.paymentIntents.retrieve(booking.stripe_payment_intent_id);
        if (pi.status === "succeeded") {
          const transfer = await stripe.transfers.create({
            amount: tipCents,
            currency: "usd",
            destination: stripeAccountId,
            source_transaction: pi.latest_charge as string,
            metadata: {
              booking_id: booking.id,
              kind: "tip",
            },
          });

          // Record an additional payout row for the tip so the wallet shows it.
          await supabase.from("payouts").insert({
            washer_id: booking.assigned_washer_id,
            partner_id: booking.assigned_partner_id,
            booking_id: booking.id,
            amount_cents: tipCents,
            status: "paid",
            stripe_transfer_id: transfer.id,
            kind: "tip",
          });

          await supabase.from("booking_events").insert({
            booking_id: booking.id,
            type: "tip_transferred",
            actor_id: user.id,
            payload: { amount_cents: tipCents, transfer_id: transfer.id },
          });

          // Notify the pro.
          sendPushToUser(proId, {
            title: "Tip received 🎁",
            body: `$${(tipCents / 100).toFixed(2)} just landed in your wallet.`,
            url: "/pro/wallet",
            tag: `tip-${booking.id}`,
          }).catch(() => {});
        }
      }
    } catch (e: any) {
      await supabase.from("booking_events").insert({
        booking_id: booking.id,
        type: "tip_transfer_failed",
        actor_id: user.id,
        payload: { error: e.message ?? String(e), amount_cents: tipCents },
      });
    }
  }

  await supabase.from("booking_events").insert({
    booking_id: booking.id,
    type: "rated",
    actor_id: user.id,
    payload: { stars: body.stars, tip_cents: tipCents },
  });

  return NextResponse.json({ ok: true });
}
