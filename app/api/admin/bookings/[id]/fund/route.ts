import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { releaseFundsForBooking } from "@/lib/payout/release";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * POST /api/admin/bookings/[id]/fund
 * Manually releases funds for a booking without customer approval.
 * Admin only.
 */
export async function POST(req: Request, { params }: { params: { id: string } }) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  // Admin check
  const { data: profile } = await supabase
    .from("users")
    .select("role")
    .eq("id", user.id)
    .maybeSingle();

  if (!profile || profile.role !== "admin") {
    return NextResponse.json({ error: "Not authorized" }, { status: 403 });
  }

  // To release funds without customer approval, the booking needs customer_approved_at to be set.
  // We will force-stamp it.
  const { data: booking } = await supabase
    .from("bookings")
    .select("id, status, customer_approved_at")
    .eq("id", params.id)
    .maybeSingle();

  if (!booking) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (booking.status !== "completed" && booking.status !== "funded") {
    return NextResponse.json({ error: "Job must be completed to fund" }, { status: 400 });
  }

  // Force approve
  if (!booking.customer_approved_at) {
    await supabase
      .from("bookings")
      .update({
        customer_approved_at: new Date().toISOString(),
        customer_approval_note: "Admin forced approval to fund washer.",
      })
      .eq("id", booking.id);
  }

  const result = await releaseFundsForBooking(booking.id, user.id);

  if (!result.ok && result.reason !== "already_released") {
    return NextResponse.json(
      { error: `Could not release funds: ${result.reason}` },
      { status: 500 }
    );
  }

  return NextResponse.json({ ok: true });
}
