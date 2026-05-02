import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { ensurePublicUser } from "@/lib/auth";
import { computeFees } from "@/lib/stripe/fees";
import { z } from "zod";

const Body = z.object({
  tier_name: z.string(),
  service_cents: z.number().int().positive(),
  address: z.object({
    street: z.string().min(1),
    city: z.string().min(1),
    state: z.string().length(2),
    zip: z.string().min(3),
    notes: z.string().optional().default(""),
  }),
  window: z.string(),
});

// Map e.g. "tomorrow_10_12" to two timestamps. Quick and dirty for MVP.
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
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  // FK target safety net — bookings.customer_id and addresses.user_id both
  // FK into public.users(id), which can be missing for older accounts.
  await ensurePublicUser(user);

  let parsed;
  try {
    parsed = Body.parse(await req.json());
  } catch (e: any) {
    return NextResponse.json({ error: "Invalid input", detail: e.message }, { status: 400 });
  }

  // Find service id by tier name
  const { data: svc } = await supabase
    .from("services")
    .select("id, base_price_cents")
    .eq("category", "auto")
    .eq("tier_name", parsed.tier_name)
    .maybeSingle();
  if (!svc) return NextResponse.json({ error: "Unknown service" }, { status: 400 });

  // Insert address
  const { data: addr, error: addrErr } = await supabase
    .from("addresses")
    .insert({
      user_id: user.id,
      tag: "JOB",
      street: parsed.address.street,
      city: parsed.address.city,
      state: parsed.address.state,
      zip: parsed.address.zip,
      notes: parsed.address.notes,
    })
    .select("id")
    .single();
  if (addrErr) return NextResponse.json({ error: addrErr.message }, { status: 400 });

  const fees = computeFees({ serviceCents: parsed.service_cents, routedTo: "solo_washer" });
  const { start, end } = parseWindow(parsed.window);

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
      customer_note: parsed.address.notes ?? null,
    })
    .select("id")
    .single();
  if (bookingErr) return NextResponse.json({ error: bookingErr.message }, { status: 400 });

  await supabase.from("booking_events").insert({
    booking_id: booking.id,
    type: "created",
    actor_id: user.id,
    payload: { tier: parsed.tier_name, total_cents: fees.customerCharge },
  });

  // PaymentIntent creation deferred to /api/stripe/checkout — MVP places job in queue immediately
  // and lets washer claim. Stripe charge captured on completion via separate flow.

  return NextResponse.json({ booking_id: booking.id });
}
