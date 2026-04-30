import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { z } from "zod";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const Body = z.object({
  description: z.string().min(10).max(2000),
  amount_cents: z.number().int().positive().max(250000).optional(),
  photos: z.array(z.string()).default([]),
});

export async function POST(req: Request, { params }: { params: { id: string } }) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  const body = Body.parse(await req.json());

  const { data: booking } = await supabase
    .from("bookings")
    .select("id, customer_id, completed_at, status")
    .eq("id", params.id)
    .maybeSingle();
  if (!booking || booking.customer_id !== user.id) {
    return NextResponse.json({ error: "Booking not found" }, { status: 404 });
  }

  // Must be within 24h of completion
  if (!booking.completed_at) {
    return NextResponse.json({ error: "Booking not yet completed" }, { status: 400 });
  }
  const hoursSince = (Date.now() - new Date(booking.completed_at).getTime()) / 3_600_000;
  if (hoursSince > 24) {
    return NextResponse.json({ error: "Damage claim window (24h) has passed" }, { status: 400 });
  }

  const { data: claim, error } = await supabase
    .from("damage_claims")
    .insert({
      booking_id: booking.id,
      customer_id: user.id,
      description: body.description,
      amount_cents: body.amount_cents ?? null,
      photos: body.photos,
      status: "open",
    })
    .select("id")
    .single();
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });

  await supabase.from("bookings").update({ status: "disputed" }).eq("id", booking.id);
  await supabase.from("booking_events").insert({
    booking_id: booking.id,
    type: "damage_claim_filed",
    actor_id: user.id,
    payload: { claim_id: claim.id, amount_cents: body.amount_cents },
  });

  return NextResponse.json({ ok: true, claim_id: claim.id });
}
