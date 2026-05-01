import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * POST /api/bookings/[id]/pause
 *
 * Toggles between paused and running for the job timer.
 *
 * Pause:  sets paused_at = now()
 * Resume: adds (now - paused_at) to total_paused_ms, clears paused_at
 *
 * Returns: { paused: bool, paused_at, total_paused_ms }
 */
export async function POST(
  _req: Request,
  { params }: { params: { id: string } }
) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  const { data: booking } = await supabase
    .from("bookings")
    .select("id, assigned_washer_id, assigned_partner_id, status, paused_at, total_paused_ms, started_at")
    .eq("id", params.id)
    .maybeSingle();

  if (!booking) return NextResponse.json({ error: "Not found" }, { status: 404 });

  // Only the assigned worker can pause/resume
  if (
    booking.assigned_washer_id !== user.id &&
    booking.assigned_partner_id !== user.id
  ) {
    return NextResponse.json({ error: "Not allowed" }, { status: 403 });
  }

  // Only in-progress jobs can be paused/resumed
  if (booking.status !== "in_progress") {
    return NextResponse.json({ error: "Job is not in progress" }, { status: 409 });
  }

  const now = new Date();
  let update: Record<string, unknown>;

  if (!booking.paused_at) {
    // Currently running → pause it
    update = { paused_at: now.toISOString() };
  } else {
    // Currently paused → resume it
    const pausedAt = new Date(booking.paused_at);
    const additionalPausedMs = now.getTime() - pausedAt.getTime();
    const newTotalPausedMs = ((booking.total_paused_ms as number) ?? 0) + additionalPausedMs;
    update = {
      paused_at: null,
      total_paused_ms: newTotalPausedMs,
    };
  }

  const { data: updated, error } = await supabase
    .from("bookings")
    .update(update)
    .eq("id", params.id)
    .select("paused_at, total_paused_ms")
    .maybeSingle();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({
    paused: !!updated?.paused_at,
    paused_at: updated?.paused_at ?? null,
    total_paused_ms: updated?.total_paused_ms ?? 0,
  });
}
