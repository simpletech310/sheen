import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * GET /api/washers/lookup?handle=ABCDE
 *
 * Public lookup so the booking flow can confirm a pro is real before the
 * customer commits. Returns minimal profile data — name, rating, jobs,
 * verified — strictly for the request preview.
 */
export async function GET(req: Request) {
  const url = new URL(req.url);
  const raw = (url.searchParams.get("handle") ?? "").trim().replace(/^@/, "").toUpperCase();
  if (!/^[A-Z0-9]{3,20}$/.test(raw)) {
    return NextResponse.json({ found: false, reason: "format" });
  }

  // Service client so the lookup works even if the caller isn't authed.
  const supa = createServiceClient();
  const { data: wp } = await supa
    .from("washer_profiles")
    .select("user_id, status, jobs_completed, rating_avg, background_check_verified")
    .eq("wash_handle", raw)
    .maybeSingle();

  if (!wp || wp.status !== "active") {
    return NextResponse.json({ found: false, reason: "not_active" });
  }

  const { data: u } = await supa
    .from("users")
    .select("full_name")
    .eq("id", wp.user_id)
    .maybeSingle();

  return NextResponse.json({
    found: true,
    handle: raw,
    name: u?.full_name ?? "Sheen Pro",
    rating: wp.rating_avg ? Number(wp.rating_avg) : null,
    jobs: wp.jobs_completed ?? 0,
    verified: !!wp.background_check_verified,
  });
}
