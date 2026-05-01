import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  const body = await req.json().catch(() => ({}));
  const updates: Record<string, any> = {};
  for (const k of ["year", "make", "model", "color", "plate", "notes", "photo_paths", "is_default", "vehicle_type", "vehicle_class"]) {
    if (k in body) updates[k] = body[k];
  }
  if (updates.year != null) updates.year = Number(updates.year);
  if ("vehicle_type" in updates && updates.vehicle_type !== "big_rig") {
    updates.vehicle_type = "auto";
  }
  if ("vehicle_class" in updates) {
    const ALLOWED = new Set(["sedan", "suv", "truck", "van", "coupe", "sports", "wagon", "hatchback", "ev", "classic", "other"]);
    updates.vehicle_class = typeof updates.vehicle_class === "string" && ALLOWED.has(updates.vehicle_class) ? updates.vehicle_class : null;
  }

  if (updates.is_default) {
    await supabase
      .from("vehicles")
      .update({ is_default: false })
      .eq("user_id", user.id)
      .eq("is_default", true);
  }

  const { data, error } = await supabase
    .from("vehicles")
    .update(updates)
    .eq("id", params.id)
    .eq("user_id", user.id)
    .select("*")
    .maybeSingle();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  if (!data) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json({ vehicle: data });
}

export async function DELETE(_req: Request, { params }: { params: { id: string } }) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  const { error } = await supabase
    .from("vehicles")
    .delete()
    .eq("id", params.id)
    .eq("user_id", user.id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
