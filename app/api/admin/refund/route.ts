import { NextResponse } from "next/server";
import { requireAdmin, logAdminAction } from "@/lib/admin";
import { getStripe } from "@/lib/stripe/server";
import { z } from "zod";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const Body = z.object({
  booking_id: z.string().uuid(),
  amount_cents: z.number().int().positive().optional(),
  reverse_transfer: z.boolean().default(true),
  reason: z.string().optional(),
});

export async function POST(req: Request) {
  const ok = await requireAdmin();
  if ("error" in ok) return ok.error;
  const stripe = getStripe();
  const body = Body.parse(await req.json());

  const { data: booking } = await ok.service
    .from("bookings")
    .select("id, stripe_payment_intent_id, total_cents")
    .eq("id", body.booking_id)
    .maybeSingle();
  if (!booking?.stripe_payment_intent_id) {
    return NextResponse.json({ error: "No PaymentIntent" }, { status: 400 });
  }

  const refund = await stripe.refunds.create({
    payment_intent: booking.stripe_payment_intent_id,
    amount: body.amount_cents,
    reason: "requested_by_customer",
    metadata: { booking_id: booking.id, admin_id: ok.user.id },
  });

  // Reverse the transfer to washer if requested
  if (body.reverse_transfer) {
    const { data: payout } = await ok.service
      .from("payouts")
      .select("stripe_transfer_id")
      .eq("booking_id", booking.id)
      .maybeSingle();
    if (payout?.stripe_transfer_id) {
      try {
        await stripe.transfers.createReversal(payout.stripe_transfer_id, {
          metadata: { booking_id: booking.id, admin_id: ok.user.id },
        });
      } catch (e: any) {
        // Continue — webhook will mark reversed status if it succeeds
        console.error("transfer.reversal failed", e?.message);
      }
    }
  }

  await ok.service
    .from("bookings")
    .update({ status: "cancelled" })
    .eq("id", booking.id);

  await ok.service.from("booking_events").insert({
    booking_id: booking.id,
    type: "refunded",
    actor_id: ok.user.id,
    payload: { refund_id: refund.id, amount: refund.amount, reason: body.reason },
  });

  await logAdminAction({
    actorId: ok.user.id,
    action: "refund",
    targetType: "booking",
    targetId: booking.id,
    payload: { refund_id: refund.id, amount: refund.amount, reverse_transfer: body.reverse_transfer },
  });

  return NextResponse.json({ ok: true, refund_id: refund.id, amount: refund.amount });
}
