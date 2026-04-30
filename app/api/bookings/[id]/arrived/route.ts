import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { STEPS, notifyCustomerStatus } from "@/lib/booking-status";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(_req: Request, { params }: { params: { id: string } }) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  const { data: booking } = await supabase
    .from("bookings")
    .select("id, customer_id, assigned_washer_id, assigned_partner_id, status")
    .eq("id", params.id)
    .maybeSingle();
  if (!booking) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (booking.assigned_washer_id !== user.id && booking.assigned_partner_id !== user.id) {
    return NextResponse.json({ error: "Not allowed" }, { status: 403 });
  }
  if (["completed", "cancelled", "disputed"].includes(booking.status)) {
    return NextResponse.json({ error: "Booking is closed" }, { status: 409 });
  }

  await supabase
    .from("bookings")
    .update({ status: STEPS.arrived.status })
    .eq("id", params.id);

  await supabase.from("booking_events").insert({
    booking_id: params.id,
    type: STEPS.arrived.eventType,
    actor_id: user.id,
  });

  notifyCustomerStatus(booking.customer_id, params.id, STEPS.arrived).catch(() => {});

  return NextResponse.json({ ok: true });
}
