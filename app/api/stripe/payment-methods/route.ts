import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getStripe } from "@/lib/stripe/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

async function findStripeCustomerId(supabase: any, userId: string) {
  // We persist Stripe customer id on memberships. Fall back to scanning
  // bookings for one if no membership exists.
  const { data: m } = await supabase
    .from("memberships")
    .select("stripe_customer_id")
    .eq("user_id", userId)
    .maybeSingle();
  if (m?.stripe_customer_id) return m.stripe_customer_id as string;
  return null;
}

export async function GET() {
  const supabase = createClient();
  const stripe = getStripe();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  const customerId = await findStripeCustomerId(supabase, user.id);
  if (!customerId) return NextResponse.json({ payment_methods: [] });

  try {
    const list = await stripe.paymentMethods.list({
      customer: customerId,
      type: "card",
      limit: 20,
    });
    return NextResponse.json({
      payment_methods: list.data.map((pm) => ({
        id: pm.id,
        brand: pm.card?.brand ?? "card",
        last4: pm.card?.last4 ?? "····",
        exp_month: pm.card?.exp_month ?? null,
        exp_year: pm.card?.exp_year ?? null,
      })),
    });
  } catch (e: any) {
    return NextResponse.json({ payment_methods: [], error: e.message });
  }
}
