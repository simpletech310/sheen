import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";
import { releaseFundsForBooking } from "@/lib/payout/release";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// EMERGENCY TRIGGER ROUTE
// This will be deleted immediately after use.
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const secret = searchParams.get("secret");

  if (secret !== "emergency_payout_trigger_2026") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = createServiceClient();

  // Find all fundable bookings
  const { data: bookings, error: fetchError } = await supabase
    .from("bookings")
    .select("id, status, customer_approved_at")
    .not("status", "in", "(funded,cancelled,disputed)");

  if (fetchError) return NextResponse.json({ error: fetchError.message }, { status: 500 });
  if (!bookings || bookings.length === 0) {
    return NextResponse.json({ ok: true, message: "No bookings to fund." });
  }

  const results = [];
  for (const booking of bookings) {
    try {
      // Force approve if not already
      if (!booking.customer_approved_at) {
        await supabase
          .from("bookings")
          .update({
            customer_approved_at: new Date().toISOString(),
            customer_approval_note: "Emergency system-triggered funding.",
          })
          .eq("id", booking.id);
      }

      // We use a dummy system user ID for the actor
      const result = await releaseFundsForBooking(booking.id, "00000000-0000-0000-0000-000000000000");
      results.push({ id: booking.id, ok: result.ok, reason: result.reason });
    } catch (err: any) {
      results.push({ id: booking.id, ok: false, error: err.message });
    }
  }

  return NextResponse.json({ ok: true, results });
}
