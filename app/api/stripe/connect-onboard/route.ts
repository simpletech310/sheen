import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getStripe } from "@/lib/stripe/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  const { data: profile } = await supabase
    .from("washer_profiles")
    .select("stripe_account_id")
    .eq("user_id", user.id)
    .maybeSingle();

  let acctId = profile?.stripe_account_id ?? null;

  if (!acctId) {
    const acct = await getStripe().accounts.create({
      type: "express",
      email: user.email!,
      capabilities: { transfers: { requested: true }, card_payments: { requested: true } },
      metadata: { user_id: user.id },
    });
    acctId = acct.id;
    await supabase.from("washer_profiles").upsert({ user_id: user.id, stripe_account_id: acctId });
    await supabase.from("users").update({ role: "washer" }).eq("id", user.id);
  }

  const origin = process.env.NEXT_PUBLIC_APP_URL ?? new URL("/", "http://localhost:3000").origin;
  const link = await getStripe().accountLinks.create({
    account: acctId,
    refresh_url: `${origin}/pro/onboard`,
    return_url: `${origin}/pro/queue`,
    type: "account_onboarding",
  });

  return NextResponse.json({ url: link.url });
}
