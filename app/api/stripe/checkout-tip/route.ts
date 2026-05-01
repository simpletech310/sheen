import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getStripe } from "@/lib/stripe/server";
import { z } from "zod";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const Body = z.object({
  booking_id: z.string().uuid(),
  amount_cents: z.number().int().positive(),
});

export async function POST(req: Request) {
  const supabase = createClient();
  const stripe = getStripe();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  let body;
  try {
    body = Body.parse(await req.json());
  } catch (e: any) {
    return NextResponse.json({ error: "Invalid input" }, { status: 400 });
  }

  // 1. Verify booking
  const { data: booking } = await supabase
    .from("bookings")
    .select("id, customer_id, assigned_washer_id, assigned_partner_id, status")
    .eq("id", body.booking_id)
    .maybeSingle();

  if (!booking || booking.customer_id !== user.id) {
    return NextResponse.json({ error: "Booking not found" }, { status: 404 });
  }

  // 2. Resolve pro Stripe account
  const proId = booking.assigned_washer_id ?? booking.assigned_partner_id;
  if (!proId) {
    return NextResponse.json({ error: "No pro assigned to this booking" }, { status: 400 });
  }

  let stripeAccountId: string | null = null;
  if (booking.assigned_washer_id) {
    const { data: wp } = await supabase
      .from("washer_profiles")
      .select("stripe_account_id")
      .eq("user_id", booking.assigned_washer_id)
      .maybeSingle();
    stripeAccountId = wp?.stripe_account_id ?? null;
  } else if (booking.assigned_partner_id) {
    const { data: pp } = await supabase
      .from("partner_profiles")
      .select("stripe_account_id")
      .eq("user_id", booking.assigned_partner_id)
      .maybeSingle();
    stripeAccountId = pp?.stripe_account_id ?? null;
  }

  if (!stripeAccountId) {
    return NextResponse.json({ error: "Pro has no connected Stripe account" }, { status: 400 });
  }

  // 3. Create PaymentIntent as a Destination Charge
  // This routes the funds directly to the pro's account.
  try {
    const pi = await stripe.paymentIntents.create({
      amount: body.amount_cents,
      currency: "usd",
      metadata: {
        booking_id: booking.id,
        kind: "tip",
        customer_id: user.id,
        pro_id: proId,
        is_partner: booking.assigned_partner_id ? "true" : "false",
      },
      transfer_data: {
        destination: stripeAccountId,
      },
    });

    return NextResponse.json({
      client_secret: pi.client_secret,
      id: pi.id,
    });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
