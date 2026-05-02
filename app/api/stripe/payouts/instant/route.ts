import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getStripe } from "@/lib/stripe/server";
import { invalidateBalance } from "@/lib/stripe/balance-cache";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST() {
  const supabase = createClient();
  const stripe = getStripe();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  const { data: wp } = await supabase
    .from("washer_profiles")
    .select("stripe_account_id")
    .eq("user_id", user.id)
    .maybeSingle();
  if (!wp?.stripe_account_id) {
    return NextResponse.json({ error: "Stripe not connected" }, { status: 400 });
  }

  // Read both `available` and `instant_available` on the connected
  // account. Stripe lets instant payouts draw on instant_available —
  // funds tied to charges that haven't fully settled yet but are
  // eligible for the instant network. This is what makes "cash out
  // the moment a wash funds" possible: in test mode (and for any
  // account with debit-card payouts in prod) it's well above zero
  // while `available` is still zero for 1-2 days.
  const balance = await stripe.balance.retrieve(undefined, {
    stripeAccount: wp.stripe_account_id,
  });
  const availableCents =
    balance.available.find((b) => b.currency === "usd")?.amount ?? 0;
  const instantAvailableCents =
    (balance as any).instant_available?.find((b: any) => b.currency === "usd")
      ?.amount ?? 0;
  const cashable = Math.max(availableCents, instantAvailableCents);

  if (cashable <= 0) {
    return NextResponse.json(
      {
        error:
          "Funds are still settling on Stripe — usually within a few minutes after a wash funds. Try again in a moment.",
        code: "no_balance",
      },
      { status: 400 }
    );
  }

  try {
    // Instant first — draws on instant_available, lands on a debit card
    // (or, in test mode, the default external account) within minutes.
    const payout = await stripe.payouts.create(
      { amount: cashable, currency: "usd", method: "instant" },
      { stripeAccount: wp.stripe_account_id }
    );
    invalidateBalance(wp.stripe_account_id);
    return NextResponse.json({
      ok: true,
      payout_id: payout.id,
      amount: payout.amount,
      method: payout.method,
    });
  } catch (e: any) {
    // No instant-eligible card on this account — fall back to a standard
    // payout against `available` only (1-2 business days arrival).
    if (availableCents > 0) {
      try {
        const std = await stripe.payouts.create(
          { amount: availableCents, currency: "usd", method: "standard" },
          { stripeAccount: wp.stripe_account_id }
        );
        invalidateBalance(wp.stripe_account_id);
        return NextResponse.json({
          ok: true,
          payout_id: std.id,
          amount: std.amount,
          method: std.method,
          hint:
            "Sent as a standard payout — arrives in 1–2 business days. Add a debit card to your Stripe payout settings to enable instant cash out next time.",
        });
      } catch {
        // fall through to the error response below
      }
    }
    return NextResponse.json(
      {
        error: e.message ?? "Cash out failed",
        code: e.code,
        hint:
          "Add a debit card to your Stripe payout settings for instant cash out, or wait for funds to clear for a standard payout.",
      },
      { status: 400 }
    );
  }
}
