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
    .select(
      "id, customer_id, assigned_washer_id, assigned_partner_id, status, is_rush, rush_deadline, arrived_at, rush_made_in_time"
    )
    .eq("id", params.id)
    .maybeSingle();
  if (!booking) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (booking.assigned_washer_id !== user.id && booking.assigned_partner_id !== user.id) {
    return NextResponse.json({ error: "Not allowed" }, { status: 403 });
  }
  if (["completed", "cancelled", "disputed"].includes(booking.status)) {
    return NextResponse.json({ error: "Booking is closed" }, { status: 409 });
  }

  // Stamp arrived_at on the first arrival event. For rush bookings,
  // also lock in the made-in-time verdict here so the payout step
  // doesn't have to re-derive it. Only set if not already set so
  // re-arrival is idempotent.
  const arrivedAtIso = (booking as any).arrived_at ?? new Date().toISOString();
  let madeInTime: boolean | null = (booking as any).rush_made_in_time;
  if (
    (booking as any).is_rush &&
    madeInTime === null &&
    (booking as any).rush_deadline
  ) {
    madeInTime =
      new Date(arrivedAtIso).getTime() <=
      new Date((booking as any).rush_deadline).getTime();
  }

  await supabase
    .from("bookings")
    .update({
      status: STEPS.arrived.status,
      arrived_at: arrivedAtIso,
      rush_made_in_time: madeInTime,
    })
    .eq("id", params.id);

  await supabase.from("booking_events").insert({
    booking_id: params.id,
    type: STEPS.arrived.eventType,
    actor_id: user.id,
  });

  notifyCustomerStatus(booking.customer_id, params.id, STEPS.arrived).catch(() => {});

  return NextResponse.json({ ok: true });
}
