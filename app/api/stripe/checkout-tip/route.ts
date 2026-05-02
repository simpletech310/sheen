import { NextResponse } from "next/server";
import { createClient, createServiceClient } from "@/lib/supabase/server";
import { getStripe } from "@/lib/stripe/server";
import { checkStripeReadiness } from "@/lib/stripe/readiness";
import { z } from "zod";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// $1 floor (Stripe's minimum is $0.50, but a sub-$1 tip is almost always a UI bug)
// and $500 ceiling so a slipped decimal can't accidentally drain a card.
const MIN_TIP_CENTS = 100;
const MAX_TIP_CENTS = 50_000;

const Body = z.object({
  booking_id: z.string().uuid(),
  amount_cents: z.number().int().min(MIN_TIP_CENTS).max(MAX_TIP_CENTS),
});

const TIPPABLE_STATUSES = new Set(["completed", "funded"]);

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

  if (!TIPPABLE_STATUSES.has(booking.status)) {
    return NextResponse.json({ error: "Tips are only accepted after the wash is complete." }, { status: 400 });
  }

  // 2. Resolve pro Stripe account
  const proId = booking.assigned_washer_id ?? booking.assigned_partner_id;
  if (!proId) {
    return NextResponse.json({ error: "No pro assigned to this booking" }, { status: 400 });
  }

  // Use the service-role client for the Stripe-account lookup. RLS on
  // `washer_profiles` only allows `auth.uid() = user_id` to read, so a
  // customer running this request can't see the washer's row and the
  // lookup would return null even when the pro has finished onboarding.
  // (`partner_profiles` has a public-read policy, but we use the service
  // client there too for consistency.)
  const admin = createServiceClient();

  let stripeAccountId: string | null = null;
  if (booking.assigned_washer_id) {
    const { data: wp } = await admin
      .from("washer_profiles")
      .select("stripe_account_id")
      .eq("user_id", booking.assigned_washer_id)
      .maybeSingle();
    stripeAccountId = wp?.stripe_account_id ?? null;
  } else if (booking.assigned_partner_id) {
    const { data: pp } = await admin
      .from("partner_profiles")
      .select("stripe_account_id")
      .eq("user_id", booking.assigned_partner_id)
      .maybeSingle();
    stripeAccountId = pp?.stripe_account_id ?? null;
  }

  if (!stripeAccountId) {
    return NextResponse.json({ error: "Pro has no connected Stripe account" }, { status: 400 });
  }

  // Don't ship a destination charge to a half-onboarded account — Stripe will
  // accept the PI but the funds won't actually settle to the pro.
  const readiness = await checkStripeReadiness(stripeAccountId);
  if (!readiness.ready) {
    return NextResponse.json(
      { error: "Your pro can't receive tips right now. We've notified them." },
      { status: 409 }
    );
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
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
