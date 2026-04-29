import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { z } from "zod";

const Body = z.object({
  stars: z.number().int().min(1).max(5),
  tip_pct: z.number().min(0).max(100).default(0),
  comment: z.string().optional().default(""),
});

export async function POST(req: Request, { params }: { params: { id: string } }) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  const body = Body.parse(await req.json());

  const { data: booking } = await supabase
    .from("bookings")
    .select("id, customer_id, assigned_washer_id, service_cents")
    .eq("id", params.id)
    .maybeSingle();
  if (!booking || booking.customer_id !== user.id) {
    return NextResponse.json({ error: "Booking not found" }, { status: 404 });
  }

  const tipCents = Math.round((booking.service_cents * body.tip_pct) / 100);

  await supabase
    .from("bookings")
    .update({ tip_cents: tipCents })
    .eq("id", params.id);

  if (booking.assigned_washer_id) {
    await supabase.from("reviews").upsert({
      booking_id: booking.id,
      rating_int: body.stars,
      comment: body.comment,
      reviewer_id: user.id,
      reviewee_id: booking.assigned_washer_id,
    });
  }

  await supabase.from("booking_events").insert({
    booking_id: booking.id,
    type: "rated",
    actor_id: user.id,
    payload: { stars: body.stars, tip_cents: tipCents },
  });

  return NextResponse.json({ ok: true });
}
