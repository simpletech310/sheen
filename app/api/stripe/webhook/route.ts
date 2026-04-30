import { NextResponse } from "next/server";
import { getStripe } from "@/lib/stripe/server";
import { createServiceClient } from "@/lib/supabase/server";
import type Stripe from "stripe";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const sig = req.headers.get("stripe-signature");
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  const body = await req.text();

  let event: Stripe.Event;
  try {
    if (!sig || !secret) {
      event = JSON.parse(body) as Stripe.Event;
    } else {
      event = getStripe().webhooks.constructEvent(body, sig, secret);
    }
  } catch (err: any) {
    return NextResponse.json({ error: `Webhook signature verification failed: ${err.message}` }, { status: 400 });
  }

  const supabase = createServiceClient();

  try {
    switch (event.type) {
      // ─── Customer payments ─────────────────────────────────────────
      case "payment_intent.succeeded": {
        const pi = event.data.object as Stripe.PaymentIntent;
        const bookingId = pi.metadata?.booking_id;
        if (bookingId) {
          await supabase
            .from("bookings")
            .update({ status: "matched" })
            .eq("id", bookingId)
            .eq("status", "pending");
          await supabase.from("booking_events").insert({
            booking_id: bookingId,
            type: "payment_succeeded",
            payload: { amount: pi.amount, payment_intent: pi.id },
          });
        }
        break;
      }
      case "payment_intent.payment_failed": {
        const pi = event.data.object as Stripe.PaymentIntent;
        const bookingId = pi.metadata?.booking_id;
        if (bookingId) {
          await supabase.from("booking_events").insert({
            booking_id: bookingId,
            type: "payment_failed",
            payload: { reason: pi.last_payment_error?.message ?? "unknown" },
          });
        }
        break;
      }

      // ─── Connect accounts (washer + partner) ───────────────────────
      case "account.updated": {
        const acct = event.data.object as Stripe.Account;
        if (acct.charges_enabled && acct.payouts_enabled) {
          // Activate washer
          await supabase
            .from("washer_profiles")
            .update({ status: "active" })
            .eq("stripe_account_id", acct.id);
          // Activate partner
          await supabase
            .from("partner_profiles")
            .update({ status: "active" })
            .eq("stripe_account_id", acct.id);
        }
        break;
      }

      // ─── Transfers (washer payouts) ────────────────────────────────
      case "transfer.created": {
        const tr = event.data.object as Stripe.Transfer;
        const bookingId = tr.metadata?.booking_id;
        if (bookingId) {
          await supabase
            .from("payouts")
            .update({ status: "paid", stripe_transfer_id: tr.id })
            .eq("booking_id", bookingId);
        }
        break;
      }
      case "transfer.reversed": {
        const tr = event.data.object as Stripe.Transfer;
        const bookingId = tr.metadata?.booking_id;
        if (bookingId) {
          await supabase
            .from("payouts")
            .update({ status: "reversed" })
            .eq("booking_id", bookingId);
        }
        break;
      }

      // ─── Refunds ──────────────────────────────────────────────────
      case "charge.refunded": {
        const ch = event.data.object as Stripe.Charge;
        const bookingId = ch.metadata?.booking_id;
        if (bookingId) {
          await supabase.from("booking_events").insert({
            booking_id: bookingId,
            type: "refunded",
            payload: { amount_refunded: ch.amount_refunded },
          });
        }
        break;
      }

      // ─── Subscriptions (memberships) ───────────────────────────────
      case "customer.subscription.created":
      case "customer.subscription.updated": {
        const sub = event.data.object as Stripe.Subscription;
        const userId = sub.metadata?.user_id;
        const planId = sub.metadata?.plan_id;
        if (userId) {
          const fields = {
            stripe_subscription_id: sub.id,
            stripe_customer_id: typeof sub.customer === "string" ? sub.customer : sub.customer.id,
            status: sub.status === "active" || sub.status === "trialing" ? "active"
                  : sub.status === "past_due" ? "past_due"
                  : sub.status === "canceled" ? "cancelled"
                  : "paused",
            current_period_start: new Date((sub as any).current_period_start * 1000).toISOString(),
            current_period_end: new Date((sub as any).current_period_end * 1000).toISOString(),
            cancel_at_period_end: sub.cancel_at_period_end,
          };
          await supabase
            .from("memberships")
            .update(fields)
            .eq("stripe_subscription_id", sub.id);
        }
        break;
      }
      case "customer.subscription.deleted": {
        const sub = event.data.object as Stripe.Subscription;
        await supabase
          .from("memberships")
          .update({ status: "cancelled" })
          .eq("stripe_subscription_id", sub.id);
        break;
      }
      case "invoice.paid": {
        const inv = event.data.object as Stripe.Invoice;
        const subId = (inv as any).subscription;
        if (typeof subId === "string") {
          // New billing period — reset washes_used
          await supabase
            .from("memberships")
            .update({ washes_used: 0 })
            .eq("stripe_subscription_id", subId);
        }
        break;
      }
    }
  } catch (e) {
    console.error("Webhook handler error:", e);
  }

  return NextResponse.json({ received: true });
}
