import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * GET /api/bookings/[id]/status
 * Tiny polling endpoint — returns the live status fields the washer's
 * check-in page and the customer's tracking page need to flip UI
 * states without re-fetching the whole booking. RLS already scopes
 * who can read what.
 */
export async function GET(_req: Request, { params }: { params: { id: string } }) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  const { data, error } = await supabase
    .from("bookings")
    .select(
      "id, status, started_at, completed_at, customer_approved_at, funds_released_at"
    )
    .eq("id", params.id)
    .maybeSingle();
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  if (!data) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(data);
}
