import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Lists the customer's available achievement freebies. The pay page filters
// the response client-side by booking category + tier so the right credit
// surfaces as a "Use your free Showroom" button at checkout.
export async function GET() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  const { data: credits } = await supabase
    .from("customer_credits")
    .select("id, kind, service_category, service_tier_name, source_achievement_id, expires_at, created_at")
    .eq("user_id", user.id)
    .eq("status", "available")
    .order("created_at", { ascending: false });

  return NextResponse.json({ credits: credits ?? [] });
}
