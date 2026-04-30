import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getStripe } from "@/lib/stripe/server";
import { computeFees } from "@/lib/stripe/fees";
import { z } from "zod";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const Body = z.object({
  // Either pass an existing booking_id (re-collect payment) or all the new-booking
  // params we need to create a booking + PaymentIntent in one round-trip.
  booking_id: z.string().uuid().optional(),
  tier_name: z.string().optional(),
  service_cents: z.number().int().positive().optional(),
  address: z
    .object({
      street: z.string(),
      unit: z.string().optional(),
      city: z.string(),
      state: z.string(),
      zip: z.string(),
      lat: z.number().optional(),
      lng: z.number().optional(),
      notes: z.string().optional(),
    })
    .optional(),
  window: z.string().optional(),
});

function parseWindow(w: string): { start: Date; end: Date } {
  const [day, sH, eH] = w.split("_");
  const base = new Date();
  if (day === "tomorrow") base.setDate(base.getDate() + 1);
  const start = new Date(base);
  start.setHours(Number(sH), 0, 0, 0);
  const end = new Date(base);
  end.setHours(Number(eH), 0, 0, 0);
  return { start, end };
}

export async function POST(req: Request) {
  const supabase = createClient();
  const stripe = getStripe();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  const body = Body.parse(await req.json());

  let bookingId = body.booking_id;
  let serviceCents: number;

  if (!bookingId) {
    if (!body.tier_name || !body.service_cents || !body.address || !body.window) {
      return NextResponse.json({ error: "Missing booking fields" }, { status: 400 });
    }
    // Look up service id
    const { data: svc } = await supabase
      .from("services")
      .select("id")
      .eq("category", "auto")
      .eq("tier_name", body.tier_name)
      .maybeSingle();
    if (!svc) return NextResponse.json({ error: "Unknown service" }, { status: 400 });

    const { data: addr } = await supabase
      .from("addresses")
      .insert({
        user_id: user.id,
        tag: "JOB",
        street: body.address.street + (body.address.unit ? ` ${body.address.unit}` : ""),
        city: body.address.city,
        state: body.address.state,
        zip: body.address.zip,
        lat: body.address.lat ?? null,
        lng: body.address.lng ?? null,
        notes: body.address.notes ?? null,
      })
      .select("id")
      .single();
    if (!addr) return NextResponse.json({ error: "Could not save address" }, { status: 400 });

    const fees = computeFees({ serviceCents: body.service_cents, routedTo: "solo_washer" });
    const { start, end } = parseWindow(body.window);

    const { data: booking, error: bookingErr } = await supabase
      .from("bookings")
      .insert({
        customer_id: user.id,
        service_id: svc.id,
        address_id: addr.id,
        scheduled_window_start: start.toISOString(),
        scheduled_window_end: end.toISOString(),
        service_cents: fees.serviceCents,
        fees_cents: fees.trustFee,
        total_cents: fees.customerCharge,
        status: "pending",
        customer_note: body.address.notes ?? null,
      })
      .select("id, total_cents, service_cents")
      .single();
    if (bookingErr || !booking) return NextResponse.json({ error: bookingErr?.message ?? "Booking failed" }, { status: 400 });

    bookingId = booking.id;
    serviceCents = booking.service_cents;

    await supabase.from("booking_events").insert({
      booking_id: bookingId,
      type: "created",
      actor_id: user.id,
      payload: { tier: body.tier_name, total_cents: booking.total_cents },
    });
  } else {
    const { data: existing } = await supabase
      .from("bookings")
      .select("id, customer_id, service_cents, total_cents, status")
      .eq("id", bookingId)
      .maybeSingle();
    if (!existing || existing.customer_id !== user.id) {
      return NextResponse.json({ error: "Booking not found" }, { status: 404 });
    }
    serviceCents = existing.service_cents;
  }

  const fees = computeFees({ serviceCents, routedTo: "solo_washer" });

  // Create or fetch a Stripe Customer for this user (so saved cards persist).
  const { data: profile } = await supabase
    .from("customer_profiles")
    .select("default_payment_method_id")
    .eq("user_id", user.id)
    .maybeSingle();

  let stripeCustomerId: string;
  const { data: existingMembership } = await supabase
    .from("memberships")
    .select("stripe_customer_id")
    .eq("user_id", user.id)
    .maybeSingle();
  if (existingMembership?.stripe_customer_id) {
    stripeCustomerId = existingMembership.stripe_customer_id;
  } else {
    const cust = await stripe.customers.create({
      email: user.email!,
      metadata: { user_id: user.id },
    });
    stripeCustomerId = cust.id;
  }

  const intent = await stripe.paymentIntents.create({
    amount: fees.customerCharge,
    currency: "usd",
    customer: stripeCustomerId,
    automatic_payment_methods: { enabled: true },
    setup_future_usage: "off_session",
    metadata: { booking_id: bookingId!, user_id: user.id },
  });

  await supabase
    .from("bookings")
    .update({ stripe_payment_intent_id: intent.id })
    .eq("id", bookingId!);

  return NextResponse.json({
    booking_id: bookingId,
    client_secret: intent.client_secret,
    amount_cents: fees.customerCharge,
  });
}
