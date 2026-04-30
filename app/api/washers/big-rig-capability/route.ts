import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { z } from "zod";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const Body = z.object({
  can_wash_big_rig: z.boolean(),
});

export async function PATCH(req: Request) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  const body = Body.parse(await req.json());

  // Confirm caller has a washer profile.
  const { data: wp } = await supabase
    .from("washer_profiles")
    .select("user_id")
    .eq("user_id", user.id)
    .maybeSingle();
  if (!wp) {
    return NextResponse.json({ error: "Not a washer" }, { status: 403 });
  }

  const { error } = await supabase
    .from("washer_profiles")
    .update({ can_wash_big_rig: body.can_wash_big_rig })
    .eq("user_id", user.id);
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });

  return NextResponse.json({ ok: true, can_wash_big_rig: body.can_wash_big_rig });
}
