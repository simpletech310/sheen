import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getStripe } from "@/lib/stripe/server";

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

  // Read available balance on the connected account
  const balance = await stripe.balance.retrieve(undefined, { stripeAccount: wp.stripe_account_id });
  const usd = balance.available.find((b) => b.currency === "usd");
  if (!usd || usd.amount <= 0) {
    return NextResponse.json({ error: "No available balance" }, { status: 400 });
  }

  try {
    const payout = await stripe.payouts.create(
      { amount: usd.amount, currency: "usd", method: "instant" },
      { stripeAccount: wp.stripe_account_id }
    );
    return NextResponse.json({ ok: true, payout_id: payout.id, amount: payout.amount });
  } catch (e: any) {
    return NextResponse.json(
      {
        error: e.message ?? "Instant payout failed",
        code: e.code,
        hint:
          "Instant payouts require a debit card on the connected account. Use the standard same-day option if not configured.",
      },
      { status: 400 }
    );
  }
}
