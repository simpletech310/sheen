import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getStripe } from "@/lib/stripe/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function DELETE(_req: Request, { params }: { params: { pmId: string } }) {
  const supabase = createClient();
  const stripe = getStripe();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  // Confirm the payment method belongs to one of this user's customers.
  const { data: m } = await supabase
    .from("memberships")
    .select("stripe_customer_id")
    .eq("user_id", user.id)
    .maybeSingle();
  if (!m?.stripe_customer_id) {
    return NextResponse.json({ error: "No saved cards" }, { status: 404 });
  }

  try {
    const pm = await stripe.paymentMethods.retrieve(params.pmId);
    if (pm.customer !== m.stripe_customer_id) {
      return NextResponse.json({ error: "Not allowed" }, { status: 403 });
    }
    await stripe.paymentMethods.detach(params.pmId);
    return NextResponse.json({ ok: true });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 400 });
  }
}
