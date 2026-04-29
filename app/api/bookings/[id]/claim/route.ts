import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function POST(_req: Request, { params }: { params: { id: string } }) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  // Atomic-ish claim: only update if still unclaimed
  const { data, error } = await supabase
    .from("bookings")
    .update({ assigned_washer_id: user.id, status: "matched" })
    .eq("id", params.id)
    .eq("status", "pending")
    .is("assigned_washer_id", null)
    .select("id")
    .maybeSingle();

  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  if (!data) return NextResponse.json({ error: "Already claimed" }, { status: 409 });

  await supabase.from("booking_events").insert({
    booking_id: params.id,
    type: "matched",
    actor_id: user.id,
  });

  return NextResponse.json({ ok: true });
}
