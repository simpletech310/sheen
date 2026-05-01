import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { releaseFundsForBooking } from "@/lib/payout/release";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: Request) {
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

  // Find all completed bookings
  const { data: bookings, error: fetchError } = await supabase
    .from("bookings")
    .select("id, status, customer_approved_at")
    .eq("status", "completed");

  if (fetchError) return NextResponse.json({ error: fetchError.message }, { status: 500 });
  if (!bookings || bookings.length === 0) {
    return NextResponse.json({ ok: true, message: "No completed bookings to fund." });
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
            customer_approval_note: "Bulk admin funding.",
          })
          .eq("id", booking.id);
      }

      const result = await releaseFundsForBooking(booking.id, user.id);
      results.push({ id: booking.id, ok: result.ok, reason: result.reason });
    } catch (err: any) {
      results.push({ id: booking.id, ok: false, error: err.message });
    }
  }

  return NextResponse.json({ ok: true, results });
}
