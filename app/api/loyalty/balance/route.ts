import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  const { data } = await supabase
    .from("loyalty_ledger")
    .select("points")
    .eq("user_id", user.id);
  const points = (data ?? []).reduce((acc, r: any) => acc + (r.points ?? 0), 0);
  return NextResponse.json({ points });
}
