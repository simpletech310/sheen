import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { z } from "zod";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const Body = z.object({
  full_name: z.string().min(1).max(120).optional(),
  bio: z.string().max(280).optional().nullable(),
  service_radius_miles: z.number().int().min(1).max(50).optional(),
  base_lat: z.number().min(-90).max(90).optional().nullable(),
  base_lng: z.number().min(-180).max(180).optional().nullable(),
  has_own_water: z.boolean().optional(),
  has_own_power: z.boolean().optional(),
  has_pressure_washer: z.boolean().optional(),
  can_detail_interior: z.boolean().optional(),
  can_do_paint_correction: z.boolean().optional(),
});

export async function PATCH(req: Request) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  const body = Body.parse(await req.json());

  // Make sure they're a washer.
  const { data: wp } = await supabase
    .from("washer_profiles")
    .select("user_id")
    .eq("user_id", user.id)
    .maybeSingle();
  if (!wp) return NextResponse.json({ error: "Not a washer" }, { status: 403 });

  // 1. Update the public.users row (just full_name).
  if (body.full_name !== undefined) {
    const { error: uErr } = await supabase
      .from("users")
      .update({ full_name: body.full_name })
      .eq("id", user.id);
    if (uErr) return NextResponse.json({ error: uErr.message }, { status: 400 });
  }

  // 2. Update washer_profiles with the rest.
  const profileUpdate: Record<string, any> = {};
  for (const k of [
    "bio",
    "service_radius_miles",
    "base_lat",
    "base_lng",
    "has_own_water",
    "has_own_power",
    "has_pressure_washer",
    "can_detail_interior",
    "can_do_paint_correction",
  ] as const) {
    if (body[k] !== undefined) profileUpdate[k] = body[k];
  }
  if (Object.keys(profileUpdate).length > 0) {
    const { error: pErr } = await supabase
      .from("washer_profiles")
      .update(profileUpdate)
      .eq("user_id", user.id);
    if (pErr) return NextResponse.json({ error: pErr.message }, { status: 400 });
  }

  return NextResponse.json({ ok: true });
}
