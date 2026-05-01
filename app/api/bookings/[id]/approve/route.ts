import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { releaseFundsForBooking } from "@/lib/payout/release";
import { z } from "zod";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const Body = z
  .object({
    note: z.string().max(500).optional(),
  })
  .partial();

/**
 * POST /api/bookings/[id]/approve
 * Customer approves the finished work — flips customer_approved_at,
 * then releases funds to the pro via lib/payout/release.ts.
 *
 * Idempotent: re-calling after approval is a no-op (funds_released_at
 * stays the same; lib/release exits early).
 */
export async function POST(req: Request, { params }: { params: { id: string } }) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  const body = (await req.json().catch(() => ({}))) as Record<string, unknown>;
  const parsed = Body.parse(body);

  const { data: booking } = await supabase
    .from("bookings")
    .select("id, customer_id, status, customer_approved_at")
    .eq("id", params.id)
    .maybeSingle();

  if (!booking) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (booking.customer_id !== user.id) {
    return NextResponse.json({ error: "Not your booking" }, { status: 403 });
  }
  if (booking.status !== "completed" && booking.status !== "funded") {
    return NextResponse.json(
      { error: "Pro hasn't marked complete yet" },
      { status: 409 }
    );
  }

  // Stamp approval if not already.
  if (!booking.customer_approved_at) {
    const { error } = await supabase
      .from("bookings")
      .update({
        customer_approved_at: new Date().toISOString(),
        customer_approval_note: parsed.note ?? null,
      })
      .eq("id", booking.id);
    if (error) return NextResponse.json({ error: error.message }, { status: 400 });

    await supabase.from("booking_events").insert({
      booking_id: booking.id,
      type: "customer_approved",
      actor_id: user.id,
      payload: { has_note: !!parsed.note },
    });
  }

  // Release funds — service-role, idempotent.
  const result = await releaseFundsForBooking(booking.id, user.id);
  if (!result.ok && result.reason !== "already_released") {
    // Approval still stands — admin can manually release later.
    return NextResponse.json({
      ok: true,
      approved: true,
      released: false,
      reason: result.reason,
    });
  }

  return NextResponse.json({ ok: true, approved: true, released: true });
}
