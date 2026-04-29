import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { computeFees } from "@/lib/stripe/fees";

export async function POST(_req: Request, { params }: { params: { id: string } }) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  const { data: booking } = await supabase
    .from("bookings")
    .select("id, assigned_washer_id, service_cents")
    .eq("id", params.id)
    .maybeSingle();

  if (!booking || booking.assigned_washer_id !== user.id) {
    return NextResponse.json({ error: "Not allowed" }, { status: 403 });
  }

  await supabase
    .from("bookings")
    .update({ status: "completed", completed_at: new Date().toISOString() })
    .eq("id", params.id);

  const fees = computeFees({ serviceCents: booking.service_cents, routedTo: "solo_washer" });
  await supabase.from("payouts").insert({
    washer_id: user.id,
    booking_id: booking.id,
    amount_cents: fees.washerOrPartnerNet,
    status: "pending",
  });

  await supabase.from("booking_events").insert({
    booking_id: booking.id,
    type: "completed",
    actor_id: user.id,
  });

  return NextResponse.json({ ok: true });
}
