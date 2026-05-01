import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { z } from "zod";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const Body = z.object({
  full_name: z.string().min(1).max(120).optional(),
  display_name: z.string().min(1).max(120).optional().nullable(),
  phone: z.string().max(40).optional().nullable(),
  // Path inside the public `avatars` bucket — `<user_id>/<file>`. We store
  // the bare path; the public URL is composed at read time so a bucket
  // rename or CDN swap doesn't require a backfill.
  avatar_url: z.string().max(400).optional().nullable(),
});

export async function PATCH(req: Request) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  const body = Body.parse(await req.json());
  const updates: Record<string, any> = {};
  if (body.full_name != null) updates.full_name = body.full_name;
  if (body.display_name !== undefined) updates.display_name = body.display_name || null;
  if (body.phone !== undefined) updates.phone = body.phone || null;
  if (body.avatar_url !== undefined) updates.avatar_url = body.avatar_url || null;
  if (Object.keys(updates).length === 0) {
    return NextResponse.json({ error: "Nothing to update" }, { status: 400 });
  }

  const { error } = await supabase.from("users").update(updates).eq("id", user.id);
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ ok: true });
}
