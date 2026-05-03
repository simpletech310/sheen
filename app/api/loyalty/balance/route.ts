import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Returns the customer's running points balance + how many points
// they've redeemed in the rolling last 24h window. The pay-page
// slider uses `used_today` to clamp the max so the customer can't
// drag past the $400/day platform cap.
//
// loyalty_ledger stores positives (earned) and negatives (redeemed).
// "Used today" sums the absolute value of negatives in the last 24h.
export async function GET() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

  const [{ data: all }, { data: recent }] = await Promise.all([
    supabase
      .from("loyalty_ledger")
      .select("points")
      .eq("user_id", user.id),
    supabase
      .from("loyalty_ledger")
      .select("points, created_at")
      .eq("user_id", user.id)
      .eq("reason", "redeem")
      .gte("created_at", since),
  ]);

  const points = (all ?? []).reduce((acc, r: any) => acc + (r.points ?? 0), 0);
  const usedToday = (recent ?? []).reduce(
    (acc, r: any) => acc + Math.max(0, -(r.points ?? 0)),
    0
  );

  return NextResponse.json({ points, used_today: usedToday });
}
