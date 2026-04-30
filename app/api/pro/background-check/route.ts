import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * POST /api/pro/background-check
 * Idempotently flips background_check_status from 'not_submitted' → 'pending'.
 * Real Checkr integration is v2; for now this puts a row in audit_log so
 * admin can see the queue and approve manually from /admin/washers.
 */
export async function POST() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  const { data: wp } = await supabase
    .from("washer_profiles")
    .select("background_check_status")
    .eq("user_id", user.id)
    .maybeSingle();
  if (!wp) return NextResponse.json({ error: "Not a washer" }, { status: 403 });

  // No-op if already pending or verified — don't create duplicate audit rows.
  if (wp.background_check_status === "pending" || wp.background_check_status === "verified") {
    return NextResponse.json({
      ok: true,
      status: wp.background_check_status,
      noop: true,
    });
  }

  const { error } = await supabase
    .from("washer_profiles")
    .update({ background_check_status: "pending" })
    .eq("user_id", user.id);
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });

  await supabase.from("audit_log").insert({
    actor_id: user.id,
    action: "washer.bgcheck_requested",
    target_type: "washer_profile",
    target_id: user.id,
  });

  return NextResponse.json({ ok: true, status: "pending" });
}
