import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getStripe } from "@/lib/stripe/server";
import { getCachedBalance, setCachedBalance } from "@/lib/stripe/balance-cache";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** GET /api/stripe/balance — returns Stripe balance for the calling user's
 *  connected account (washer Express OR partner Standard). */
export async function GET() {
  const supabase = createClient();
  const stripe = getStripe();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  let stripeAccountId: string | null = null;
  const { data: wp } = await supabase
    .from("washer_profiles")
    .select("stripe_account_id")
    .eq("user_id", user.id)
    .maybeSingle();
  if (wp?.stripe_account_id) stripeAccountId = wp.stripe_account_id;
  else {
    const { data: pp } = await supabase
      .from("partner_profiles")
      .select("stripe_account_id")
      .eq("user_id", user.id)
      .maybeSingle();
    if (pp?.stripe_account_id) stripeAccountId = pp.stripe_account_id;
  }

  if (!stripeAccountId) {
    return NextResponse.json({
      available_cents: 0,
      pending_cents: 0,
      instant_available_cents: 0,
      connected: false,
    });
  }

  const cached = getCachedBalance(stripeAccountId);
  if (cached) {
    return NextResponse.json({ ...cached, connected: true, cached: true });
  }

  try {
    const balance = await stripe.balance.retrieve(undefined, { stripeAccount: stripeAccountId });
    const av = balance.available.find((b) => b.currency === "usd")?.amount ?? 0;
    const pe = balance.pending.find((b) => b.currency === "usd")?.amount ?? 0;
    // `instant_available` is Stripe's "what an instant payout could draw on
    // right now" — typically funds tied to charges that haven't fully
    // settled but are still eligible for the instant network. This is what
    // gates the Cash Out button: in test mode (and for any account with
    // debit-card payouts in prod) it's well above zero while `available`
    // is still zero, so a pro can withdraw the moment a wash funds.
    const ia =
      (balance as any).instant_available?.find((b: any) => b.currency === "usd")?.amount ?? 0;
    const value = { available_cents: av, pending_cents: pe, instant_available_cents: ia };
    setCachedBalance(stripeAccountId, value);
    return NextResponse.json({ ...value, connected: true });
  } catch (e: any) {
    return NextResponse.json(
      {
        error: e.message,
        available_cents: 0,
        pending_cents: 0,
        instant_available_cents: 0,
        connected: true,
      },
      { status: 200 }
    );
  }
}
