import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { sendPushToUser } from "@/lib/push";
import { z } from "zod";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const Body = z.object({
  window: z.string().min(3).max(64), // same format as booking creation
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

export async function POST(req: Request, { params }: { params: { id: string } }) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  const parsed = Body.parse(await req.json());

  const { data: booking } = await supabase
    .from("bookings")
    .select("id, customer_id, status, scheduled_window_start, assigned_washer_id, assigned_partner_id")
    .eq("id", params.id)
    .maybeSingle();
  if (!booking) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (booking.customer_id !== user.id) {
    return NextResponse.json({ error: "Not allowed" }, { status: 403 });
  }
  if (!["pending", "matched"].includes(booking.status)) {
    return NextResponse.json(
      { error: "Can't reschedule once the pro is on the way." },
      { status: 409 }
    );
  }
  // No reschedule within 1 hour of the existing window.
  const start = new Date(booking.scheduled_window_start).getTime();
  if (start - Date.now() < 60 * 60 * 1000) {
    return NextResponse.json(
      { error: "Reschedule must happen at least 1 hour before the window." },
      { status: 409 }
    );
  }

  const { start: newStart, end: newEnd } = parseWindow(parsed.window);
  await supabase
    .from("bookings")
    .update({
      scheduled_window_start: newStart.toISOString(),
      scheduled_window_end: newEnd.toISOString(),
    })
    .eq("id", params.id);

  await supabase.from("booking_events").insert({
    booking_id: params.id,
    type: "rescheduled",
    actor_id: user.id,
    payload: {
      old_start: booking.scheduled_window_start,
      new_start: newStart.toISOString(),
    },
  });

  // Notify the assigned pro.
  const proId = booking.assigned_washer_id ?? booking.assigned_partner_id;
  if (proId) {
    sendPushToUser(proId, {
      title: "Booking rescheduled",
      body: "Customer changed the time. Check the new window.",
      url: `/pro/queue/${params.id}`,
      tag: `booking-${params.id}`,
    }).catch(() => {});
  }

  return NextResponse.json({ ok: true });
}
