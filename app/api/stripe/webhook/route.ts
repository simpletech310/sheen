import { NextResponse } from "next/server";
import { stripe } from "@/lib/stripe/server";
import { createServiceClient } from "@/lib/supabase/server";
import type Stripe from "stripe";

export async function POST(req: Request) {
  const sig = req.headers.get("stripe-signature");
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  const body = await req.text();

  let event: Stripe.Event;
  try {
    if (!sig || !secret) {
      // Dev fallback: parse without verification
      event = JSON.parse(body) as Stripe.Event;
    } else {
      event = stripe.webhooks.constructEvent(body, sig, secret);
    }
  } catch (err: any) {
    return NextResponse.json({ error: `Webhook signature verification failed: ${err.message}` }, { status: 400 });
  }

  const supabase = createServiceClient();

  switch (event.type) {
    case "payment_intent.succeeded": {
      const pi = event.data.object as Stripe.PaymentIntent;
      const bookingId = pi.metadata?.booking_id;
      if (bookingId) {
        await supabase
          .from("bookings")
          .update({ status: "matched" })
          .eq("id", bookingId);
        await supabase.from("booking_events").insert({
          booking_id: bookingId,
          type: "payment_succeeded",
          payload: { amount: pi.amount },
        });
      }
      break;
    }
    case "account.updated": {
      const acct = event.data.object as Stripe.Account;
      if (acct.charges_enabled && acct.payouts_enabled) {
        await supabase
          .from("washer_profiles")
          .update({ status: "active" })
          .eq("stripe_account_id", acct.id);
      }
      break;
    }
  }

  return NextResponse.json({ received: true });
}
