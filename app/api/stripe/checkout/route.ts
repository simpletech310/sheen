import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { stripe } from "@/lib/stripe/server";
import { computeFees } from "@/lib/stripe/fees";

// Create a PaymentIntent for a booking. Funds are held until the booking is marked complete;
// then we transfer to the assigned washer (or partner) via /api/bookings/[id]/complete.
export async function POST(req: Request) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  const { booking_id } = await req.json();

  const { data: booking } = await supabase
    .from("bookings")
    .select("id, customer_id, service_cents")
    .eq("id", booking_id)
    .maybeSingle();
  if (!booking || booking.customer_id !== user.id) {
    return NextResponse.json({ error: "Booking not found" }, { status: 404 });
  }

  const fees = computeFees({ serviceCents: booking.service_cents, routedTo: "solo_washer" });

  const intent = await stripe.paymentIntents.create({
    amount: fees.customerCharge,
    currency: "usd",
    automatic_payment_methods: { enabled: true },
    metadata: { booking_id: booking.id, user_id: user.id },
  });

  await supabase.from("bookings").update({ stripe_payment_intent_id: intent.id }).eq("id", booking.id);

  return NextResponse.json({ client_secret: intent.client_secret });
}
