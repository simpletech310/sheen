import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getStripe } from "@/lib/stripe/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** POST /api/stripe/connect-standard
 *  Creates (or reuses) a Connect Standard account for a partner_owner and
 *  returns the AccountLink URL to complete onboarding. */
export async function POST() {
  const supabase = createClient();
  const stripe = getStripe();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  const { data: pp } = await supabase
    .from("partner_profiles")
    .select("stripe_account_id, business_name")
    .eq("user_id", user.id)
    .maybeSingle();
  if (!pp) return NextResponse.json({ error: "Partner profile not found" }, { status: 404 });

  let acctId = pp.stripe_account_id;
  if (!acctId) {
    const acct = await stripe.accounts.create({
      type: "standard",
      email: user.email!,
      business_profile: { name: pp.business_name ?? undefined },
      metadata: { user_id: user.id, partner_business: pp.business_name ?? "" },
    });
    acctId = acct.id;
    await supabase
      .from("partner_profiles")
      .update({ stripe_account_id: acctId })
      .eq("user_id", user.id);
  }

  const origin = process.env.NEXT_PUBLIC_APP_URL ?? new URL("/", "http://localhost:3000").origin;
  const link = await stripe.accountLinks.create({
    account: acctId,
    refresh_url: `${origin}/partner/dashboard`,
    return_url: `${origin}/partner/dashboard?connected=1`,
    type: "account_onboarding",
  });

  return NextResponse.json({ url: link.url });
}
