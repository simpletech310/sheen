import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { z } from "zod";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const Body = z.object({
  handle: z
    .string()
    .min(3, "Handle must be at least 3 characters")
    .max(20, "Handle can't exceed 20 characters")
    .regex(/^[A-Za-z0-9]+$/, "Letters and numbers only"),
});

/** PATCH /api/washers/handle — washer changes their @handle. */
export async function PATCH(req: Request) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  let parsed;
  try {
    parsed = Body.parse(await req.json());
  } catch (e: any) {
    return NextResponse.json(
      { error: e.errors?.[0]?.message ?? "Invalid handle" },
      { status: 400 }
    );
  }
  const handle = parsed.handle.toUpperCase();

  // Confirm uniqueness ourselves so we can return a clean error message.
  const { data: existing } = await supabase
    .from("washer_profiles")
    .select("user_id")
    .eq("wash_handle", handle)
    .maybeSingle();
  if (existing && existing.user_id !== user.id) {
    return NextResponse.json({ error: "That handle is taken" }, { status: 409 });
  }

  const { error } = await supabase
    .from("washer_profiles")
    .update({ wash_handle: handle })
    .eq("user_id", user.id);
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });

  return NextResponse.json({ ok: true, handle });
}
